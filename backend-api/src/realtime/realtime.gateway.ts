import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Device } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { DeviceAuthService } from '../device-auth/device-auth.service';

// A socket that hasn't authenticated within this window is dropped.
const UNAUTHENTICATED_TIMEOUT_MS = 15_000;
// A given legacy player is told to reload at most once per this window, so a
// stale/cached player bundle can never end up in a tight reload loop.
const LEGACY_RELOAD_COOLDOWN_MS = 10 * 60 * 1000;
const LEGACY_RELOAD_MAX_TRACKED = 5000;

/**
 * Real-time channel for player devices.
 *
 * A player authenticates in the Socket.io handshake with its deviceId +
 * deviceKey (`auth` option). Only then is it joined to the room
 * `device:<deviceId>`, through which the backend pushes:
 *  - playlist_update: the device's assigned playlist content changed
 *  - force_reload: ask the player to hard-reload the page
 */
@WebSocketGateway({
  // Players connect with the websocket transport only, which is not subject
  // to CORS; this restricts the HTTP long-polling fallback to known origins.
  cors: { origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private socketToDevice = new Map<string, string>();
  private legacyReloadSentAt = new Map<string, number>();

  constructor(private deviceAuth: DeviceAuthService) {}

  async handleConnection(client: Socket) {
    const auth = (client.handshake.auth ?? {}) as { deviceId?: unknown; deviceKey?: unknown };

    if (auth.deviceId === undefined && auth.deviceKey === undefined) {
      // No credentials in the handshake: either a player still running the
      // old bundle (handled in `identify` below) or a stranger. Either way it
      // joins no room, and is dropped if it stays unauthenticated.
      setTimeout(() => {
        if (client.connected && !this.socketToDevice.has(client.id)) client.disconnect(true);
      }, UNAUTHENTICATED_TIMEOUT_MS);
      return;
    }

    let device: Device | null = null;
    try {
      device = await this.deviceAuth.authenticate(auth.deviceId, auth.deviceKey);
    } catch (err) {
      this.logger.warn(`Device auth lookup failed: ${(err as Error).message}`);
    }

    if (!device) {
      this.logger.debug(`Rejected socket ${client.id}: invalid device credentials`);
      client.disconnect(true);
      return;
    }
    if (!client.connected) return;

    client.join(this.deviceRoom(device.id));
    this.socketToDevice.set(client.id, device.id);
    this.logger.debug(`Device ${device.id} authenticated on socket ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const deviceId = this.socketToDevice.get(client.id);
    if (deviceId) {
      this.logger.debug(`Device ${deviceId} disconnected`);
      this.socketToDevice.delete(client.id);
    }
  }

  /**
   * Legacy message. It used to join the room for whatever deviceId the client
   * claimed, with no proof of identity. It no longer grants anything:
   *  - already-authenticated sockets get a no-op ack;
   *  - anything else is assumed to be a TV still running the old player
   *    bundle, so that one socket (no room) is told to reload, which makes it
   *    pick up the new bundle that authenticates in the handshake.
   */
  @SubscribeMessage('identify')
  handleIdentify(client: Socket, payload: { deviceId?: unknown } | undefined) {
    if (this.socketToDevice.has(client.id)) return { status: 'ok' };

    const claimedId =
      typeof payload?.deviceId === 'string' ? payload.deviceId.slice(0, 100) : client.id;
    const now = Date.now();
    const lastSent = this.legacyReloadSentAt.get(claimedId) ?? 0;

    if (now - lastSent > LEGACY_RELOAD_COOLDOWN_MS) {
      if (this.legacyReloadSentAt.size >= LEGACY_RELOAD_MAX_TRACKED) this.legacyReloadSentAt.clear();
      this.legacyReloadSentAt.set(claimedId, now);
      client.emit('force_reload', { deviceId: null });
    }

    client.disconnect(true);
    return { status: 'unauthorized' };
  }

  private deviceRoom(deviceId: string) {
    return `device:${deviceId}`;
  }

  notifyPlaylistUpdate(deviceId: string, playlistId: string | null) {
    this.server.to(this.deviceRoom(deviceId)).emit('playlist_update', { deviceId, playlistId });
  }

  notifyPlaylistUpdateForPlaylist(deviceIds: string[], playlistId: string) {
    for (const deviceId of deviceIds) {
      this.notifyPlaylistUpdate(deviceId, playlistId);
    }
  }

  forceReload(deviceId: string) {
    this.server.to(this.deviceRoom(deviceId)).emit('force_reload', { deviceId });
  }

  /** Reloads every authenticated device (unauthenticated sockets are in no room). */
  forceReloadAll() {
    const rooms = new Set(Array.from(this.socketToDevice.values(), (id) => this.deviceRoom(id)));
    for (const room of rooms) this.server.to(room).emit('force_reload', { deviceId: null });
  }
}

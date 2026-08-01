import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Real-time channel for player devices.
 * Each connected player joins a room named `device:<deviceId>` after
 * identifying itself. The backend can then push targeted events:
 *  - playlist_update: the device's assigned playlist content changed
 *  - force_reload: ask the player to hard-reload the page
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private socketToDevice = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const deviceId = this.socketToDevice.get(client.id);
    if (deviceId) {
      this.logger.debug(`Device ${deviceId} disconnected`);
      this.socketToDevice.delete(client.id);
    }
  }

  @SubscribeMessage('identify')
  handleIdentify(client: Socket, payload: { deviceId: string }) {
    const room = this.deviceRoom(payload.deviceId);
    client.join(room);
    this.socketToDevice.set(client.id, payload.deviceId);
    this.logger.debug(`Device ${payload.deviceId} joined ${room}`);
    return { status: 'ok' };
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

  forceReloadAll() {
    this.server.emit('force_reload', { deviceId: null });
  }
}

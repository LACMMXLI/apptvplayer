import { io, Socket } from 'socket.io-client';
import type { DeviceCredentials } from './types';

const WS_URL =
  window.__RUNTIME_CONFIG__?.WS_URL || import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function connectDeviceSocket(
  creds: DeviceCredentials,
  handlers: {
    onPlaylistUpdate?: () => void;
    onForceReload?: () => void;
  },
): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(`${WS_URL}/realtime`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    // The backend only joins this socket to the device's room after
    // verifying these credentials in the handshake.
    auth: { deviceId: creds.deviceId, deviceKey: creds.deviceKey },
  });

  socket.on('playlist_update', () => {
    handlers.onPlaylistUpdate?.();
  });

  socket.on('force_reload', () => {
    handlers.onForceReload?.();
  });

  return socket;
}

export function disconnectDeviceSocket() {
  socket?.disconnect();
  socket = null;
}

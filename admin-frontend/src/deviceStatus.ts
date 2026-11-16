import type { Device } from './types';

// Players send a heartbeat every 30s. The backend only ever flips a device
// to ONLINE, so "is it really on right now" is derived here from how recent
// the last heartbeat is: three missed beats means the screen is off.
const ONLINE_WINDOW_MS = 95_000;

export type LiveStatus = 'PENDING' | 'ONLINE' | 'OFFLINE';

export const STATUS_LABEL: Record<LiveStatus, string> = {
  PENDING: 'Pendiente',
  ONLINE: 'En línea',
  OFFLINE: 'Sin señal',
};

export function liveStatus(device: Device, now = Date.now()): LiveStatus {
  if (device.status === 'PENDING') return 'PENDING';
  if (!device.lastSeenAt) return 'OFFLINE';
  return now - new Date(device.lastSeenAt).getTime() <= ONLINE_WINDOW_MS ? 'ONLINE' : 'OFFLINE';
}

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer"… for a device's last heartbeat. */
export function lastSeenLabel(device: Device, now = Date.now()): string {
  if (!device.lastSeenAt) return 'Nunca conectado';
  const seconds = Math.round((new Date(device.lastSeenAt).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'Visto hace un momento';
  if (abs < 3600) return `Visto ${RELATIVE.format(Math.round(seconds / 60), 'minute')}`;
  if (abs < 86400) return `Visto ${RELATIVE.format(Math.round(seconds / 3600), 'hour')}`;
  return `Visto ${RELATIVE.format(Math.round(seconds / 86400), 'day')}`;
}

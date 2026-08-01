import type { DeviceCredentials, Playlist } from './types';

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { API_URL?: string; WS_URL?: string };
  }
}

const API_URL =
  window.__RUNTIME_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const CREDENTIALS_KEY = 'signage.device.credentials';

export function getStoredCredentials(): DeviceCredentials | null {
  const raw = localStorage.getItem(CREDENTIALS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceCredentials;
  } catch {
    return null;
  }
}

export function storeCredentials(creds: DeviceCredentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}

async function deviceRequest(path: string, deviceKey: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      'x-device-key': deviceKey,
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${path}`);
  }
  return res.json();
}

export async function startPairing(): Promise<DeviceCredentials> {
  const res = await fetch(`${API_URL}/devices/pairing/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not start pairing');
  const data = await res.json();
  return { deviceId: data.deviceId, deviceKey: data.deviceKey, pairingCode: data.pairingCode };
}

export interface PairingStatus {
  status: 'PENDING' | 'ONLINE' | 'OFFLINE';
  name: string;
  playlistId: string | null;
}

export async function getPairingStatus(creds: DeviceCredentials): Promise<PairingStatus> {
  return deviceRequest(`/devices/${creds.deviceId}/status`, creds.deviceKey);
}

export async function sendHeartbeat(creds: DeviceCredentials) {
  return deviceRequest(`/devices/${creds.deviceId}/heartbeat`, creds.deviceKey, {
    method: 'POST',
  });
}

export async function fetchPlaylist(creds: DeviceCredentials): Promise<Playlist | null> {
  return deviceRequest(`/devices/${creds.deviceId}/playlist`, creds.deviceKey);
}

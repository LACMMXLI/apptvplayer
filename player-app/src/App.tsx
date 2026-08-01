import { useEffect, useRef, useState } from 'react';
import type { DeviceCredentials, Playlist } from './types';
import {
  fetchPlaylist,
  getPairingStatus,
  getStoredCredentials,
  sendHeartbeat,
  startPairing,
  storeCredentials,
} from './api';
import { connectDeviceSocket, disconnectDeviceSocket } from './socket';
import { getCachedPlaylist, preloadPlaylistMedia, setCachedPlaylist } from './mediaCache';
import PairingScreen from './components/PairingScreen';
import PlayerScreen from './components/PlayerScreen';
import './styles.css';

type Phase = 'checking' | 'pairing' | 'playing';

const POLL_INTERVAL_MS = 4000;
const HEARTBEAT_INTERVAL_MS = 30000;

export default function App() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [credentials, setCredentials] = useState<DeviceCredentials | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [offline, setOffline] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Best-effort fullscreen kiosk mode. Most kiosk deployments launch the
  // browser itself with --kiosk, this is a fallback for regular browsers.
  useEffect(() => {
    const requestFs = () => {
      document.documentElement.requestFullscreen?.().catch(() => {});
      window.removeEventListener('click', requestFs);
      window.removeEventListener('keydown', requestFs);
    };
    window.addEventListener('click', requestFs);
    window.addEventListener('keydown', requestFs);
    return () => {
      window.removeEventListener('click', requestFs);
      window.removeEventListener('keydown', requestFs);
    };
  }, []);

  async function loadPlaylist(creds: DeviceCredentials) {
    try {
      const data = await fetchPlaylist(creds);
      setOffline(false);
      if (data) {
        setPlaylist(data);
        setCachedPlaylist(data);
        preloadPlaylistMedia(data);
      } else {
        setPlaylist(null);
      }
    } catch {
      setOffline(true);
      const cached = getCachedPlaylist();
      if (cached) setPlaylist(cached);
    }
  }

  async function bootstrap() {
    let creds = getStoredCredentials();

    if (!creds) {
      creds = await startPairing();
      storeCredentials(creds);
    }
    setCredentials(creds);

    try {
      const status = await getPairingStatus(creds);
      if (status.status === 'PENDING') {
        setPhase('pairing');
        startPollingStatus(creds);
      } else {
        setPhase('playing');
        await loadPlaylist(creds);
        connectRealtime(creds);
        startHeartbeat(creds);
      }
    } catch {
      // Backend unreachable at boot — fall back to any cached playlist so
      // the screen keeps showing content instead of a blank page.
      const cached = getCachedPlaylist();
      if (cached) {
        setPlaylist(cached);
        setPhase('playing');
      } else {
        setPhase('pairing');
      }
      startPollingStatus(creds);
    }
  }

  function startPollingStatus(creds: DeviceCredentials) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getPairingStatus(creds);
        if (status.status !== 'PENDING') {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase('playing');
          await loadPlaylist(creds);
          connectRealtime(creds);
          startHeartbeat(creds);
        }
      } catch {
        setOffline(true);
      }
    }, POLL_INTERVAL_MS);
  }

  function connectRealtime(creds: DeviceCredentials) {
    connectDeviceSocket(creds.deviceId, {
      onPlaylistUpdate: () => loadPlaylist(creds),
      onForceReload: () => window.location.reload(),
    });
  }

  function startHeartbeat(creds: DeviceCredentials) {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(creds).catch(() => setOffline(true));
    }, HEARTBEAT_INTERVAL_MS);
  }

  useEffect(() => {
    bootstrap();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      disconnectDeviceSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-root">
      {offline && <div className="offline-badge">Sin conexión — mostrando contenido en caché</div>}
      {phase === 'checking' && <div className="checking-screen">Iniciando…</div>}
      {phase === 'pairing' && credentials && <PairingScreen pairingCode={credentials.pairingCode} />}
      {phase === 'playing' && playlist && <PlayerScreen playlist={playlist} />}
      {phase === 'playing' && !playlist && (
        <div className="player-empty">
          <p>Esta pantalla no tiene contenido asignado todavía.</p>
        </div>
      )}
    </div>
  );
}

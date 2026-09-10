import { FormEvent, useEffect, useState } from 'react';
import type { Branch, Device, Playlist } from '../types';
import { branchesApi, devicesApi, playlistsApi } from '../api/endpoints';

const STATUS_LABEL: Record<Device['status'], string> = {
  PENDING: 'Pendiente',
  ONLINE: 'En línea',
  OFFLINE: 'Desconectado',
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    Promise.all([devicesApi.list(), branchesApi.list(), playlistsApi.list()])
      .then(([d, b, p]) => {
        setDevices(d);
        setBranches(b);
        setPlaylists(p);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onLink(e: FormEvent) {
    e.preventDefault();
    setLinkError(null);
    try {
      await devicesApi.link(pairingCode.trim().toUpperCase(), { name: deviceName || 'Nueva pantalla' });
      setPairingCode('');
      setDeviceName('');
      refresh();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'No se pudo vincular el dispositivo');
    }
  }

  async function onAssignPlaylist(deviceId: string, playlistId: string) {
    await devicesApi.assignPlaylist(deviceId, playlistId || null);
    refresh();
  }

  async function onAssignBranch(deviceId: string, branchId: string) {
    await devicesApi.update(deviceId, { branchId: branchId || undefined });
    refresh();
  }

  async function onRename(deviceId: string, name: string) {
    await devicesApi.update(deviceId, { name });
    refresh();
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este dispositivo?')) return;
    await devicesApi.remove(id);
    refresh();
  }

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            Dispositivos
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {devices.length} pantallas registradas · {onlineCount} en línea
          </p>
        </div>
      </div>

      <form className="inline-form" onSubmit={onLink}>
        <input
          placeholder="Código de vinculación (ej: DEMO01)"
          value={pairingCode}
          onChange={(e) => setPairingCode(e.target.value)}
          maxLength={6}
        />
        <input
          placeholder="Nombre de la pantalla"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={!pairingCode}>
          + Vincular pantalla
        </button>
      </form>
      {linkError && <div className="form-error">{linkError}</div>}

      {loading ? (
        <p className="page-loading">Cargando…</p>
      ) : devices.length === 0 ? (
        <div className="empty-state">Aún no hay pantallas vinculadas. Usa el código de vinculación para agregar una.</div>
      ) : (
        <div className="device-grid">
          {devices.map((d, i) => (
            <div
              key={d.id}
              className={`device-card${d.status === 'ONLINE' ? ' is-online' : ''}`}
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            >
              <div className="device-card-top">
                <div className="device-icon-wrap">
                  <span className="device-icon" aria-hidden="true">
                    📺
                  </span>
                  <input
                    className="device-name-input"
                    defaultValue={d.name}
                    onBlur={(e) => e.target.value !== d.name && onRename(d.id, e.target.value)}
                  />
                </div>
                <span className={`status-badge status-${d.status.toLowerCase()}`}>
                  {d.status === 'PENDING' ? `${STATUS_LABEL[d.status]} (${d.pairingCode})` : STATUS_LABEL[d.status]}
                </span>
              </div>

              <div className="device-field">
                <label>Sucursal</label>
                <select value={d.branchId ?? ''} onChange={(e) => onAssignBranch(d.id, e.target.value)}>
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="device-field">
                <label>Playlist</label>
                <select value={d.playlistId ?? ''} onChange={(e) => onAssignPlaylist(d.id, e.target.value)}>
                  <option value="">Sin playlist</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="device-meta">
                <span>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'Nunca conectado'}</span>
                <button className="btn-danger-ghost" onClick={() => onDelete(d.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

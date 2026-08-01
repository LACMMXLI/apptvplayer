import { FormEvent, useEffect, useState } from 'react';
import type { Branch, Device, Playlist } from '../types';
import { branchesApi, devicesApi, playlistsApi } from '../api/endpoints';

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

  return (
    <div>
      <h1 className="page-title">Dispositivos</h1>

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
          Vincular
        </button>
      </form>
      {linkError && <div className="form-error">{linkError}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Nombre</th>
              <th>Sucursal</th>
              <th>Playlist</th>
              <th>Última conexión</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>
                  <span className={`status-badge status-${d.status.toLowerCase()}`}>
                    {d.status === 'PENDING' ? `Pendiente (${d.pairingCode})` : d.status}
                  </span>
                </td>
                <td>
                  <input
                    className="table-input"
                    defaultValue={d.name}
                    onBlur={(e) => e.target.value !== d.name && onRename(d.id, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={d.branchId ?? ''}
                    onChange={(e) => onAssignBranch(d.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={d.playlistId ?? ''}
                    onChange={(e) => onAssignPlaylist(d.id, e.target.value)}
                  >
                    <option value="">Sin playlist</option>
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—'}</td>
                <td>
                  <button className="btn-danger-ghost" onClick={() => onDelete(d.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

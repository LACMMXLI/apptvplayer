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
  const [approveNames, setApproveNames] = useState<Record<string, string>>({});
  const [approveBranch, setApproveBranch] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<Record<string, string>>({});
  const [showManualLink, setShowManualLink] = useState(false);
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

  async function onManualLink(e: FormEvent) {
    e.preventDefault();
    setLinkError(null);
    try {
      await devicesApi.link(pairingCode.trim().toUpperCase(), { name: deviceName || 'Nueva pantalla' });
      setPairingCode('');
      setDeviceName('');
      setShowManualLink(false);
      refresh();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'No se pudo vincular el dispositivo');
    }
  }

  async function onApprove(device: Device) {
    const name = (approveNames[device.id] ?? '').trim();
    if (!name) {
      setApproveError((prev) => ({ ...prev, [device.id]: 'Ponle un nombre a la pantalla' }));
      return;
    }
    setApproveError((prev) => ({ ...prev, [device.id]: '' }));
    setApproving(device.id);
    try {
      // The device already registered itself (it appears here with its pairing
      // code) — approving it just claims it with a name, no need to retype the code.
      await devicesApi.link(device.pairingCode, {
        name,
        branchId: approveBranch[device.id] || undefined,
      });
      refresh();
    } catch (err) {
      setApproveError((prev) => ({
        ...prev,
        [device.id]: err instanceof Error ? err.message : 'No se pudo aprobar el dispositivo',
      }));
    } finally {
      setApproving(null);
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

  const pendingDevices = devices.filter((d) => d.status === 'PENDING');
  const linkedDevices = devices.filter((d) => d.status !== 'PENDING');
  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            Dispositivos
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {linkedDevices.length} pantallas vinculadas · {onlineCount} en línea
            {pendingDevices.length > 0 && ` · ${pendingDevices.length} por aprobar`}
          </p>
        </div>
        <button className="btn-ghost-small" onClick={() => setShowManualLink((v) => !v)}>
          {showManualLink ? 'Ocultar' : 'Vincular con código manualmente'}
        </button>
      </div>

      {showManualLink && (
        <>
          <form className="inline-form" onSubmit={onManualLink}>
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
        </>
      )}

      {loading ? (
        <p className="page-loading">Cargando…</p>
      ) : (
        <>
          {pendingDevices.length > 0 && (
            <>
              <h2 className="section-title">Pantallas por aprobar</h2>
              <p className="page-subtitle">
                Estas pantallas ya se conectaron y están esperando. Solo ponles un nombre y apruébalas.
              </p>
              <div className="device-grid">
                {pendingDevices.map((d, i) => (
                  <div
                    key={d.id}
                    className="device-card device-card-pending"
                    style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                  >
                    <div className="device-card-top">
                      <div className="device-icon-wrap">
                        <span className="device-icon" aria-hidden="true">
                          📺
                        </span>
                        <span className="device-pairing-code">{d.pairingCode}</span>
                      </div>
                      <span className="status-badge status-pending">Esperando aprobación</span>
                    </div>

                    <div className="device-field">
                      <label>Nombre de la pantalla</label>
                      <input
                        className="device-approve-input"
                        placeholder="Ej: Sucursal Centro - Entrada"
                        value={approveNames[d.id] ?? ''}
                        onChange={(e) => setApproveNames((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      />
                    </div>

                    <div className="device-field">
                      <label>Sucursal (opcional)</label>
                      <select
                        value={approveBranch[d.id] ?? ''}
                        onChange={(e) => setApproveBranch((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      >
                        <option value="">—</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {approveError[d.id] && <div className="form-error">{approveError[d.id]}</div>}

                    <div className="device-meta">
                      <button
                        className="btn-primary device-approve-btn"
                        onClick={() => onApprove(d)}
                        disabled={approving === d.id}
                      >
                        {approving === d.id ? 'Aprobando…' : '✓ Aprobar pantalla'}
                      </button>
                      <button className="btn-danger-ghost" onClick={() => onDelete(d.id)}>
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {linkedDevices.length === 0 && pendingDevices.length === 0 ? (
            <div className="empty-state">
              Aún no hay pantallas. Enciende el reproductor en una TV y aparecerá aquí para aprobarla.
            </div>
          ) : linkedDevices.length > 0 ? (
            <>
              {pendingDevices.length > 0 && <h2 className="section-title">Pantallas vinculadas</h2>}
              <div className="device-grid">
                {linkedDevices.map((d, i) => (
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
                      <span className={`status-badge status-${d.status.toLowerCase()}`}>{STATUS_LABEL[d.status]}</span>
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
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

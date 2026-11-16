import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Branch, Device, Playlist } from '../types';
import { branchesApi, devicesApi, playlistsApi } from '../api/endpoints';
import { STATUS_LABEL, lastSeenLabel, liveStatus } from '../deviceStatus';
import { useFeedback } from '../components/Feedback';
import Icon from '../components/Icon';

export default function DevicesPage() {
  const { confirm, attempt } = useFeedback();
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
    attempt(() =>
      Promise.all([devicesApi.list(), branchesApi.list(), playlistsApi.list()]).then(([d, b, p]) => {
        setDevices(d);
        setBranches(b);
        setPlaylists(p);
      }),
    ).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  // Arriving from a TV's QR code (/devices?code=ABC123): jump straight to
  // that screen's approval card. If it isn't in the pending list, fall back
  // to the manual form with the code filled in.
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    const code = (searchParams.get('code') ?? '').trim().toUpperCase().slice(0, 6);
    if (!code || loading) return;
    const match = devices.find((d) => d.status === 'PENDING' && d.pairingCode === code);
    if (match) {
      setHighlightId(match.id);
      requestAnimationFrame(() => {
        const input = document.getElementById(`approve-name-${match.id}`);
        input?.scrollIntoView({ block: 'center' });
        input?.focus();
      });
    } else {
      setShowManualLink(true);
      setPairingCode(code);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, loading, devices, setSearchParams]);

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
    await attempt(() => devicesApi.assignPlaylist(deviceId, playlistId || null), 'Playlist asignada');
    refresh();
  }

  async function onAssignBranch(deviceId: string, branchId: string) {
    await attempt(() => devicesApi.update(deviceId, { branchId: branchId || undefined }), 'Sucursal actualizada');
    refresh();
  }

  async function onRename(deviceId: string, name: string) {
    if (!name.trim()) return refresh();
    await attempt(() => devicesApi.update(deviceId, { name: name.trim() }), 'Nombre actualizado');
    refresh();
  }

  async function onDelete(device: Device) {
    const pending = device.status === 'PENDING';
    const confirmed = await confirm({
      title: pending ? '¿Rechazar esta pantalla?' : `¿Eliminar "${device.name}"?`,
      message: pending
        ? 'La TV mostrará un código nuevo y podrá volver a solicitar la vinculación.'
        : 'La TV dejará de mostrar contenido y volverá a la pantalla de vinculación.',
      confirmLabel: pending ? 'Rechazar' : 'Eliminar',
    });
    if (!confirmed) return;
    if (await attempt(() => devicesApi.remove(device.id), pending ? 'Pantalla rechazada' : 'Pantalla eliminada')) refresh();
  }

  const pendingDevices = devices.filter((d) => d.status === 'PENDING');
  const linkedDevices = devices.filter((d) => d.status !== 'PENDING');
  const now = Date.now();
  const onlineCount = linkedDevices.filter((d) => liveStatus(d, now) === 'ONLINE').length;

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
                    className={`device-card device-card-pending${highlightId === d.id ? ' is-highlighted' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                  >
                    <div className="device-card-top">
                      <div className="device-icon-wrap">
                        <span className="device-icon">
                          <Icon name="screen" size={20} />
                        </span>
                        <span className="device-pairing-code">{d.pairingCode}</span>
                      </div>
                      <span className="status-badge status-pending">Esperando aprobación</span>
                    </div>

                    <div className="device-field">
                      <label htmlFor={`approve-name-${d.id}`}>Nombre de la pantalla</label>
                      <input
                        id={`approve-name-${d.id}`}
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
                        {approving === d.id ? 'Aprobando…' : 'Aprobar pantalla'}
                      </button>
                      <button className="btn-danger-ghost" onClick={() => onDelete(d)}>
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
                    className={`device-card${liveStatus(d, now) === 'ONLINE' ? ' is-online' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                  >
                    <div className="device-card-top">
                      <div className="device-icon-wrap">
                        <span className="device-icon">
                          <Icon name="screen" size={20} />
                        </span>
                        <input
                          className="device-name-input"
                          aria-label="Nombre de la pantalla"
                          defaultValue={d.name}
                          onBlur={(e) => e.target.value !== d.name && onRename(d.id, e.target.value)}
                        />
                      </div>
                      <span className={`status-badge status-${liveStatus(d, now).toLowerCase()}`}>
                        {STATUS_LABEL[liveStatus(d, now)]}
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
                      <span title={d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : undefined}>
                        {lastSeenLabel(d, now)}
                      </span>
                      <button className="btn-danger-ghost" onClick={() => onDelete(d)}>
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

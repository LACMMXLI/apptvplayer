import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Device } from '../types';
import { branchesApi, devicesApi, mediaApi, playlistsApi, slidesApi } from '../api/endpoints';
import { STATUS_LABEL, lastSeenLabel, liveStatus } from '../deviceStatus';
import Icon from '../components/Icon';

interface Summary {
  media: number;
  slides: number;
  playlists: number;
  branches: number;
  devices: Device[];
}

// Screen status is the one thing on this page that changes by itself.
const REFRESH_INTERVAL_MS = 30_000;

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    return Promise.all([
      mediaApi.list(),
      slidesApi.list(),
      playlistsApi.list(),
      devicesApi.list(),
      branchesApi.list(),
    ])
      .then(([media, slides, playlists, devices, branches]) => {
        setSummary({
          media: media.length,
          slides: slides.length,
          playlists: playlists.length,
          branches: branches.length,
          devices,
        });
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const now = Date.now();
  const screens = (summary?.devices ?? []).filter((d) => d.status !== 'PENDING');
  const pending = (summary?.devices ?? []).length - screens.length;
  const online = screens.filter((d) => liveStatus(d, now) === 'ONLINE').length;
  // Screens that are off or have nothing to show come first: they need attention.
  const sortedScreens = [...screens].sort((a, b) => {
    const rank = (d: Device) => (liveStatus(d, now) === 'ONLINE' ? (d.playlistId ? 2 : 1) : 0);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {error && (
        <div className="error-state" role="alert">
          <span>No se pudo cargar la información. Revisa tu conexión con el servidor.</span>
          <button type="button" className="btn-secondary" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      {!(error && !summary) && (
        <>
          <div className="stats-grid">
            <StatCard
              label="Pantallas en línea"
              value={summary ? `${online}/${screens.length}` : undefined}
              to="/devices"
            />
            <StatCard label="Playlists" value={summary?.playlists} to="/playlists" />
            <StatCard label="Slides" value={summary?.slides} to="/slides" />
            <StatCard label="Archivos multimedia" value={summary?.media} to="/media" />
            <StatCard label="Sucursales" value={summary?.branches} to="/branches" />
          </div>

          {summary && (
            <section className="dashboard-section">
              <div className="dashboard-section-header">
                <h2>Pantallas</h2>
                <Link to="/devices">
                  {pending > 0 ? `${pending} por aprobar · Administrar` : 'Administrar'}
                </Link>
              </div>

              {sortedScreens.length === 0 ? (
                <p className="empty-state">
                  Aún no hay pantallas vinculadas. Enciende el reproductor en una TV y apruébala en
                  Dispositivos.
                </p>
              ) : (
                <ul className="screen-list">
                  {sortedScreens.map((d) => {
                    const status = liveStatus(d, now);
                    return (
                      <li key={d.id} className={`screen-row${status === 'ONLINE' ? ' is-online' : ''}`}>
                        <span className="screen-row-icon">
                          <Icon name="screen" />
                        </span>
                        <div>
                          <div className="screen-row-name">{d.name}</div>
                          <div className="screen-row-sub">
                            {d.branch?.name ? `${d.branch.name} · ` : ''}
                            {lastSeenLabel(d, now)}
                          </div>
                        </div>
                        <div className="screen-row-playlist">
                          {d.playlist?.name ?? 'Sin playlist asignada'}
                        </div>
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, to }: { label: string; value?: number | string; to: string }) {
  return (
    <Link to={to} className="stat-card">
      {value === undefined ? (
        <div className="skeleton" aria-hidden="true" />
      ) : (
        <div className="stat-value">{value}</div>
      )}
      <div className="stat-label">{label}</div>
    </Link>
  );
}

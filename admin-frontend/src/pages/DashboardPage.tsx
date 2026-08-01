import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { branchesApi, devicesApi, mediaApi, playlistsApi, slidesApi } from '../api/endpoints';

interface Counts {
  media: number;
  slides: number;
  playlists: number;
  devices: number;
  devicesOnline: number;
  branches: number;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    Promise.all([
      mediaApi.list(),
      slidesApi.list(),
      playlistsApi.list(),
      devicesApi.list(),
      branchesApi.list(),
    ]).then(([media, slides, playlists, devices, branches]) => {
      setCounts({
        media: media.length,
        slides: slides.length,
        playlists: playlists.length,
        devices: devices.length,
        devicesOnline: devices.filter((d) => d.status === 'ONLINE').length,
        branches: branches.length,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="stats-grid">
        <StatCard label="Archivos multimedia" value={counts?.media} to="/media" />
        <StatCard label="Slides" value={counts?.slides} to="/slides" />
        <StatCard label="Playlists" value={counts?.playlists} to="/playlists" />
        <StatCard
          label="Dispositivos online"
          value={counts ? `${counts.devicesOnline}/${counts.devices}` : undefined}
          to="/devices"
        />
        <StatCard label="Sucursales" value={counts?.branches} to="/branches" />
      </div>
    </div>
  );
}

function StatCard({ label, value, to }: { label: string; value?: number | string; to: string }) {
  return (
    <Link to={to} className="stat-card">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );
}

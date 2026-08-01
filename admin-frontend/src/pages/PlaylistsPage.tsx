import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Branch, Playlist } from '../types';
import { branchesApi, playlistsApi } from '../api/endpoints';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');

  function refresh() {
    setLoading(true);
    Promise.all([playlistsApi.list(), branchesApi.list()])
      .then(([p, b]) => {
        setPlaylists(p);
        setBranches(b);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await playlistsApi.create({ name, branchId: branchId || undefined });
    setName('');
    setBranchId('');
    refresh();
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar esta playlist?')) return;
    await playlistsApi.remove(id);
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">Playlists</h1>

      <form className="inline-form" onSubmit={onCreate}>
        <input
          placeholder="Nombre de la playlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">Sin sucursal específica</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit">
          Crear playlist
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Sucursal</th>
              <th>Slides</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/playlists/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.branch?.name ?? '—'}</td>
                <td>{p.items.length}</td>
                <td>
                  <button className="btn-danger-ghost" onClick={() => onDelete(p.id)}>
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

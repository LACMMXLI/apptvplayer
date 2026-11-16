import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Branch, Playlist } from '../types';
import { branchesApi, playlistsApi } from '../api/endpoints';
import { useFeedback } from '../components/Feedback';

export default function PlaylistsPage() {
  const { confirm, attempt } = useFeedback();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');

  function refresh() {
    setLoading(true);
    attempt(() =>
      Promise.all([playlistsApi.list(), branchesApi.list()]).then(([p, b]) => {
        setPlaylists(p);
        setBranches(b);
      }),
    ).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await attempt(
      () => playlistsApi.create({ name, branchId: branchId || undefined }),
      'Playlist creada',
    );
    if (!ok) return;
    setName('');
    setBranchId('');
    refresh();
  }

  async function onDelete(playlist: Playlist) {
    const confirmed = await confirm({
      title: `¿Eliminar "${playlist.name}"?`,
      message: 'Las pantallas que la reproducen se quedarán sin contenido. Los slides no se borran.',
    });
    if (!confirmed) return;
    if (await attempt(() => playlistsApi.remove(playlist.id), 'Playlist eliminada')) refresh();
  }

  return (
    <div>
      <h1 className="page-title">Playlists</h1>

      <form className="inline-form" onSubmit={onCreate}>
        <input
          placeholder="Nombre de la playlist"
          aria-label="Nombre de la playlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select aria-label="Sucursal" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">Sin sucursal específica</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn-primary" type="submit" disabled={!name.trim()}>
          Crear playlist
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : playlists.length === 0 ? (
        <p className="empty-state">Aún no hay playlists. Crea la primera con el formulario de arriba.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Sucursal</th>
                <th>Slides</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
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
                    <button className="btn-danger-ghost" onClick={() => onDelete(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

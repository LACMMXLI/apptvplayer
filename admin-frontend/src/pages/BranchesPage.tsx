import { FormEvent, useEffect, useState } from 'react';
import type { Branch } from '../types';
import { branchesApi } from '../api/endpoints';
import { useFeedback } from '../components/Feedback';

export default function BranchesPage() {
  const { confirm, attempt } = useFeedback();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function refresh() {
    setLoading(true);
    attempt(() => branchesApi.list().then(setBranches)).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await attempt(
      () => branchesApi.create({ name, address: address || undefined }),
      'Sucursal creada',
    );
    if (!ok) return;
    setName('');
    setAddress('');
    refresh();
  }

  async function onDelete(branch: Branch) {
    const confirmed = await confirm({
      title: `¿Eliminar "${branch.name}"?`,
      message: 'Las pantallas y playlists de esta sucursal no se borran, pero quedan sin sucursal asignada.',
    });
    if (!confirmed) return;
    if (await attempt(() => branchesApi.remove(branch.id), 'Sucursal eliminada')) refresh();
  }

  return (
    <div>
      <h1 className="page-title">Sucursales</h1>

      <form className="inline-form" onSubmit={onCreate}>
        <input
          placeholder="Nombre"
          aria-label="Nombre de la sucursal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Dirección (opcional)"
          aria-label="Dirección"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={!name.trim()}>
          Crear sucursal
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : branches.length === 0 ? (
        <p className="empty-state">Aún no hay sucursales. Crea la primera con el formulario de arriba.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address ?? '—'}</td>
                  <td>
                    <button className="btn-danger-ghost" onClick={() => onDelete(b)}>
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

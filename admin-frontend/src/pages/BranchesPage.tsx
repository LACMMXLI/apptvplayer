import { FormEvent, useEffect, useState } from 'react';
import type { Branch } from '../types';
import { branchesApi } from '../api/endpoints';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function refresh() {
    setLoading(true);
    branchesApi
      .list()
      .then(setBranches)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await branchesApi.create({ name, address: address || undefined });
    setName('');
    setAddress('');
    refresh();
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar esta sucursal?')) return;
    await branchesApi.remove(id);
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">Sucursales</h1>

      <form className="inline-form" onSubmit={onCreate}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Dirección (opcional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          Crear sucursal
        </button>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.address ?? '—'}</td>
                <td>
                  <button className="btn-danger-ghost" onClick={() => onDelete(b.id)}>
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

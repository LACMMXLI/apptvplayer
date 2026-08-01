import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../types';
import { mediaApi } from '../api/endpoints';

export default function MediaPage() {
  const [items, setItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setLoading(true);
    mediaApi
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await mediaApi.upload(file);
      refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este archivo?')) return;
    await mediaApi.remove(id);
    refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Media</h1>
        <label className="btn-primary upload-btn">
          {uploading ? 'Subiendo…' : 'Subir archivo'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={onFileChange}
            disabled={uploading}
            hidden
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No hay archivos multimedia todavía.</p>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <div key={item.id} className="media-card">
              {item.type === 'IMAGE' ? (
                <img src={item.url} alt={item.originalName} />
              ) : (
                <video src={item.url} muted />
              )}
              <div className="media-card-info">
                <span className="media-name" title={item.originalName}>
                  {item.originalName}
                </span>
                <button className="btn-danger-ghost" onClick={() => onDelete(item.id)}>
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

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../types';
import { mediaApi } from '../api/endpoints';
import { useFeedback } from '../components/Feedback';

// Mirrors the formats the backend accepts (it verifies the real file content).
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm';

export default function MediaPage() {
  const { confirm, attempt } = useFeedback();
  const [items, setItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setLoading(true);
    attempt(() => mediaApi.list().then(setItems)).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ok = await attempt(() => mediaApi.upload(file), 'Archivo subido');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (ok) refresh();
  }

  async function onDelete(item: MediaFile) {
    const confirmed = await confirm({
      title: '¿Eliminar este archivo?',
      message: `"${item.originalName}" se borrará del almacenamiento. Los slides que lo usan se quedarán sin imagen.`,
    });
    if (!confirmed) return;
    if (await attempt(() => mediaApi.remove(item.id), 'Archivo eliminado')) refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Media</h1>
        <label className={`btn-primary upload-btn${uploading ? ' is-busy' : ''}`}>
          {uploading ? 'Subiendo…' : 'Subir archivo'}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={onFileChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">
          No hay archivos multimedia todavía. Sube imágenes (JPG, PNG, GIF, WEBP) o videos (MP4, WEBM).
        </p>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <div key={item.id} className="media-card">
              {item.type === 'IMAGE' ? (
                <img src={item.url} alt={item.originalName} loading="lazy" />
              ) : (
                <video src={item.url} muted preload="metadata" />
              )}
              <div className="media-card-info">
                <span className="media-name" title={item.originalName}>
                  {item.originalName}
                </span>
                <button className="btn-danger-ghost" onClick={() => onDelete(item)}>
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

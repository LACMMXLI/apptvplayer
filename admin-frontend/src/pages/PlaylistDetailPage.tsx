import { DragEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Playlist, PlaylistItem, Slide } from '../types';
import { playlistsApi, slidesApi } from '../api/endpoints';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlideId, setAddingSlideId] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  function refresh() {
    if (!id) return;
    setLoading(true);
    Promise.all([playlistsApi.get(id), slidesApi.list()])
      .then(([p, s]) => {
        setPlaylist(p);
        setAllSlides(s);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [id]);

  if (loading || !playlist) return <p>Cargando…</p>;

  const items = [...playlist.items].sort((a, b) => a.order - b.order);
  const availableSlides = allSlides.filter(
    (s) => !items.some((item) => item.slideId === s.id),
  );

  async function onAddSlide() {
    if (!id || !addingSlideId) return;
    await playlistsApi.addSlide(id, addingSlideId);
    setAddingSlideId('');
    refresh();
  }

  async function onRemoveItem(itemId: string) {
    if (!id) return;
    await playlistsApi.removeItem(id, itemId);
    refresh();
  }

  function onDragStart(itemId: string) {
    setDragId(itemId);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function onDrop(targetItemId: string) {
    if (!id || !dragId || dragId === targetItemId || !playlist) return;
    const currentPlaylist = playlist;

    const reordered = [...items];
    const fromIndex = reordered.findIndex((i) => i.id === dragId);
    const toIndex = reordered.findIndex((i) => i.id === targetItemId);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setDragId(null);
    setPlaylist({ ...currentPlaylist, items: reordered });

    await playlistsApi.reorder(
      id,
      reordered.map((item, index) => ({ slideId: item.slideId, order: index })),
    );
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">{playlist.name}</h1>
      <p className="page-subtitle">Arrastra los slides para reordenar la reproducción.</p>

      <div className="inline-form">
        <select value={addingSlideId} onChange={(e) => setAddingSlideId(e.target.value)}>
          <option value="">Seleccionar slide para agregar…</option>
          {availableSlides.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={onAddSlide} disabled={!addingSlideId}>
          Agregar a la playlist
        </button>
      </div>

      <ul className="dnd-list">
        {items.map((item: PlaylistItem) => (
          <li
            key={item.id}
            className={`dnd-item${dragId === item.id ? ' dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(item.id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(item.id)}
          >
            <span className="dnd-handle">⠿</span>
            <span className="dnd-title">{item.slide.title}</span>
            <span className="dnd-duration">{item.slide.durationSecs}s</span>
            <button className="btn-danger-ghost" onClick={() => onRemoveItem(item.id)}>
              Quitar
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="empty-state">Esta playlist no tiene slides.</p>}
      </ul>
    </div>
  );
}

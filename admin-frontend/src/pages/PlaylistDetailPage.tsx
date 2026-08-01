import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Playlist, PlaylistItem, Slide } from '../types';
import { playlistsApi, slidesApi } from '../api/endpoints';
import PlaylistTimeline from '../components/PlaylistTimeline';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [allSlides, setAllSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlideId, setAddingSlideId] = useState('');

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

  async function onReorder(reordered: PlaylistItem[]) {
    if (!id || !playlist) return;
    setPlaylist({ ...playlist, items: reordered });
    await playlistsApi.reorder(
      id,
      reordered.map((item, index) => ({ slideId: item.slideId, order: index })),
    );
    refresh();
  }

  async function onDurationCommit(slideId: string, durationSecs: number) {
    await slidesApi.update(slideId, { durationSecs });
    refresh();
  }

  return (
    <div>
      <h1 className="page-title">{playlist.name}</h1>
      <p className="page-subtitle">
        Arrastra los bloques para reordenar y estira el borde derecho para cambiar la duración.
      </p>

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

      <PlaylistTimeline
        items={items}
        onReorder={onReorder}
        onDurationCommit={onDurationCommit}
        onRemove={onRemoveItem}
      />
    </div>
  );
}

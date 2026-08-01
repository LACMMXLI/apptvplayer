import { DragEvent, useEffect, useRef, useState } from 'react';
import type { PlaylistItem } from '../types';

const PX_PER_SEC = 18;
const MIN_BLOCK_PX = 90;
const MIN_DURATION_SECS = 1;

interface Props {
  items: PlaylistItem[];
  onReorder: (orderedItems: PlaylistItem[]) => void;
  onDurationCommit: (slideId: string, durationSecs: number) => void;
  onRemove: (itemId: string) => void;
}

function blockWidth(durationSecs: number) {
  return Math.max(MIN_BLOCK_PX, durationSecs * PX_PER_SEC);
}

export default function PlaylistTimeline({ items, onReorder, onDurationCommit, onRemove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [liveDurations, setLiveDurations] = useState<Record<string, number>>({});
  const resizeState = useRef<{ itemId: string; slideId: string; startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    setLiveDurations({});
  }, [items.map((i) => i.id).join(',')]);

  function onDragStart(itemId: string) {
    setDragId(itemId);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onDrop(targetItemId: string) {
    if (!dragId || dragId === targetItemId) return;
    const reordered = [...items];
    const fromIndex = reordered.findIndex((i) => i.id === dragId);
    const toIndex = reordered.findIndex((i) => i.id === targetItemId);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setDragId(null);
    onReorder(reordered);
  }

  function startResize(e: React.MouseEvent, item: PlaylistItem) {
    e.preventDefault();
    e.stopPropagation();
    const duration = liveDurations[item.id] ?? item.slide.durationSecs;
    resizeState.current = {
      itemId: item.id,
      slideId: item.slideId,
      startX: e.clientX,
      startWidth: blockWidth(duration),
    };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }

  function onResizeMove(e: MouseEvent) {
    const state = resizeState.current;
    if (!state) return;
    const deltaX = e.clientX - state.startX;
    const newWidth = Math.max(MIN_BLOCK_PX, state.startWidth + deltaX);
    const newDuration = Math.max(MIN_DURATION_SECS, Math.round(newWidth / PX_PER_SEC));
    setLiveDurations((prev) => ({ ...prev, [state.itemId]: newDuration }));
  }

  function onResizeEnd() {
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    const state = resizeState.current;
    resizeState.current = null;
    if (!state) return;
    const finalDuration = liveDurations[state.itemId];
    if (finalDuration) {
      onDurationCommit(state.slideId, finalDuration);
    }
  }

  const totalSecs = items.reduce((sum, item) => sum + (liveDurations[item.id] ?? item.slide.durationSecs), 0);

  return (
    <div className="timeline-container">
      <div className="timeline-meta">
        Duración total: {Math.floor(totalSecs / 60)}m {totalSecs % 60}s · {items.length} slides
      </div>
      <div className="timeline-wrapper">
        <div className="timeline-track">
          {items.map((item) => {
            const duration = liveDurations[item.id] ?? item.slide.durationSecs;
            const media = item.slide.media;
            return (
              <div
                key={item.id}
                className={`timeline-block${dragId === item.id ? ' dragging' : ''}`}
                style={{ width: blockWidth(duration), backgroundColor: item.slide.backgroundColor }}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(item.id)}
              >
                {media?.type === 'IMAGE' && <img className="timeline-block-media" src={media.url} alt="" />}
                {media?.type === 'VIDEO' && (
                  <video className="timeline-block-media" src={media.url} muted />
                )}
                <button
                  className="timeline-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  title="Quitar de la playlist"
                >
                  ✕
                </button>
                <div className="timeline-block-overlay">
                  <span className="timeline-block-title">{item.slide.title}</span>
                  <span className="timeline-block-duration">{duration}s</span>
                </div>
                <div
                  className="timeline-resize-handle"
                  onMouseDown={(e) => startResize(e, item)}
                  title="Arrastra para cambiar la duración"
                />
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="timeline-empty">Agrega slides para armar la línea de tiempo.</div>
          )}
        </div>
      </div>
    </div>
  );
}

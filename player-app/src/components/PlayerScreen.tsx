import { useEffect, useState } from 'react';
import type { Playlist } from '../types';
import SlideRenderer from './SlideRenderer';

interface Props {
  playlist: Playlist;
}

export default function PlayerScreen({ playlist }: Props) {
  const [index, setIndex] = useState(0);

  const items = playlist.items;
  const current = items[index % items.length];

  useEffect(() => {
    setIndex(0);
  }, [playlist.id]);

  useEffect(() => {
    if (items.length === 0) return;
    const durationMs = Math.max(1, current.slide.durationSecs) * 1000;
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [index, items.length, current]);

  if (items.length === 0) {
    return (
      <div className="player-empty">
        <p>Esta pantalla no tiene contenido asignado todavía.</p>
      </div>
    );
  }

  return <SlideRenderer slide={current.slide} />;
}

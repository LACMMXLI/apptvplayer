import { useEffect, useRef, useState } from 'react';
import type { Playlist, PlaylistItem } from '../types';
import SlideRenderer, { ANIMATION_MS } from './SlideRenderer';

interface Props {
  playlist: Playlist;
}

export default function PlayerScreen({ playlist }: Props) {
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<PlaylistItem | null>(null);
  const [cycle, setCycle] = useState(0);
  const outgoingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = playlist.items;
  const current = items[index % Math.max(items.length, 1)];

  useEffect(() => {
    setIndex(0);
    setOutgoing(null);
    setCycle((c) => c + 1);
  }, [playlist.id]);

  useEffect(() => {
    if (items.length === 0) return;
    const durationMs = Math.max(1, current.slide.durationSecs) * 1000;
    const timer = setTimeout(() => {
      setOutgoing(current);
      setIndex((prev) => (prev + 1) % items.length);
      setCycle((c) => c + 1);
    }, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, playlist.id]);

  useEffect(() => {
    if (!outgoing) return;
    if (outgoingTimer.current) clearTimeout(outgoingTimer.current);
    outgoingTimer.current = setTimeout(() => setOutgoing(null), ANIMATION_MS);
    return () => {
      if (outgoingTimer.current) clearTimeout(outgoingTimer.current);
    };
  }, [outgoing]);

  if (items.length === 0) {
    return (
      <div className="player-empty">
        <p>Esta pantalla no tiene contenido asignado todavía.</p>
      </div>
    );
  }

  return (
    <div className="stage">
      {outgoing && (
        <SlideRenderer key={`out-${cycle}-${outgoing.slide.id}`} slide={outgoing.slide} phase="exit" />
      )}
      <SlideRenderer key={`in-${cycle}-${current.slide.id}`} slide={current.slide} phase="enter" />
    </div>
  );
}

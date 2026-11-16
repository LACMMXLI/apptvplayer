import { useEffect, useMemo, useRef, useState } from 'react';
import type { Playlist, PlaylistItem } from '../types';
import { SlideMediaStore } from '../mediaCache';
import SlideRenderer, { getExitDurationMs } from './SlideRenderer';

interface Props {
  playlist: Playlist;
}

/** One slide on stage. `key` is unique per appearance and only ever grows. */
interface Layer {
  key: number;
  item: PlaylistItem;
  src: string | null;
}

interface StageState {
  index: number;
  current: Layer;
  outgoing: Layer | null;
}

// Longest the show waits for the next slide's media before moving on anyway.
const MAX_PRELOAD_WAIT_MS = 4000;
// A video that hasn't started playing after this long is treated as broken.
const VIDEO_START_GRACE_MS = 8000;
// Slack added to a video's remaining time before forcing the next slide.
const VIDEO_END_SLACK_MS = 5000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function PlayerScreen({ playlist }: Props) {
  const items = playlist.items;
  const [stage, setStage] = useState<StageState | null>(null);

  const store = useMemo(() => new SlideMediaStore(), []);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const nextKey = useRef(0);
  const videoHandlers = useRef<{
    onPlaying: (remainingSecs: number | null) => void;
    onEnded: () => void;
  } | null>(null);

  useEffect(() => () => store.dispose(), [store]);

  // Changes whenever the playlist's actual content changes (not merely when
  // the same playlist is re-fetched), which restarts the show from the top.
  const signature = useMemo(
    () =>
      `${playlist.id}|` +
      items.map((item) => `${item.id}:${item.slide.id}:${item.slide.media?.url ?? ''}`).join('|'),
    [playlist.id, items],
  );

  // (Re)start: get the first slide's media ready, then put it on stage. If
  // something is already showing, it becomes the outgoing layer so the change
  // is a normal transition rather than a hard cut.
  useEffect(() => {
    const list = itemsRef.current;
    store.retainOnly(new Set(list.flatMap((item) => (item.slide.media ? [item.slide.media.url] : []))));
    if (list.length === 0) {
      setStage(null);
      return;
    }

    let cancelled = false;
    const first = list[0];
    Promise.race([
      store.prepare(first.slide.media),
      wait(MAX_PRELOAD_WAIT_MS).then(() => first.slide.media?.url ?? null),
    ]).then((src) => {
      if (cancelled) return;
      setStage((prev) => ({
        index: 0,
        current: { key: ++nextKey.current, item: first, src },
        outgoing: prev?.current ?? null,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [signature, store]);

  // Schedule the move to the next slide. The next slide's media starts
  // loading as soon as the current one appears, and the switch only happens
  // once it is decoded — so the entrance animation never runs on a blank frame.
  const currentKey = stage?.current.key;
  useEffect(() => {
    if (!stage) return;
    const list = itemsRef.current;
    // A single slide just stays up (a single video loops by itself).
    if (list.length <= 1) return;

    const layer = stage.current;
    const nextIndex = (stage.index + 1) % list.length;
    const next = list[nextIndex];
    const nextReady = store.prepare(next.slide.media);

    let cancelled = false;
    let advanced = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const advance = async () => {
      if (advanced || cancelled) return;
      advanced = true;
      const src = await Promise.race([
        nextReady,
        wait(MAX_PRELOAD_WAIT_MS).then(() => next.slide.media?.url ?? null),
      ]);
      if (cancelled) return;
      setStage({
        index: nextIndex,
        current: { key: ++nextKey.current, item: next, src },
        outgoing: layer,
      });
    };

    const durationMs = Math.max(1, layer.item.slide.durationSecs) * 1000;

    if (layer.item.slide.media?.type === 'VIDEO') {
      // Videos play through to their end instead of being cut at the slide
      // duration. The timers below are only safety nets for a video that
      // never starts, stalls, or has no known length.
      timer = setTimeout(advance, Math.max(durationMs, VIDEO_START_GRACE_MS));
      videoHandlers.current = {
        onPlaying: (remainingSecs) => {
          clearTimeout(timer);
          timer = setTimeout(
            advance,
            remainingSecs != null ? remainingSecs * 1000 + VIDEO_END_SLACK_MS : durationMs,
          );
        },
        onEnded: advance,
      };
    } else {
      timer = setTimeout(advance, durationMs);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      videoHandlers.current = null;
    };
    // Keyed on the layer on stage: re-running for unrelated re-renders would
    // restart the slide's timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, store]);

  // Unmount the outgoing layer once its own exit animation has finished.
  const outgoingKey = stage?.outgoing?.key;
  useEffect(() => {
    if (!stage?.outgoing) return;
    const key = stage.outgoing.key;
    const timer = setTimeout(() => {
      setStage((prev) => (prev?.outgoing?.key === key ? { ...prev, outgoing: null } : prev));
    }, getExitDurationMs(stage.outgoing.item.slide));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outgoingKey]);

  if (items.length === 0) {
    return (
      <div className="player-empty">
        <p>Esta pantalla no tiene contenido asignado todavía.</p>
      </div>
    );
  }

  // The outgoing layer keeps the key (and so the DOM node) it had while it
  // was current: its image stays decoded and its video keeps playing through
  // the exit animation. Keys only grow, so the order below never changes and
  // React never has to move a node (which would restart animations/video).
  return (
    <div className="stage">
      {stage?.outgoing && (
        <SlideRenderer
          key={stage.outgoing.key}
          slide={stage.outgoing.item.slide}
          src={stage.outgoing.src}
          variant={stage.outgoing.key}
          loopVideo
          phase="exit"
        />
      )}
      {stage && (
        <SlideRenderer
          key={stage.current.key}
          slide={stage.current.item.slide}
          src={stage.current.src}
          variant={stage.current.key}
          loopVideo={items.length <= 1}
          phase="enter"
          onVideoPlaying={(remainingSecs) => videoHandlers.current?.onPlaying(remainingSecs)}
          onVideoEnded={() => videoHandlers.current?.onEnded()}
        />
      )}
    </div>
  );
}

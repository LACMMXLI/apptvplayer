import { useEffect, useState } from 'react';
import type { Slide, SlideEffect } from '../types';
import { resolveMediaSrc } from '../mediaCache';

const ANIMATION_MS = 700;

interface Props {
  slide: Slide;
  phase: 'enter' | 'exit';
}

const EFFECT_ANIMATIONS: Record<Exclude<SlideEffect, 'NONE'>, { enter: string; exit: string }> = {
  FADE: { enter: 'anim-fade-in', exit: 'anim-fade-out' },
  ZOOM_IN: { enter: 'anim-zoom-in-enter', exit: 'anim-zoom-in-exit' },
  ZOOM_OUT: { enter: 'anim-zoom-out-enter', exit: 'anim-zoom-out-exit' },
  ROTATE: { enter: 'anim-rotate-enter', exit: 'anim-rotate-exit' },
  SLIDE_LEFT: { enter: 'anim-slide-left-enter', exit: 'anim-slide-left-exit' },
  SLIDE_RIGHT: { enter: 'anim-slide-right-enter', exit: 'anim-slide-right-exit' },
  FLIP: { enter: 'anim-flip-enter', exit: 'anim-flip-exit' },
  BLUR: { enter: 'anim-blur-enter', exit: 'anim-blur-exit' },
  KEN_BURNS: { enter: 'anim-ken-burns-enter', exit: 'anim-fade-out' },
  BOUNCE: { enter: 'anim-bounce-enter', exit: 'anim-bounce-exit' },
};

function animationName(effect: SlideEffect, phase: 'enter' | 'exit'): string | null {
  if (effect === 'NONE') return null;
  return EFFECT_ANIMATIONS[effect][phase];
}

export default function SlideRenderer({ slide, phase }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (slide.media) {
      resolveMediaSrc(slide.media.url).then((resolved) => {
        if (cancelled) return;
        if (resolved.startsWith('blob:')) objectUrl = resolved;
        setSrc(resolved);
      });
    } else {
      setSrc(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [slide.id]);

  const effect = phase === 'enter' ? slide.entranceEffect : slide.exitEffect;
  const animation = animationName(effect, phase);
  const isKenBurns = phase === 'enter' && slide.entranceEffect === 'KEN_BURNS';
  // Ken Burns keeps panning/zooming slowly for the entire time the slide is on screen,
  // independent of the short enter/exit crossfade layer animation above.
  const mediaStyle = isKenBurns
    ? { animation: `anim-ken-burns-pan ${Math.max(slide.durationSecs, 3)}s ease-in-out both` }
    : undefined;

  return (
    <div
      className={`slide-layer${phase === 'exit' ? ' slide-layer-exit' : ''}`}
      style={animation ? { animation: `${animation} ${ANIMATION_MS}ms ease both` } : undefined}
    >
      <div className="slide" style={{ backgroundColor: slide.backgroundColor }}>
        {slide.media && src && slide.media.type === 'IMAGE' && (
          <img className="slide-media" src={src} alt={slide.title} style={mediaStyle} />
        )}
        {slide.media && src && slide.media.type === 'VIDEO' && (
          <video className="slide-media" src={src} autoPlay muted loop playsInline style={mediaStyle} />
        )}
        {!slide.media && <div className="slide-title-only">{slide.title}</div>}
      </div>
    </div>
  );
}

export { ANIMATION_MS };

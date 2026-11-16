import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { OverlayEffect, Slide, SlideEffect } from '../types';
import { resolveMediaSrc } from '../mediaCache';

const DEFAULT_ANIMATION_MS = 700;

interface Props {
  slide: Slide;
  phase: 'enter' | 'exit';
  /** Already-resolved media source (see SlideMediaStore); null when the slide has no media. */
  src: string | null;
  /** Picks one of the Ken Burns pan directions so consecutive slides differ. */
  variant: number;
  /** Loop the video (used when it is the only item in the playlist). */
  loopVideo: boolean;
  onVideoPlaying?: (remainingSecs: number | null) => void;
  onVideoEnded?: () => void;
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

// Entrances decelerate into place, exits accelerate away.
const EASE_ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_EXIT = 'cubic-bezier(0.55, 0, 0.78, 0.2)';
// Push transitions move the outgoing and incoming slides together, so both
// sides must share one symmetric curve or a gap opens between them.
const EASE_PUSH = 'cubic-bezier(0.65, 0, 0.35, 1)';

function easingFor(effect: SlideEffect, phase: 'enter' | 'exit'): string {
  if (effect === 'SLIDE_LEFT' || effect === 'SLIDE_RIGHT') return EASE_PUSH;
  // These keyframes carry their own motion shape / are plain crossfades.
  if (effect === 'BOUNCE') return 'ease';
  if (effect === 'FADE' || effect === 'KEN_BURNS') return 'ease-in-out';
  return phase === 'enter' ? EASE_ENTER : EASE_EXIT;
}

// Continuous overlay animation that loops for as long as the slide is on screen.
const OVERLAY_ANIMATIONS: Record<Exclude<OverlayEffect, 'NONE'>, string> = {
  FLASH: 'anim-overlay-flash',
  SHINE_SWEEP: 'anim-overlay-shine',
  GLOW_PULSE: 'anim-overlay-glow',
  VIGNETTE_PULSE: 'anim-overlay-vignette',
  FLICKER: 'anim-overlay-flicker',
  LIGHT_LEAK: 'anim-overlay-light-leak',
};

// How long one loop of each overlay animation lasts, tuned per effect so it
// reads naturally (a flash should be quick/sporadic, a light leak slow).
const OVERLAY_DURATIONS_S: Record<Exclude<OverlayEffect, 'NONE'>, number> = {
  FLASH: 2.6,
  SHINE_SWEEP: 3.2,
  GLOW_PULSE: 3,
  VIGNETTE_PULSE: 3.4,
  FLICKER: 0.28,
  LIGHT_LEAK: 6,
};

// Ken Burns start → end transforms. Alternating them keeps a run of Ken Burns
// slides from all drifting the same way.
const KEN_BURNS_VARIANTS: { from: string; to: string }[] = [
  { from: 'scale(1) translate(0, 0)', to: 'scale(1.18) translate(-2%, -2%)' },
  { from: 'scale(1.18) translate(2%, -2%)', to: 'scale(1) translate(0, 0)' },
  { from: 'scale(1) translate(0, 0)', to: 'scale(1.18) translate(2%, 2%)' },
  { from: 'scale(1.18) translate(-2%, 2%)', to: 'scale(1) translate(0, 0)' },
];

function animationName(effect: SlideEffect, phase: 'enter' | 'exit'): string | null {
  if (effect === 'NONE') return null;
  return EFFECT_ANIMATIONS[effect][phase];
}

export function getExitDurationMs(slide: Slide): number {
  return slide.exitDurationMs ?? DEFAULT_ANIMATION_MS;
}

export default function SlideRenderer({
  slide,
  phase,
  src,
  variant,
  loopVideo,
  onVideoPlaying,
  onVideoEnded,
}: Props) {
  // Only set if the network copy of a video fails: fall back to the offline cache.
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const triedFallback = useRef(false);

  useEffect(() => {
    return () => {
      if (fallbackSrc?.startsWith('blob:')) URL.revokeObjectURL(fallbackSrc);
    };
  }, [fallbackSrc]);

  function handleVideoError() {
    if (triedFallback.current || !slide.media) return;
    triedFallback.current = true;
    resolveMediaSrc(slide.media.url).then((resolved) => {
      if (resolved.startsWith('blob:')) setFallbackSrc(resolved);
    });
  }

  const effect = phase === 'enter' ? slide.entranceEffect : slide.exitEffect;
  const animation = animationName(effect, phase);
  const durationMs =
    phase === 'enter' ? slide.entranceDurationMs ?? DEFAULT_ANIMATION_MS : getExitDurationMs(slide);

  // Ken Burns pans/zooms the media for the slide's whole time on screen. It is
  // deliberately NOT tied to `phase`: dropping it when the slide starts to
  // exit would snap the image back to its start position mid-transition.
  const isKenBurns = slide.entranceEffect === 'KEN_BURNS';
  const kenBurns = KEN_BURNS_VARIANTS[variant % KEN_BURNS_VARIANTS.length];
  const mediaStyle = isKenBurns
    ? ({
        '--kb-from': kenBurns.from,
        '--kb-to': kenBurns.to,
        animation: `anim-ken-burns-pan ${
          Math.max(slide.durationSecs, 3) + getExitDurationMs(slide) / 1000
        }s ease-in-out both`,
      } as CSSProperties)
    : undefined;

  // Only the "current" (entering) layer shows the decorative overlay — the
  // outgoing layer is on its way out and would just double it up.
  const overlayEffect = slide.overlayEffect;
  const showOverlay = phase === 'enter' && overlayEffect && overlayEffect !== 'NONE';
  const mediaSrc = fallbackSrc ?? src;

  return (
    <div
      className={`slide-layer slide-layer-${phase}`}
      style={animation ? { animation: `${animation} ${durationMs}ms ${easingFor(effect, phase)} both` } : undefined}
    >
      <div className="slide" style={{ backgroundColor: slide.backgroundColor }}>
        {slide.media && mediaSrc && slide.media.type === 'IMAGE' && (
          <img className="slide-media" src={mediaSrc} alt="" decoding="sync" style={mediaStyle} />
        )}
        {slide.media && mediaSrc && slide.media.type === 'VIDEO' && (
          <video
            className="slide-media"
            src={mediaSrc}
            autoPlay
            muted
            playsInline
            preload="auto"
            loop={loopVideo}
            style={mediaStyle}
            onPlaying={(e) => {
              const video = e.currentTarget;
              const remaining = video.duration - video.currentTime;
              onVideoPlaying?.(Number.isFinite(remaining) ? remaining : null);
            }}
            onEnded={() => onVideoEnded?.()}
            onError={handleVideoError}
          />
        )}
        {!slide.media && <div className="slide-title-only">{slide.title}</div>}
        {showOverlay && (
          <div
            className={`slide-overlay-fx overlay-${overlayEffect.toLowerCase().replace(/_/g, '-')}`}
            style={{
              animation: `${OVERLAY_ANIMATIONS[overlayEffect as Exclude<OverlayEffect, 'NONE'>]} ${
                OVERLAY_DURATIONS_S[overlayEffect as Exclude<OverlayEffect, 'NONE'>]
              }s ease-in-out infinite`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export { DEFAULT_ANIMATION_MS };

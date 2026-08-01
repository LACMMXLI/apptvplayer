import { useEffect, useState } from 'react';
import type { Slide } from '../types';
import { resolveMediaSrc } from '../mediaCache';

interface Props {
  slide: Slide;
}

export default function SlideRenderer({ slide }: Props) {
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

  return (
    <div className="slide" style={{ backgroundColor: slide.backgroundColor }}>
      {slide.media && src && slide.media.type === 'IMAGE' && (
        <img className="slide-media" src={src} alt={slide.title} />
      )}
      {slide.media && src && slide.media.type === 'VIDEO' && (
        <video className="slide-media" src={src} autoPlay muted loop playsInline />
      )}
      {!slide.media && <div className="slide-title-only">{slide.title}</div>}
    </div>
  );
}

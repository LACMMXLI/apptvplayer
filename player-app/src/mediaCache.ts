import type { MediaFile, Playlist } from './types';

const PLAYLIST_KEY = 'signage.playlist.cache';
const MEDIA_CACHE_NAME = 'signage-media-v1';

export function getCachedPlaylist(): Playlist | null {
  const raw = localStorage.getItem(PLAYLIST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Playlist;
  } catch {
    return null;
  }
}

export function setCachedPlaylist(playlist: Playlist) {
  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlist));
}

/**
 * Downloads and stores every media asset referenced by the playlist in the
 * browser Cache Storage so the player can keep showing content if the
 * backend/storage becomes unreachable.
 */
export async function preloadPlaylistMedia(playlist: Playlist): Promise<void> {
  if (!('caches' in window)) return;

  const cache = await caches.open(MEDIA_CACHE_NAME);
  const urls = playlist.items
    .map((item) => item.slide.media?.url)
    .filter((url): url is string => Boolean(url));

  await Promise.all(
    urls.map(async (url) => {
      try {
        const match = await cache.match(url);
        if (match) return;
        await cache.add(url);
      } catch {
        // Ignore individual media failures — the player falls back to the
        // direct network URL (or browser HTTP cache) when rendering.
      }
    }),
  );
}

interface StoreEntry {
  ready: Promise<string>;
  objectUrl?: string;
  // Held so the browser keeps the decoded bitmap around until it is shown.
  image?: HTMLImageElement;
}

/**
 * Resolves and warms up slide media ahead of time so a slide's entrance
 * animation starts with the picture already decoded, instead of animating an
 * empty background and popping the image in afterwards.
 */
export class SlideMediaStore {
  private entries = new Map<string, StoreEntry>();

  /** Resolves once the media is ready to be painted; returns the src to use. */
  prepare(media: MediaFile | null): Promise<string | null> {
    if (!media) return Promise.resolve(null);

    let entry = this.entries.get(media.url);
    if (!entry) {
      entry = { ready: Promise.resolve(media.url) };
      // Videos stream straight from the network (the browser buffers them
      // itself); loading a whole video into memory as a blob is too heavy for
      // TV hardware. The offline copy is only used if the network fails.
      if (media.type === 'IMAGE') {
        const created = entry;
        created.ready = (async () => {
          const src = await resolveMediaSrc(media.url);
          if (src.startsWith('blob:')) created.objectUrl = src;
          const image = new Image();
          image.src = src;
          created.image = image;
          try {
            await image.decode();
          } catch {
            // Broken/unsupported image: let the <img> element deal with it.
          }
          return src;
        })();
      }
      this.entries.set(media.url, entry);
    }
    return entry.ready;
  }

  /** Drops (and frees) everything not referenced by the given media URLs. */
  retainOnly(urls: Set<string>) {
    for (const [url, entry] of this.entries) {
      if (urls.has(url)) continue;
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
      this.entries.delete(url);
    }
  }

  dispose() {
    this.retainOnly(new Set());
  }
}

export async function resolveMediaSrc(url: string): Promise<string> {
  if ('caches' in window) {
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        return URL.createObjectURL(blob);
      }
    } catch {
      // fall through to network URL
    }
  }
  return url;
}

import type { Playlist } from './types';

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

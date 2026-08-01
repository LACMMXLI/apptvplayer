export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
}

export interface MediaFile {
  id: string;
  originalName: string;
  mimeType: string;
  type: 'IMAGE' | 'VIDEO';
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export type SlideEffect = 'NONE' | 'FADE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'ROTATE';

export const SLIDE_EFFECT_OPTIONS: { value: SlideEffect; label: string }[] = [
  { value: 'NONE', label: 'Sin animación' },
  { value: 'FADE', label: 'Fundido (fade)' },
  { value: 'ZOOM_IN', label: 'Zoom in' },
  { value: 'ZOOM_OUT', label: 'Zoom out' },
  { value: 'ROTATE', label: 'Rotación' },
];

export interface Slide {
  id: string;
  title: string;
  mediaId: string | null;
  media: MediaFile | null;
  durationSecs: number;
  backgroundColor: string;
  entranceEffect: SlideEffect;
  exitEffect: SlideEffect;
  createdAt: string;
}

export interface PlaylistItem {
  id: string;
  order: number;
  slideId: string;
  slide: Slide;
}

export interface Playlist {
  id: string;
  name: string;
  branchId: string | null;
  branch?: Branch | null;
  isActive: boolean;
  items: PlaylistItem[];
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  pairingCode: string;
  status: 'PENDING' | 'ONLINE' | 'OFFLINE';
  branchId: string | null;
  branch: Branch | null;
  playlistId: string | null;
  playlist: Playlist | null;
  lastSeenAt: string | null;
  pairedAt: string | null;
  createdAt: string;
}

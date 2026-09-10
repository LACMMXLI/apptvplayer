export interface MediaFile {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  mimeType: string;
}

export type SlideEffect =
  | 'NONE'
  | 'FADE'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'ROTATE'
  | 'SLIDE_LEFT'
  | 'SLIDE_RIGHT'
  | 'FLIP'
  | 'BLUR'
  | 'KEN_BURNS'
  | 'BOUNCE';

export interface Slide {
  id: string;
  title: string;
  durationSecs: number;
  backgroundColor: string;
  entranceEffect: SlideEffect;
  exitEffect: SlideEffect;
  media: MediaFile | null;
}

export interface PlaylistItem {
  id: string;
  order: number;
  slide: Slide;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export interface DeviceCredentials {
  deviceId: string;
  deviceKey: string;
  pairingCode: string;
}

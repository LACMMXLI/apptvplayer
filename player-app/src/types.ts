export interface MediaFile {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  mimeType: string;
}

export interface Slide {
  id: string;
  title: string;
  durationSecs: number;
  backgroundColor: string;
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

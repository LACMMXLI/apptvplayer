import { api } from './client';
import type { Branch, Device, MediaFile, Playlist, Slide, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  me: () => api.get<User>('/auth/me'),
};

export const branchesApi = {
  list: () => api.get<Branch[]>('/branches'),
  create: (data: { name: string; address?: string }) => api.post<Branch>('/branches', data),
  update: (id: string, data: { name?: string; address?: string }) =>
    api.patch<Branch>(`/branches/${id}`, data),
  remove: (id: string) => api.delete(`/branches/${id}`),
};

export const mediaApi = {
  list: () => api.get<MediaFile[]>('/media'),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<MediaFile>('/media/upload', form);
  },
  remove: (id: string) => api.delete(`/media/${id}`),
};

export const slidesApi = {
  list: () => api.get<Slide[]>('/slides'),
  get: (id: string) => api.get<Slide>(`/slides/${id}`),
  create: (data: Partial<Slide> & { title: string }) => api.post<Slide>('/slides', data),
  update: (id: string, data: Partial<Slide>) => api.patch<Slide>(`/slides/${id}`, data),
  remove: (id: string) => api.delete(`/slides/${id}`),
};

export const playlistsApi = {
  list: () => api.get<Playlist[]>('/playlists'),
  get: (id: string) => api.get<Playlist>(`/playlists/${id}`),
  create: (data: { name: string; branchId?: string; isActive?: boolean }) =>
    api.post<Playlist>('/playlists', data),
  update: (id: string, data: { name?: string; branchId?: string; isActive?: boolean }) =>
    api.patch<Playlist>(`/playlists/${id}`, data),
  remove: (id: string) => api.delete(`/playlists/${id}`),
  addSlide: (playlistId: string, slideId: string) =>
    api.post<Playlist>(`/playlists/${playlistId}/items/${slideId}`),
  removeItem: (playlistId: string, itemId: string) =>
    api.delete(`/playlists/${playlistId}/items/${itemId}`),
  reorder: (playlistId: string, items: { slideId: string; order: number }[]) =>
    api.patch<Playlist>(`/playlists/${playlistId}/reorder`, { items }),
};

export const devicesApi = {
  list: () => api.get<Device[]>('/devices'),
  link: (pairingCode: string, data: { name: string; branchId?: string }) =>
    api.post<Device>(`/devices/link/${pairingCode}`, data),
  update: (id: string, data: { name?: string; branchId?: string }) =>
    api.patch<Device>(`/devices/admin/${id}`, data),
  assignPlaylist: (id: string, playlistId: string | null) =>
    api.patch<Device>(`/devices/admin/${id}/playlist`, { playlistId }),
  remove: (id: string) => api.delete(`/devices/admin/${id}`),
};

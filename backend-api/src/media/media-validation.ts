import { MediaType } from '@prisma/client';

export interface DetectedMedia {
  mimeType: string;
  extension: string;
  type: MediaType;
}

export const DEFAULT_MAX_UPLOAD_MB = 200;

/** Only these formats can be uploaded; everything else is rejected. */
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * Identifies the real file format from its leading bytes. The MIME type and
 * file name sent by the browser are attacker-controlled, so neither is
 * trusted to decide what gets stored and with which Content-Type (otherwise
 * an HTML/SVG file could be uploaded and served from the media domain).
 */
export function detectMedia(buffer: Buffer): DetectedMedia | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg', type: 'IMAGE' };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png', type: 'IMAGE' };
  }
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return { mimeType: 'image/gif', extension: 'gif', type: 'IMAGE' };
  }
  // RIFF....WEBP
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mimeType: 'image/webp', extension: 'webp', type: 'IMAGE' };
  }
  // ISO base media (MP4): "ftyp" box at offset 4
  if (startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4)) {
    return { mimeType: 'video/mp4', extension: 'mp4', type: 'VIDEO' };
  }
  // EBML header (WebM/Matroska)
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mimeType: 'video/webm', extension: 'webm', type: 'VIDEO' };
  }
  return null;
}

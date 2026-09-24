import { newId } from './db';
import type { StoredImage } from './types';

export const FULL_MAX = 2560;
export const THUMB_MAX = 640;

/** Scales (width, height) down to fit inside a max×max box, never up. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function encode(bitmap: ImageBitmap, max: number, quality: number) {
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not encode the image.');
  return { blob, ...size };
}

/**
 * Decodes a photo (respecting the phone's rotation info), shrinks it to a
 * sensible size, and produces a small thumbnail for the gallery. Re-encoding
 * also strips EXIF metadata such as GPS location.
 */
export async function processImage(file: File): Promise<StoredImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const heic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
    throw new Error(
      heic
        ? 'This browser can’t read HEIC photos. Export the photo as JPEG (or set your iPhone camera to “Most Compatible”) and try again.'
        : `“${file.name}” doesn’t look like an image this browser can open.`,
    );
  }
  try {
    const full = await encode(bitmap, FULL_MAX, 0.88);
    const thumb = await encode(bitmap, THUMB_MAX, 0.8);
    return { id: newId(), blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close();
  }
}

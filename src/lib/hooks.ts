import { useEffect, useState } from 'react';
import { getImage } from './db';

/** Loads a stored image (full size or thumbnail) as an object URL, plus its aspect ratio. */
export function useImage(id: string | undefined, variant: 'blob' | 'thumb' = 'blob') {
  const [image, setImage] = useState<{ url: string; aspect: number }>();
  useEffect(() => {
    if (!id) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    getImage(id).then((stored) => {
      if (cancelled || !stored) return;
      objectUrl = URL.createObjectURL(stored[variant]);
      setImage({ url: objectUrl, aspect: stored.width / stored.height });
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setImage(undefined);
    };
  }, [id, variant]);
  return image;
}

export function useImageUrl(id: string | undefined, variant: 'blob' | 'thumb' = 'blob') {
  return useImage(id, variant)?.url;
}

/** Object URL for an in-memory blob (e.g. a freshly processed upload). */
export function useBlobUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return url;
}

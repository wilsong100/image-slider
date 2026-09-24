import { useEffect, useState } from 'react';
import { getImage } from './db';

/** Loads a stored image (full size or thumbnail) and exposes it as an object URL. */
export function useImageUrl(id: string | undefined, variant: 'blob' | 'thumb' = 'blob') {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    getImage(id).then((image) => {
      if (cancelled || !image) return;
      objectUrl = URL.createObjectURL(image[variant]);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [id, variant]);
  return url;
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

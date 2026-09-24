import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Comparison, StoredImage } from './types';

interface SliderDB extends DBSchema {
  comparisons: { key: string; value: Comparison };
  images: { key: string; value: StoredImage };
}

let dbPromise: Promise<IDBPDatabase<SliderDB>> | null = null;

function db() {
  dbPromise ??= openDB<SliderDB>('before-after', 1, {
    upgrade(database) {
      database.createObjectStore('comparisons', { keyPath: 'id' });
      database.createObjectStore('images', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

export function newId() {
  return crypto.randomUUID();
}

export async function listComparisons(): Promise<Comparison[]> {
  const all = await (await db()).getAll('comparisons');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getComparison(id: string) {
  return (await db()).get('comparisons', id);
}

export async function getImage(id: string) {
  return (await db()).get('images', id);
}

/**
 * Saves a comparison together with any new images, and removes images the
 * comparison no longer references — all in one transaction.
 */
export async function saveComparison(comparison: Comparison, newImages: StoredImage[] = []) {
  const tx = (await db()).transaction(['comparisons', 'images'], 'readwrite');
  const previous = await tx.objectStore('comparisons').get(comparison.id);
  for (const image of newImages) await tx.objectStore('images').put(image);
  await tx.objectStore('comparisons').put(comparison);
  if (previous) {
    const keep = new Set([comparison.beforeImageId, comparison.afterImageId]);
    for (const oldId of [previous.beforeImageId, previous.afterImageId]) {
      if (!keep.has(oldId)) await tx.objectStore('images').delete(oldId);
    }
  }
  await tx.done;
}

export async function deleteComparison(id: string) {
  const tx = (await db()).transaction(['comparisons', 'images'], 'readwrite');
  const existing = await tx.objectStore('comparisons').get(id);
  if (existing) {
    await tx.objectStore('images').delete(existing.beforeImageId);
    await tx.objectStore('images').delete(existing.afterImageId);
    await tx.objectStore('comparisons').delete(id);
  }
  await tx.done;
}

/** Ask the browser not to evict our data when the device is low on space. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported — data is still stored, just "best effort".
  }
}

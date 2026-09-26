import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type { Comparison, Project, StoredImage } from './types';

interface SliderDB extends DBSchema {
  comparisons: { key: string; value: Comparison };
  images: { key: string; value: StoredImage };
  projects: { key: string; value: Project };
}

export const DEFAULT_PROJECT_NAME = 'My home';

let dbPromise: Promise<IDBPDatabase<SliderDB>> | null = null;

function db() {
  dbPromise ??= openDB<SliderDB>('before-after', 2, {
    upgrade(database, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        database.createObjectStore('comparisons', { keyPath: 'id' });
        database.createObjectStore('images', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        database.createObjectStore('projects', { keyPath: 'id' });
        if (oldVersion >= 1) void moveIntoDefaultProject(tx);
      }
    },
  });
  return dbPromise;
}

/** Version 1 had no projects: put any existing comparisons into "My home". */
async function moveIntoDefaultProject(
  tx: IDBPTransaction<SliderDB, StoreNames<SliderDB>[], 'versionchange'>,
) {
  const comparisons = await tx.objectStore('comparisons').getAll();
  if (comparisons.length === 0) return;
  const project: Project = {
    id: newId(),
    name: DEFAULT_PROJECT_NAME,
    notes: '',
    createdAt: Math.min(...comparisons.map((c) => c.createdAt)),
    // Not a real change, so it shouldn't trigger the "not backed up" reminder.
    updatedAt: Math.max(...comparisons.map((c) => c.updatedAt)),
  };
  await tx.objectStore('projects').put(project);
  for (const c of comparisons) await tx.objectStore('comparisons').put({ ...c, projectId: project.id });
}

export function newId() {
  return crypto.randomUUID();
}

const byCreated = <T extends { createdAt: number }>(a: T, b: T) => a.createdAt - b.createdAt;

/* ---------- Projects ---------- */

export async function listProjects(): Promise<Project[]> {
  return (await (await db()).getAll('projects')).sort(byCreated);
}

export async function getProject(id: string) {
  return (await db()).get('projects', id);
}

export async function saveProject(project: Project) {
  await (await db()).put('projects', project);
}

/** Finds a project by name, creating it if needed (used when restoring older backups). */
export async function getOrCreateProject(name: string): Promise<Project> {
  const existing = (await listProjects()).find((p) => p.name === name);
  if (existing) return existing;
  const now = Date.now();
  const project: Project = { id: newId(), name, notes: '', createdAt: now, updatedAt: now };
  await saveProject(project);
  return project;
}

/** Deletes a project together with all of its comparisons and their photos. */
export async function deleteProject(id: string) {
  const tx = (await db()).transaction(['projects', 'comparisons', 'images'], 'readwrite');
  for (const c of await tx.objectStore('comparisons').getAll()) {
    if (c.projectId !== id) continue;
    await tx.objectStore('images').delete(c.beforeImageId);
    await tx.objectStore('images').delete(c.afterImageId);
    await tx.objectStore('comparisons').delete(c.id);
  }
  await tx.objectStore('projects').delete(id);
  await tx.done;
}

/* ---------- Comparisons ---------- */

/** All comparisons, oldest first — or only those in one project. */
export async function listComparisons(projectId?: string): Promise<Comparison[]> {
  const all = await (await db()).getAll('comparisons');
  return all.filter((c) => !projectId || c.projectId === projectId).sort(byCreated);
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

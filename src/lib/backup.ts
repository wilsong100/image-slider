import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import {
  DEFAULT_PROJECT_NAME,
  getComparison,
  getImage,
  getOrCreateProject,
  getProject,
  listComparisons,
  listProjects,
  saveComparison,
  saveProject,
} from './db';
import type { Comparison, Project, StoredImage } from './types';

const APP = 'then-and-now';
/** 1: comparisons only. 2: adds projects. */
const VERSION = 2;
const LAST_BACKUP_KEY = 'then-and-now:lastBackupAt';

type BackupManifest = {
  app: typeof APP;
  version: number;
  exportedAt: string;
  projects?: Project[];
  /** Version 1 backups have no projectId. */
  comparisons: (Omit<Comparison, 'projectId'> & { projectId?: string })[];
  images: { id: string; width: number; height: number }[];
};

export class BackupError extends Error {}

const photoPath = (id: string) => `photos/${id}.jpg`;
const thumbPath = (id: string) => `thumbs/${id}.jpg`;

async function bytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Packs every project, comparison and photo into a single .zip file. */
export async function createBackup(): Promise<{ blob: Blob; count: number; projects: number }> {
  const projects = await listProjects();
  const comparisons = await listComparisons();
  const files: Zippable = {};
  const images: BackupManifest['images'] = [];

  for (const c of comparisons) {
    for (const id of [c.beforeImageId, c.afterImageId]) {
      const image = await getImage(id);
      if (!image) continue;
      images.push({ id, width: image.width, height: image.height });
      files[photoPath(id)] = await bytes(image.blob);
      files[thumbPath(id)] = await bytes(image.thumb);
    }
  }

  const manifest: BackupManifest = {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    comparisons,
    images,
  };
  files['backup.json'] = strToU8(JSON.stringify(manifest, null, 2));

  // Photos are already JPEG-compressed, so store them as-is (level 0) for speed.
  const zipped = zipSync(files, { level: 0 });
  return {
    blob: new Blob([zipped as BlobPart], { type: 'application/zip' }),
    count: comparisons.length,
    projects: projects.length,
  };
}

/**
 * Loads a backup file. Projects and comparisons are merged in: ones already on
 * this device (same id) are overwritten with the backed-up version, others are
 * added, and nothing that isn't in the backup is removed. Comparisons from
 * older backups without projects go into "My home".
 */
export async function restoreBackup(
  file: Blob,
): Promise<{ added: number; updated: number; exportedAt: number }> {
  let entries: Record<string, Uint8Array>;
  let manifest: BackupManifest;
  try {
    entries = unzipSync(await bytes(file));
    manifest = JSON.parse(strFromU8(entries['backup.json']));
  } catch {
    throw new BackupError('This isn’t a Then & Now backup file.');
  }
  if (manifest?.app !== APP || !Array.isArray(manifest.comparisons)) {
    throw new BackupError('This isn’t a Then & Now backup file.');
  }
  if (manifest.version > VERSION) {
    throw new BackupError('This backup was made by a newer version of the app. Reload the page and try again.');
  }

  const sizes = new Map(manifest.images.map((i) => [i.id, i]));
  const toImage = (id: string): StoredImage => {
    const photo = entries[photoPath(id)];
    const thumb = entries[thumbPath(id)];
    const size = sizes.get(id);
    if (!photo || !thumb || !size) throw new BackupError('This backup file is incomplete or damaged.');
    return {
      id,
      blob: new Blob([photo as BlobPart], { type: 'image/jpeg' }),
      thumb: new Blob([thumb as BlobPart], { type: 'image/jpeg' }),
      width: size.width,
      height: size.height,
    };
  };

  // Check the whole file before writing anything, so a damaged backup changes nothing.
  const prepared = manifest.comparisons.map((c) => ({
    comparison: c,
    images: [toImage(c.beforeImageId), toImage(c.afterImageId)],
  }));

  const projects = Array.isArray(manifest.projects) ? manifest.projects : [];
  for (const project of projects) {
    // Keep whichever copy of a project was edited most recently.
    const existing = await getProject(project.id);
    if (!existing || existing.updatedAt <= project.updatedAt) await saveProject(project);
  }
  const knownProjects = new Set(projects.map((p) => p.id));
  let fallback: Project | undefined;

  let added = 0;
  let updated = 0;
  for (const { comparison, images } of prepared) {
    let projectId = comparison.projectId;
    if (!projectId || !(knownProjects.has(projectId) || (await getProject(projectId)))) {
      fallback ??= await getOrCreateProject(DEFAULT_PROJECT_NAME);
      projectId = fallback.id;
    }
    if (await getComparison(comparison.id)) updated++;
    else added++;
    await saveComparison({ ...comparison, projectId }, images);
  }
  return { added, updated, exportedAt: Date.parse(manifest.exportedAt) || 0 };
}

export function backupFileName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `then-and-now-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function getLastBackupAt(): number | undefined {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function setLastBackupAt(time = Date.now()) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(time));
  } catch {
    // Storage unavailable (e.g. some private modes) — the reminder just won't be remembered.
  }
}

/** True when there is something on this device (comparisons or projects) that isn't in the latest backup. */
export function needsBackup(records: { updatedAt: number }[], lastBackupAt = getLastBackupAt()) {
  if (records.length === 0) return false;
  if (!lastBackupAt) return true;
  return records.some((r) => r.updatedAt > lastBackupAt);
}

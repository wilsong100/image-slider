import { strToU8, zipSync } from 'fflate';
import { backupFileName, createBackup, needsBackup, restoreBackup } from './backup';
import {
  deleteProject,
  getImage,
  getProject,
  listComparisons,
  listProjects,
  saveComparison,
  saveProject,
} from './db';
import type { Comparison, Project, StoredImage } from './types';

const image = (id: string, content: string): StoredImage => ({
  id,
  blob: new Blob([content], { type: 'image/jpeg' }),
  thumb: new Blob([`thumb-${content}`], { type: 'image/jpeg' }),
  width: 400,
  height: 300,
});
const project = (id: string, name = `House ${id}`): Project => ({ id, name, notes: '', createdAt: 1, updatedAt: 1 });
const comparison = (id: string, projectId = 'h1', updatedAt = 1): Comparison => ({
  id,
  projectId,
  title: `Room ${id}`,
  room: 'Kitchen',
  notes: 'New units',
  beforeImageId: `${id}-b`,
  afterImageId: `${id}-a`,
  createdAt: 1,
  updatedAt,
});
const addComparison = (id: string, projectId = 'h1') =>
  saveComparison(comparison(id, projectId), [image(`${id}-b`, `before-${id}`), image(`${id}-a`, `after-${id}`)]);

async function clearAll() {
  for (const p of await listProjects()) await deleteProject(p.id);
  expect(await listComparisons()).toHaveLength(0);
}

describe('backup', () => {
  beforeEach(clearAll);

  it('round-trips projects, comparisons and photos through a backup file', async () => {
    await saveProject(project('h1', 'Maple Street'));
    await saveProject(project('h2', 'Cottage'));
    await addComparison('x', 'h1');
    await addComparison('y', 'h2');

    const { blob, count, projects } = await createBackup();
    expect([count, projects]).toEqual([2, 2]);

    await clearAll();
    expect(await restoreBackup(blob)).toMatchObject({ added: 2, updated: 0 });
    expect((await listProjects()).map((p) => p.name)).toEqual(['Maple Street', 'Cottage']);
    expect((await listComparisons('h2')).map((c) => c.title)).toEqual(['Room y']);
    const photo = await getImage('x-b');
    expect(await photo!.blob.text()).toBe('before-x');
    expect(await photo!.thumb.text()).toBe('thumb-before-x');
    expect(photo!.width).toBe(400);
  });

  it('merges into existing data and counts updates', async () => {
    await saveProject(project('h1'));
    await addComparison('x');
    const { blob } = await createBackup();
    await addComparison('z');

    expect(await restoreBackup(blob)).toMatchObject({ added: 0, updated: 1 });
    expect(await listComparisons()).toHaveLength(2);
  });

  it('keeps the newer copy of a project', async () => {
    await saveProject(project('h1', 'Old name'));
    const { blob } = await createBackup();
    await saveProject({ ...project('h1', 'New name'), updatedAt: Date.now() + 1000 });
    await restoreBackup(blob);
    expect((await getProject('h1'))!.name).toBe('New name');
  });

  it('puts comparisons from older backups (no projects) into "My home"', async () => {
    const legacy = { ...comparison('old'), projectId: undefined };
    const zip = zipSync({
      'backup.json': strToU8(
        JSON.stringify({
          app: 'then-and-now',
          version: 1,
          exportedAt: new Date().toISOString(),
          comparisons: [legacy],
          images: [
            { id: 'old-b', width: 4, height: 3 },
            { id: 'old-a', width: 4, height: 3 },
          ],
        }),
      ),
      'photos/old-b.jpg': strToU8('b'),
      'thumbs/old-b.jpg': strToU8('tb'),
      'photos/old-a.jpg': strToU8('a'),
      'thumbs/old-a.jpg': strToU8('ta'),
    });
    expect(await restoreBackup(new Blob([zip as BlobPart]))).toMatchObject({ added: 1 });
    const [home] = await listProjects();
    expect(home.name).toBe('My home');
    expect((await listComparisons(home.id)).map((c) => c.id)).toEqual(['old']);
  });

  it('rejects files that are not backups, and damaged backups, without changing anything', async () => {
    await expect(restoreBackup(new Blob(['hello']))).rejects.toThrow('isn’t a Then & Now backup');

    const damaged = zipSync({
      'backup.json': strToU8(
        JSON.stringify({ app: 'then-and-now', version: 2, exportedAt: '', projects: [], comparisons: [comparison('q')], images: [] }),
      ),
    });
    await expect(restoreBackup(new Blob([damaged as BlobPart]))).rejects.toThrow('incomplete or damaged');
    expect(await listComparisons()).toHaveLength(0);
  });
});

describe('deleteProject', () => {
  beforeEach(clearAll);

  it('removes the project with its comparisons and photos, leaving other projects alone', async () => {
    await saveProject(project('h1'));
    await saveProject(project('h2'));
    await addComparison('x', 'h1');
    await addComparison('y', 'h2');
    await deleteProject('h1');
    expect((await listProjects()).map((p) => p.id)).toEqual(['h2']);
    expect((await listComparisons()).map((c) => c.id)).toEqual(['y']);
    expect(await getImage('x-b')).toBeUndefined();
    expect(await getImage('y-b')).toBeDefined();
  });
});

describe('needsBackup', () => {
  it('is true when there are changes since the last backup', () => {
    expect(needsBackup([])).toBe(false);
    expect(needsBackup([comparison('a', 'h1', 100)], undefined)).toBe(true);
    expect(needsBackup([comparison('a', 'h1', 100)], 200)).toBe(false);
    expect(needsBackup([comparison('a', 'h1', 300)], 200)).toBe(true);
  });
});

it('names backup files by date', () => {
  expect(backupFileName(new Date(2026, 8, 5))).toBe('then-and-now-backup-2026-09-05.zip');
});

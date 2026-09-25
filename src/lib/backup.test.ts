import { strToU8, zipSync } from 'fflate';
import { backupFileName, createBackup, needsBackup, restoreBackup } from './backup';
import { deleteComparison, getImage, listComparisons, saveComparison } from './db';
import type { Comparison, StoredImage } from './types';

const image = (id: string, content: string): StoredImage => ({
  id,
  blob: new Blob([content], { type: 'image/jpeg' }),
  thumb: new Blob([`thumb-${content}`], { type: 'image/jpeg' }),
  width: 400,
  height: 300,
});
const comparison = (id: string, updatedAt = 1): Comparison => ({
  id,
  title: `Room ${id}`,
  room: 'Kitchen',
  notes: 'New units',
  beforeImageId: `${id}-b`,
  afterImageId: `${id}-a`,
  createdAt: 1,
  updatedAt,
});

async function clearAll() {
  for (const c of await listComparisons()) await deleteComparison(c.id);
}

describe('backup', () => {
  beforeEach(clearAll);

  it('round-trips comparisons and photos through a backup file', async () => {
    await saveComparison(comparison('x'), [image('x-b', 'before'), image('x-a', 'after')]);
    await saveComparison(comparison('y'), [image('y-b', 'b2'), image('y-a', 'a2')]);

    const { blob, count } = await createBackup();
    expect(count).toBe(2);

    await clearAll();
    expect(await listComparisons()).toHaveLength(0);

    expect(await restoreBackup(blob)).toMatchObject({ added: 2, updated: 0 });
    const restored = await listComparisons();
    expect(restored.map((c) => c.title)).toEqual(['Room x', 'Room y']);
    const photo = await getImage('x-b');
    expect(await photo!.blob.text()).toBe('before');
    expect(await photo!.thumb.text()).toBe('thumb-before');
    expect(photo!.width).toBe(400);
  });

  it('merges into existing data and counts updates', async () => {
    await saveComparison(comparison('x'), [image('x-b', 'before'), image('x-a', 'after')]);
    const { blob } = await createBackup();
    await saveComparison(comparison('z'), [image('z-b', 'b'), image('z-a', 'a')]);

    expect(await restoreBackup(blob)).toMatchObject({ added: 0, updated: 1 });
    expect(await listComparisons()).toHaveLength(2);
  });

  it('rejects files that are not backups, and damaged backups, without changing anything', async () => {
    await expect(restoreBackup(new Blob(['hello']))).rejects.toThrow('isn’t a Then & Now backup');

    const damaged = zipSync({
      'backup.json': strToU8(
        JSON.stringify({ app: 'then-and-now', version: 1, exportedAt: '', comparisons: [comparison('q')], images: [] }),
      ),
    });
    await expect(restoreBackup(new Blob([damaged as BlobPart]))).rejects.toThrow('incomplete or damaged');
    expect(await listComparisons()).toHaveLength(0);
  });
});

describe('needsBackup', () => {
  it('is true when there are changes since the last backup', () => {
    expect(needsBackup([])).toBe(false);
    expect(needsBackup([comparison('a', 100)], undefined)).toBe(true);
    expect(needsBackup([comparison('a', 100)], 200)).toBe(false);
    expect(needsBackup([comparison('a', 300)], 200)).toBe(true);
  });
});

it('names backup files by date', () => {
  expect(backupFileName(new Date(2026, 8, 5))).toBe('then-and-now-backup-2026-09-05.zip');
});

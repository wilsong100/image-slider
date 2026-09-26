import { deleteComparison, getImage, listComparisons, saveComparison } from './db';
import { fitWithin } from './image';
import { parseRoute } from './router';
import { groupByRoom } from '../pages/Gallery';
import type { Comparison, StoredImage } from './types';

const image = (id: string): StoredImage => ({ id, blob: new Blob(['x']), thumb: new Blob(['t']), width: 4, height: 3 });
const comparison = (over: Partial<Comparison> = {}): Comparison => ({
  id: 'c1',
  title: 'Kitchen',
  room: 'Kitchen',
  notes: '',
  beforeImageId: 'b1',
  afterImageId: 'a1',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('fitWithin', () => {
  it('scales large landscape and portrait images down to the max edge', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });
  it('never scales small images up', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

describe('parseRoute', () => {
  it('maps hashes to routes', () => {
    expect(parseRoute('')).toEqual({ name: 'gallery' });
    expect(parseRoute('#/')).toEqual({ name: 'gallery' });
    expect(parseRoute('#/new')).toEqual({ name: 'new' });
    expect(parseRoute('#/backup')).toEqual({ name: 'backup' });
    expect(parseRoute('#/c/abc')).toEqual({ name: 'view', id: 'abc' });
    expect(parseRoute('#/c/abc/edit')).toEqual({ name: 'edit', id: 'abc' });
    expect(parseRoute('#/c/abc/align')).toEqual({ name: 'align', id: 'abc' });
    expect(parseRoute('#/nonsense')).toEqual({ name: 'gallery' });
  });
});

describe('groupByRoom', () => {
  it('groups by room in first-seen order, with blank rooms under "Other"', () => {
    const groups = groupByRoom([
      comparison({ id: '1', room: 'Kitchen' }),
      comparison({ id: '2', room: '' }),
      comparison({ id: '3', room: 'Kitchen ' }),
    ]);
    expect(groups.map(([room, list]) => [room, list.map((c) => c.id)])).toEqual([
      ['Kitchen', ['1', '3']],
      ['Other', ['2']],
    ]);
  });
});

describe('database', () => {
  it('saves, replaces images without leaking the old ones, and deletes everything', async () => {
    await saveComparison(comparison(), [image('b1'), image('a1')]);
    expect(await listComparisons()).toHaveLength(1);

    await saveComparison(comparison({ afterImageId: 'a2' }), [image('a2')]);
    expect(await getImage('a1')).toBeUndefined();
    expect(await getImage('a2')).toBeDefined();
    expect(await getImage('b1')).toBeDefined();

    await deleteComparison('c1');
    expect(await listComparisons()).toHaveLength(0);
    expect(await getImage('b1')).toBeUndefined();
    expect(await getImage('a2')).toBeUndefined();
  });
});

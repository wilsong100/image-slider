import { openDB } from 'idb';

// Runs in its own test file, so it gets a fresh fake IndexedDB.
it('moves comparisons saved before projects existed into "My home"', async () => {
  const v1 = await openDB('before-after', 1, {
    upgrade(database) {
      database.createObjectStore('comparisons', { keyPath: 'id' });
      database.createObjectStore('images', { keyPath: 'id' });
    },
  });
  for (const [id, createdAt] of [['a', 10], ['b', 20]] as const) {
    await v1.put('comparisons', {
      id,
      title: id,
      room: 'Kitchen',
      notes: '',
      beforeImageId: `${id}-b`,
      afterImageId: `${id}-a`,
      createdAt,
      updatedAt: createdAt + 5,
    });
  }
  v1.close();

  const { listComparisons, listProjects } = await import('./db');
  const projects = await listProjects();
  expect(projects).toHaveLength(1);
  expect(projects[0]).toMatchObject({ name: 'My home', createdAt: 10, updatedAt: 25 });
  const comparisons = await listComparisons(projects[0].id);
  expect(comparisons.map((c) => c.id)).toEqual(['a', 'b']);
});

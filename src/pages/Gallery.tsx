import { useEffect, useState } from 'react';
import { needsBackup } from '../lib/backup';
import { listComparisons } from '../lib/db';
import { PhotoLayers } from '../components/PhotoLayers';
import { useImage, useImageUrl } from '../lib/hooks';
import { href } from '../lib/router';
import type { Comparison } from '../lib/types';

export function groupByRoom(items: Comparison[]) {
  const groups = new Map<string, Comparison[]>();
  for (const item of items) {
    const room = item.room.trim() || 'Other';
    groups.set(room, [...(groups.get(room) ?? []), item]);
  }
  return [...groups.entries()];
}

function Card({ comparison }: { comparison: Comparison }) {
  const before = useImage(comparison.beforeImageId, 'thumb');
  const after = useImageUrl(comparison.afterImageId, 'thumb');
  return (
    <a className="card" href={href.view(comparison.id)}>
      <div className="card__media">
        {before && (
          <PhotoLayers beforeSrc={before.url} afterSrc={after} aspect={before.aspect} alignment={comparison.alignment} decorative />
        )}
        <span className="card__seam" aria-hidden="true" />
      </div>
      <div className="card__body">
        <h3 className="card__title">{comparison.title || 'Untitled'}</h3>
        {comparison.notes && <p className="card__notes">{comparison.notes}</p>}
      </div>
    </a>
  );
}

export function Gallery() {
  const [items, setItems] = useState<Comparison[]>();
  useEffect(() => {
    listComparisons().then(setItems);
  }, []);

  if (!items) return <div className="page" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="page empty">
        <div className="empty__art" aria-hidden="true">
          <span />
          <span />
        </div>
        <h1 className="display">Show off the transformation</h1>
        <p className="lede">
          Add a before and an after photo of the same spot, then drag the slider to see how far
          it’s come.
        </p>
        <a className="btn btn--primary" href={href.new()}>
          Add your first comparison
        </a>
        <p className="fine-print">Photos are stored privately in this browser on this device.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">{items.length} {items.length === 1 ? 'comparison' : 'comparisons'}</p>
          <h1 className="display">Before &amp; after</h1>
        </div>
        <a className="btn btn--primary" href={href.new()}>
          + New comparison
        </a>
      </div>
      {needsBackup(items) && (
        <div className="notice" role="status">
          <span>You have changes that aren’t in a backup yet. Your photos are only stored in this browser.</span>
          <a className="btn btn--ghost" href={href.backup()}>
            Back up now
          </a>
        </div>
      )}
      {groupByRoom(items).map(([room, list]) => (
        <section key={room} className="room">
          <h2 className="room__title">{room}</h2>
          <div className="grid">
            {list.map((c) => (
              <Card key={c.id} comparison={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

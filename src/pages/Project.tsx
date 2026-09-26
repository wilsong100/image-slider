import { useEffect, useState } from 'react';
import { PhotoLayers } from '../components/PhotoLayers';
import { getProject, listComparisons } from '../lib/db';
import { useImage, useImageUrl } from '../lib/hooks';
import { href, navigate } from '../lib/router';
import type { Comparison, Project as ProjectType } from '../lib/types';

export function groupByRoom(items: Comparison[]) {
  const groups = new Map<string, Comparison[]>();
  for (const item of items) {
    const room = item.room.trim() || 'Other';
    groups.set(room, [...(groups.get(room) ?? []), item]);
  }
  return [...groups.entries()];
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The split before/after preview used on cards. */
export function SplitPreview({ comparison }: { comparison: Comparison }) {
  const before = useImage(comparison.beforeImageId, 'thumb');
  const after = useImageUrl(comparison.afterImageId, 'thumb');
  return (
    <div className="card__media">
      {before && (
        <PhotoLayers beforeSrc={before.url} afterSrc={after} aspect={before.aspect} alignment={comparison.alignment} decorative />
      )}
      <span className="card__seam" aria-hidden="true" />
    </div>
  );
}

function Card({ comparison }: { comparison: Comparison }) {
  return (
    <a className="card" href={href.view(comparison.id)}>
      <SplitPreview comparison={comparison} />
      <div className="card__body">
        <h3 className="card__title">{comparison.title || 'Untitled'}</h3>
        {comparison.notes && <p className="card__notes">{comparison.notes}</p>}
      </div>
    </a>
  );
}

export function Project({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectType>();
  const [items, setItems] = useState<Comparison[]>();

  useEffect(() => {
    getProject(id).then((p) => {
      if (!p) return navigate(href.home());
      setProject(p);
      listComparisons(id).then(setItems);
    });
  }, [id]);

  if (!project || !items) return <div className="page" aria-busy="true" />;

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <a className="back" href={href.home()}>
            ← All projects
          </a>
          <p className="eyebrow">{plural(items.length, 'comparison')}</p>
          <h1 className="display">{project.name}</h1>
          {project.notes && <p className="project__notes">{project.notes}</p>}
        </div>
        <div className="page__actions">
          <a className="btn btn--ghost" href={href.projectEdit(project.id)}>
            Edit project
          </a>
          {items.length > 0 && (
            <a className="btn btn--primary" href={href.new(project.id)}>
              + New comparison
            </a>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty empty--inline">
          <div className="empty__art" aria-hidden="true">
            <span />
            <span />
          </div>
          <h2 className="display display--sm">Show off the transformation</h2>
          <p className="lede">
            Add a before and an after photo of the same spot, then drag the slider to see how far
            it’s come.
          </p>
          <a className="btn btn--primary" href={href.new(project.id)}>
            Add your first comparison
          </a>
        </div>
      ) : (
        groupByRoom(items).map(([room, list]) => (
          <section key={room} className="room">
            <h2 className="room__title">{room}</h2>
            <div className="grid">
              {list.map((c) => (
                <Card key={c.id} comparison={c} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

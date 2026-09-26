import { useEffect, useState } from 'react';
import { needsBackup } from '../lib/backup';
import { listComparisons, listProjects } from '../lib/db';
import { href } from '../lib/router';
import type { Comparison, Project } from '../lib/types';
import { plural, SplitPreview } from './Project';

function ProjectCard({ project, comparisons }: { project: Project; comparisons: Comparison[] }) {
  const rooms = new Set(comparisons.map((c) => c.room.trim()).filter(Boolean)).size;
  const cover = comparisons[0];
  return (
    <a className="card card--project" href={href.project(project.id)}>
      {cover ? (
        <SplitPreview comparison={cover} />
      ) : (
        <div className="card__media card__media--empty" aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      <div className="card__body">
        <h3 className="card__title card__title--lg">{project.name}</h3>
        <p className="card__meta">
          {comparisons.length ? plural(comparisons.length, 'comparison') : 'No comparisons yet'}
          {rooms > 0 && ` · ${plural(rooms, 'room')}`}
        </p>
        {project.notes && <p className="card__notes">{project.notes}</p>}
      </div>
    </a>
  );
}

export function Projects() {
  const [data, setData] = useState<{ projects: Project[]; comparisons: Comparison[] }>();
  useEffect(() => {
    Promise.all([listProjects(), listComparisons()]).then(([projects, comparisons]) =>
      setData({ projects, comparisons }),
    );
  }, []);

  if (!data) return <div className="page" aria-busy="true" />;
  const { projects, comparisons } = data;

  if (projects.length === 0) {
    return (
      <div className="page empty">
        <div className="empty__art" aria-hidden="true">
          <span />
          <span />
        </div>
        <h1 className="display">Show off the transformation</h1>
        <p className="lede">
          Start with a project for your home, then add before and after photos of each room and
          drag the slider to see how far it’s come.
        </p>
        <a className="btn btn--primary" href={href.projectNew()}>
          Create your first project
        </a>
        <p className="fine-print">Photos are stored privately in this browser on this device.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">{plural(projects.length, 'project')}</p>
          <h1 className="display">Your projects</h1>
        </div>
        <a className="btn btn--primary" href={href.projectNew()}>
          + New project
        </a>
      </div>
      {needsBackup([...projects, ...comparisons]) && comparisons.length > 0 && (
        <div className="notice" role="status">
          <span>You have changes that aren’t in a backup yet. Your photos are only stored in this browser.</span>
          <a className="btn btn--ghost" href={href.backup()}>
            Back up now
          </a>
        </div>
      )}
      <div className="grid grid--projects">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} comparisons={comparisons.filter((c) => c.projectId === p.id)} />
        ))}
      </div>
    </div>
  );
}

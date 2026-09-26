import { useEffect, useRef, useState } from 'react';
import { CompareSlider } from '../components/CompareSlider';
import { deleteComparison, getImage, getProject, listComparisons } from '../lib/db';
import { formatDay, formatMonthYear, timeBetween } from '../lib/dates';
import { useImageUrl } from '../lib/hooks';
import { href, navigate } from '../lib/router';
import type { Comparison, Project } from '../lib/types';

export function Viewer({ id }: { id: string }) {
  // Comparisons in the same project, for previous/next.
  const [all, setAll] = useState<Comparison[]>();
  const [project, setProject] = useState<Project>();
  const [ratio, setRatio] = useState<number>();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listComparisons().then((list) => {
      const projectId = list.find((c) => c.id === id)?.projectId;
      setAll(list.filter((c) => c.projectId === projectId));
      if (projectId) getProject(projectId).then(setProject);
    });
  }, [id]);

  const index = all?.findIndex((c) => c.id === id) ?? -1;
  const comparison = all?.[index];
  const prev = all && index > 0 ? all[index - 1] : undefined;
  const next = all && index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;

  const before = useImageUrl(comparison?.beforeImageId);
  const after = useImageUrl(comparison?.afterImageId);

  useEffect(() => {
    if (!comparison) return;
    getImage(comparison.beforeImageId).then((img) => img && setRatio(img.width / img.height));
  }, [comparison]);

  useEffect(() => {
    if (all && !comparison) navigate(href.home());
  }, [all, comparison]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [role="slider"]')) return;
      if (e.key === 'ArrowLeft' && prev) navigate(href.view(prev.id));
      if (e.key === 'ArrowRight' && next) navigate(href.view(next.id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  if (!comparison) return <div className="page" aria-busy="true" />;

  const onDelete = async () => {
    if (!window.confirm(`Delete “${comparison.title}”? This can’t be undone.`)) return;
    await deleteComparison(comparison.id);
    navigate(href.project(comparison.projectId));
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  };

  return (
    <div className="page viewer">
      <div className="page__head">
        <div>
          <a className="back" href={href.project(comparison.projectId)}>
            ← {project?.name ?? 'Back'}
          </a>
          {comparison.room && <p className="eyebrow">{comparison.room}</p>}
          <h1 className="display">{comparison.title}</h1>
        </div>
        <div className="viewer__tools">
          <button className="btn btn--ghost" type="button" onClick={toggleFullscreen}>
            Full screen
          </button>
          <a className="btn btn--ghost" href={href.align(comparison.id)}>
            Line up
          </a>
          <a className="btn btn--ghost" href={href.export(comparison.id)}>
            Export
          </a>
          <a className="btn btn--ghost" href={href.edit(comparison.id)}>
            Edit
          </a>
          <button className="btn btn--ghost btn--danger" type="button" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="viewer__stage" ref={stageRef} style={{ ['--ratio' as string]: ratio ?? 4 / 3 }}>
        <CompareSlider
          key={comparison.id}
          beforeSrc={before}
          afterSrc={after}
          aspectRatio={ratio}
          alignment={comparison.alignment}
          beforeLabel={['Before', formatMonthYear(comparison.beforeDate)].filter(Boolean).join(' · ')}
          afterLabel={['After', formatMonthYear(comparison.afterDate)].filter(Boolean).join(' · ')}
        />
      </div>
      {(comparison.beforeDate || comparison.afterDate) && (
        <p className="viewer__dates">
          <span>{formatDay(comparison.beforeDate) || 'Unknown date'}</span>
          <span aria-hidden="true">→</span>
          <span>{formatDay(comparison.afterDate) || 'Unknown date'}</span>
          {timeBetween(comparison.beforeDate, comparison.afterDate) && (
            <strong>{timeBetween(comparison.beforeDate, comparison.afterDate)}</strong>
          )}
        </p>
      )}
      <p className="hint viewer__hint">Drag the handle, or use the arrow keys once it’s selected.</p>

      {comparison.notes && <p className="viewer__notes">{comparison.notes}</p>}

      <nav className="viewer__nav" aria-label="Other comparisons">
        {prev ? (
          <a className="btn btn--ghost" href={href.view(prev.id)}>
            ← {prev.title}
          </a>
        ) : (
          <span />
        )}
        <span className="viewer__count">
          {index + 1} / {all?.length}
        </span>
        {next ? (
          <a className="btn btn--ghost" href={href.view(next.id)}>
            {next.title} →
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

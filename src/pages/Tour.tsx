import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { CompareSlider } from '../components/CompareSlider';
import { formatMonthYear, timeBetween } from '../lib/dates';
import { getProject, listComparisons } from '../lib/db';
import { useImage, useImageUrl } from '../lib/hooks';
import { href, navigate } from '../lib/router';
import { positionAt, TOUR_PHASES, totalMs } from '../lib/timeline';
import type { Comparison, Project } from '../lib/types';
import { groupByRoom } from './Project';

const SLIDE_MS = totalMs(TOUR_PHASES);
const IDLE_MS = 2500;

/** Loads the next slide's photos ahead of time so it appears instantly. */
function Preload({ comparison }: { comparison?: Comparison }) {
  useImageUrl(comparison?.beforeImageId);
  useImageUrl(comparison?.afterImageId);
  return null;
}

export function Tour({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project>();
  const [items, setItems] = useState<Comparison[]>();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Time into the current slide; the slider position is derived from it.
  const [clock, setClock] = useState(0);
  const [idle, setIdle] = useState(false);
  const elapsed = useRef(0);
  const position = positionAt(TOUR_PHASES, clock);

  useEffect(() => {
    getProject(projectId).then((p) => {
      if (!p) return navigate(href.home());
      setProject(p);
      listComparisons(projectId).then((list) => {
        // Same order as the project page: room by room.
        const ordered = groupByRoom(list).flatMap(([, group]) => group);
        if (!ordered.length) return navigate(href.project(projectId));
        setItems(ordered);
      });
    });
  }, [projectId]);

  const current = items?.[index];
  const before = useImage(current?.beforeImageId);
  const after = useImageUrl(current?.afterImageId);
  const ready = Boolean(before && after);

  const go = useCallback(
    (delta: number) => {
      if (!items) return;
      elapsed.current = 0;
      setClock(0);
      setIndex((i) => (i + delta + items.length) % items.length);
    },
    [items],
  );

  // Drive the sweep; the clock only runs while playing and the photos are loaded.
  useEffect(() => {
    if (!playing || !ready) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= SLIDE_MS) return go(1);
      setClock(elapsed.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready, go, index]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    navigate(href.project(projectId));
  }, [projectId]);

  // Keyboard: space = pause, arrows = previous/next, Esc = leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape' && !document.fullscreenElement) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, exit]);

  // Hide the controls and cursor when the mouse/finger hasn't moved for a while.
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  // Keep the screen awake (e.g. when showing on a TV or tablet).
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  if (!project || !items || !current) return <div className="tour" aria-busy="true" />;

  const gap = timeBetween(current.beforeDate, current.afterDate);
  const dates = [formatMonthYear(current.beforeDate), formatMonthYear(current.afterDate)].filter(Boolean).join(' → ');

  return (
    <div className={`tour ${idle && playing ? 'is-idle' : ''}`}>
      <Preload comparison={items[(index + 1) % items.length]} />
      <div className="tour__stage" style={{ ['--ratio' as string]: before?.aspect ?? 4 / 3 } as CSSProperties}>
        <div className="tour__slide" key={current.id}>
          <CompareSlider
            beforeSrc={before?.url}
            afterSrc={after}
            aspectRatio={before?.aspect}
            alignment={current.alignment}
            position={position}
            beforeLabel={['Before', formatMonthYear(current.beforeDate)].filter(Boolean).join(' · ')}
            afterLabel={['After', formatMonthYear(current.afterDate)].filter(Boolean).join(' · ')}
          />
          <div className="tour__caption">
            {current.room && <p className="tour__room">{current.room}</p>}
            <h1 className="tour__title">{current.title}</h1>
            {(dates || gap) && (
              <p className="tour__dates">
                {dates}
                {gap && <span> · {gap}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="tour__top">
        <span>{project.name}</span>
        <span className="tour__count">
          {index + 1} / {items.length}
        </span>
      </div>

      <div className="tour__progress" aria-hidden="true">
        {items.map((c, i) => (
          <span key={c.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''}>
            {i === index && <i style={{ width: `${(clock / SLIDE_MS) * 100}%` }} />}
          </span>
        ))}
      </div>

      <div className="tour__controls">
        <button type="button" onClick={() => go(-1)} aria-label="Previous">
          ‹
        </button>
        <button type="button" className="tour__play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next">
          ›
        </button>
        <button type="button" className="tour__exit" onClick={exit}>
          Exit tour
        </button>
      </div>
    </div>
  );
}

/** Starts a tour, going full screen first (browsers only allow that from a click). */
export function startTour(projectId: string) {
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigate(href.tour(projectId));
}

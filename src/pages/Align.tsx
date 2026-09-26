import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { afterTransform, clampAlignment, IDENTITY, isIdentity, LIMITS } from '../lib/alignment';
import { getComparison, saveComparison } from '../lib/db';
import { useImage, useImageUrl } from '../lib/hooks';
import { href, navigate } from '../lib/router';
import type { Alignment, Comparison } from '../lib/types';

const round = (v: number, places = 2) => Math.round(v * 10 ** places) / 10 ** places;

export function Align({ id }: { id: string }) {
  const [comparison, setComparison] = useState<Comparison>();
  const [alignment, setAlignment] = useState<Alignment>(IDENTITY);
  const [opacity, setOpacity] = useState(50);
  const [showGrid, setShowGrid] = useState(true);
  const [peek, setPeek] = useState(false);
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  // Active pointers, for dragging (one finger / mouse) and pinch-zoom (two fingers).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start: Alignment; x: number; y: number; dist: number; count: number } | undefined>(undefined);

  useEffect(() => {
    getComparison(id).then((c) => {
      if (!c) return navigate(href.gallery());
      setComparison(c);
      setAlignment(c.alignment ?? IDENTITY);
    });
  }, [id]);

  const before = useImage(comparison?.beforeImageId);
  const after = useImageUrl(comparison?.afterImageId);
  const aspect = before?.aspect ?? 4 / 3;

  const update = (patch: Partial<Alignment>) => setAlignment((a) => clampAlignment({ ...a, ...patch }));

  const beginGesture = () => {
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { start: alignment, x: cx, y: cy, dist, count: pts.length };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    beginGesture();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length !== g.count) return beginGesture();
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const patch: Partial<Alignment> = {
      x: g.start.x + ((cx - g.x) / rect.width) * 100,
      y: g.start.y + ((cy - g.y) / rect.height) * 100,
    };
    if (pts.length > 1 && g.dist > 0) {
      patch.scale = g.start.scale * (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / g.dist);
    }
    setAlignment(clampAlignment({ ...g.start, ...patch }));
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) beginGesture();
    else gesture.current = undefined;
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    update({ scale: alignment.scale * Math.exp(-e.deltaY * 0.001) });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 1 : 0.2;
    const moves: Record<string, Partial<Alignment>> = {
      ArrowLeft: { x: alignment.x - step },
      ArrowRight: { x: alignment.x + step },
      ArrowUp: { y: alignment.y - step },
      ArrowDown: { y: alignment.y + step },
      '+': { scale: alignment.scale * 1.005 },
      '=': { scale: alignment.scale * 1.005 },
      '-': { scale: alignment.scale / 1.005 },
      '[': { rotate: alignment.rotate - 0.1 },
      ']': { rotate: alignment.rotate + 0.1 },
    };
    if (e.key in moves) {
      e.preventDefault();
      update(moves[e.key]);
    }
  };

  const nudge = (dx: number, dy: number) => update({ x: alignment.x + dx, y: alignment.y + dy });

  const onSave = async () => {
    if (!comparison) return;
    setSaving(true);
    const clean: Alignment = {
      x: round(alignment.x),
      y: round(alignment.y),
      scale: round(alignment.scale, 4),
      rotate: round(alignment.rotate),
    };
    await saveComparison({
      ...comparison,
      alignment: isIdentity(clean) ? undefined : clean,
      updatedAt: Date.now(),
    });
    navigate(href.view(comparison.id));
  };

  if (!comparison) return <div className="page" aria-busy="true" />;

  return (
    <div className="page align">
      <div className="page__head">
        <div>
          <a className="back" href={href.view(comparison.id)}>
            ← Back
          </a>
          <p className="eyebrow">{comparison.title}</p>
          <h1 className="display">Line up photos</h1>
        </div>
      </div>
      <p className="hint align__hint">
        Drag the see-through after photo until something that hasn’t changed — a window, a door
        frame, a corner — sits exactly over the before photo. Pinch or scroll to zoom. Any gaps
        this leaves at the edges are trimmed automatically when you view it.
      </p>

      <div className="align__layout">
        <div className="align__stage">
          <div
            ref={frameRef}
            className="align__frame"
            style={{ ['--ratio' as string]: aspect, aspectRatio: String(aspect) } as CSSProperties}
            tabIndex={0}
            role="application"
            aria-label="Alignment area. Drag to move the after photo; arrow keys nudge, plus and minus zoom, square brackets rotate."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onWheel={onWheel}
            onKeyDown={onKeyDown}
          >
            {before && <img className="align__img" src={before.url} alt="Before" draggable={false} />}
            {after && (
              <img
                className="align__img"
                src={after}
                alt="After, see-through"
                draggable={false}
                style={{ opacity: peek ? 0 : opacity / 100, transform: afterTransform(alignment) }}
              />
            )}
            {showGrid && <div className="align__grid" aria-hidden="true" />}
          </div>
        </div>

        <div className="align__controls">
          <label className="range">
            <span className="range__label">
              See-through <output>{opacity}%</output>
            </span>
            <input type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>
          <label className="range">
            <span className="range__label">
              Zoom <output>{Math.round(alignment.scale * 100)}%</output>
            </span>
            <input
              type="range"
              min={LIMITS.scale.min}
              max={LIMITS.scale.max}
              step={0.001}
              value={alignment.scale}
              onChange={(e) => update({ scale: Number(e.target.value) })}
            />
          </label>
          <label className="range">
            <span className="range__label">
              Rotate <output>{alignment.rotate.toFixed(1)}°</output>
            </span>
            <input
              type="range"
              min={LIMITS.rotate.min}
              max={LIMITS.rotate.max}
              step={0.1}
              value={alignment.rotate}
              onChange={(e) => update({ rotate: Number(e.target.value) })}
            />
          </label>

          <div className="align__row">
            <div className="nudge" role="group" aria-label="Nudge after photo">
              <button type="button" className="nudge__btn nudge__up" onClick={() => nudge(0, -0.2)} aria-label="Nudge up">↑</button>
              <button type="button" className="nudge__btn nudge__left" onClick={() => nudge(-0.2, 0)} aria-label="Nudge left">←</button>
              <button type="button" className="nudge__btn nudge__right" onClick={() => nudge(0.2, 0)} aria-label="Nudge right">→</button>
              <button type="button" className="nudge__btn nudge__down" onClick={() => nudge(0, 0.2)} aria-label="Nudge down">↓</button>
            </div>
            <div className="align__toggles">
              <label className="check">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Grid lines
              </label>
              <button
                type="button"
                className="btn btn--ghost align__peek"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={() => setPeek(true)}
                onPointerUp={() => setPeek(false)}
                onPointerLeave={() => setPeek(false)}
                onKeyDown={(e) => e.key === ' ' && setPeek(true)}
                onKeyUp={() => setPeek(false)}
              >
                Hold to see before
              </button>
            </div>
          </div>

          <div className="align__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setAlignment(IDENTITY)} disabled={isIdentity(alignment)}>
              Reset
            </button>
            <a className="btn btn--ghost" href={href.view(comparison.id)}>
              Cancel
            </a>
            <button type="button" className="btn btn--primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

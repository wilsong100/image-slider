import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Alignment } from '../lib/types';
import { PhotoLayers } from './PhotoLayers';

type Props = {
  beforeSrc?: string;
  afterSrc?: string;
  /** width / height of the frame; defaults to 4:3 until images load. */
  aspectRatio?: number;
  initial?: number;
  /** Set to drive the handle from outside (e.g. tour mode); dragging is then disabled. */
  position?: number;
  alignment?: Alignment;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
};

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/**
 * Stacks two photos in the same frame. The "before" photo sits on top and is
 * clipped to the left of the handle, so dragging right reveals more "before".
 */
export function CompareSlider({
  beforeSrc,
  afterSrc,
  aspectRatio = 4 / 3,
  initial = 50,
  position: controlled,
  alignment,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [internal, setPosition] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const isControlled = controlled !== undefined;
  const position = controlled ?? internal;

  const moveTo = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isControlled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) moveTo(e.clientX);
  };
  const stop = () => setDragging(false);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isControlled) return;
    const step = e.shiftKey ? 10 : 2;
    const next: Record<string, number> = {
      ArrowLeft: position - step,
      ArrowDown: position - step,
      ArrowRight: position + step,
      ArrowUp: position + step,
      PageDown: position - 10,
      PageUp: position + 10,
      Home: 0,
      End: 100,
    };
    if (e.key in next) {
      e.preventDefault();
      setPosition(clamp(next[e.key]));
    }
  };

  return (
    <div
      ref={frameRef}
      className={`compare ${dragging ? 'is-dragging' : ''} ${isControlled ? 'is-controlled' : ''} ${className ?? ''}`}
      style={{ aspectRatio: String(aspectRatio), ['--pos' as string]: `${position}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <PhotoLayers beforeSrc={beforeSrc} afterSrc={afterSrc} aspect={aspectRatio} alignment={alignment} />
      <span className="compare__label compare__label--before" data-hidden={position < 20}>
        {beforeLabel}
      </span>
      <span className="compare__label compare__label--after" data-hidden={position > 80}>
        {afterLabel}
      </span>
      <div className="compare__divider" aria-hidden="true" />
      <div
        className="compare__handle"
        role="slider"
        tabIndex={0}
        aria-label="Reveal before or after photo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% before`}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

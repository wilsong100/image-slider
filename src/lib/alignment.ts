import type { CSSProperties } from 'react';
import type { Alignment } from './types';

export const IDENTITY: Alignment = { x: 0, y: 0, scale: 1, rotate: 0 };

export const LIMITS = {
  scale: { min: 0.5, max: 2 },
  rotate: { min: -15, max: 15 },
  offset: { min: -50, max: 50 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function clampAlignment(a: Alignment): Alignment {
  return {
    x: clamp(a.x, LIMITS.offset.min, LIMITS.offset.max),
    y: clamp(a.y, LIMITS.offset.min, LIMITS.offset.max),
    scale: clamp(a.scale, LIMITS.scale.min, LIMITS.scale.max),
    rotate: clamp(a.rotate, LIMITS.rotate.min, LIMITS.rotate.max),
  };
}

export function isIdentity(a: Alignment | undefined) {
  return !a || (a.x === 0 && a.y === 0 && a.scale === 1 && a.rotate === 0);
}

/** CSS transform that places the after photo; matches the maths in coverZoom. */
export function afterTransform(a: Alignment) {
  return `translate(${a.x}%, ${a.y}%) rotate(${a.rotate}deg) scale(${a.scale})`;
}

/**
 * Moving, rotating or shrinking the after photo can leave empty gaps at the
 * frame's edges. This finds the smallest zoom, applied equally to both photos
 * (so they stay lined up), that makes the after photo cover the whole frame.
 * `aspect` is the frame's width / height.
 */
export function coverZoom(a: Alignment | undefined, aspect: number, maxZoom = 4) {
  if (isIdentity(a) || !a) return 1;
  const w = aspect;
  const h = 1;
  const tx = (a.x / 100) * w;
  const ty = (a.y / 100) * h;
  const rad = (-a.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  const eps = 1e-9;
  const covers = (zoom: number) =>
    corners.every(([cx, cy]) => {
      // Map the (zoomed-out) frame corner back into the after photo's own coordinates.
      const px = cx / zoom - tx;
      const py = cy / zoom - ty;
      const qx = (px * cos - py * sin) / a.scale;
      const qy = (px * sin + py * cos) / a.scale;
      return Math.abs(qx) <= w / 2 + eps && Math.abs(qy) <= h / 2 + eps;
    });

  if (covers(1)) return 1;
  if (!covers(maxZoom)) return maxZoom;
  let lo = 1;
  let hi = maxZoom;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  // Round up so rounding can never leave a hairline gap at the edge.
  return Math.ceil(hi * 10000) / 10000;
}

/** Styles for the two photo layers of a lined-up comparison. */
export function layerStyles(a: Alignment | undefined, aspect: number): { before: CSSProperties; after: CSSProperties } {
  if (isIdentity(a) || !a) return { before: {}, after: {} };
  const zoom = coverZoom(a, aspect);
  const z = zoom === 1 ? '' : `scale(${zoom}) `;
  return {
    before: zoom === 1 ? {} : { transform: `scale(${zoom})` },
    after: { transform: `${z}${afterTransform(a)}` },
  };
}

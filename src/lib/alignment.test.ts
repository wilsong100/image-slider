import { afterTransform, clampAlignment, coverZoom, IDENTITY, isIdentity, layerStyles } from './alignment';

describe('coverZoom', () => {
  it('needs no zoom when nothing has moved, or the after photo was only enlarged', () => {
    expect(coverZoom(undefined, 4 / 3)).toBe(1);
    expect(coverZoom(IDENTITY, 4 / 3)).toBe(1);
    expect(coverZoom({ ...IDENTITY, scale: 1.3 }, 4 / 3)).toBe(1);
  });

  it('zooms just enough to hide the gap left by a move', () => {
    // Moving 10% right leaves a 10% gap on the left; zoom z must satisfy 1/z = 1 - 2 * 0.1.
    expect(coverZoom({ ...IDENTITY, x: 10 }, 4 / 3)).toBeCloseTo(1 / 0.8, 3);
    expect(coverZoom({ ...IDENTITY, y: -5 }, 16 / 9)).toBeCloseTo(1 / 0.9, 3);
  });

  it('compensates for shrinking', () => {
    expect(coverZoom({ ...IDENTITY, scale: 0.8 }, 4 / 3)).toBeCloseTo(1.25, 3);
  });

  it('compensates for rotation using the known formula for a rotated rectangle', () => {
    const aspect = 4 / 3;
    const t = (5 * Math.PI) / 180;
    // A w×h frame fits inside the same rectangle rotated by t when zoomed by
    // max(cos t + (h/w) sin t, cos t + (w/h) sin t).
    const expected = Math.max(Math.cos(t) + Math.sin(t) / aspect, Math.cos(t) + aspect * Math.sin(t));
    expect(coverZoom({ ...IDENTITY, rotate: 5 }, aspect)).toBeCloseTo(expected, 3);
    expect(coverZoom({ ...IDENTITY, rotate: -5 }, aspect)).toBeCloseTo(expected, 3);
  });
});

describe('alignment helpers', () => {
  it('clamps to sensible limits', () => {
    expect(clampAlignment({ x: 90, y: -90, scale: 9, rotate: -40 })).toEqual({ x: 50, y: -50, scale: 2, rotate: -15 });
  });

  it('builds CSS transforms, zooming both photos equally so they stay lined up', () => {
    expect(afterTransform({ x: 1, y: -2, scale: 1.1, rotate: 0.5 })).toBe('translate(1%, -2%) rotate(0.5deg) scale(1.1)');
    expect(layerStyles(undefined, 1.5)).toEqual({ before: {}, after: {} });
    const styles = layerStyles({ ...IDENTITY, x: 10 }, 4 / 3);
    expect(styles.before.transform).toMatch(/^scale\(1\.25/);
    expect(styles.after.transform).toMatch(/^scale\(1\.25\d*\) translate\(10%, 0%\)/);
    expect(isIdentity({ ...IDENTITY })).toBe(true);
  });
});

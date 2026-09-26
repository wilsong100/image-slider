import { LOOP_PHASES, positionAt, TOUR_PHASES, totalMs } from './timeline';

describe('positionAt', () => {
  it('holds on the before photo, sweeps to the after photo, then holds', () => {
    expect(positionAt(TOUR_PHASES, 0)).toBe(100);
    expect(positionAt(TOUR_PHASES, 1400)).toBe(100);
    expect(positionAt(TOUR_PHASES, 1500 + 3500 / 2)).toBeCloseTo(50);
    expect(positionAt(TOUR_PHASES, 1500 + 3500)).toBe(0);
    expect(positionAt(TOUR_PHASES, 99_999)).toBe(0);
  });

  it('moves smoothly (never jumps) and stays in range', () => {
    let last = positionAt(TOUR_PHASES, 0);
    for (let t = 0; t <= totalMs(TOUR_PHASES); t += 20) {
      const p = positionAt(TOUR_PHASES, t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
      expect(Math.abs(p - last)).toBeLessThan(3);
      last = p;
    }
  });

  it('export loop ends where it starts, so it repeats seamlessly', () => {
    expect(positionAt(LOOP_PHASES, 0)).toBe(100);
    expect(positionAt(LOOP_PHASES, totalMs(LOOP_PHASES))).toBe(100);
  });
});

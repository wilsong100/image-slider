/** Timing for the automatic before → after sweep used by tour mode and exports. */

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export type Phase = { ms: number; from: number; to: number };

/** Slider position (100 = all before, 0 = all after) at `elapsed` ms into a list of phases. */
export function positionAt(phases: Phase[], elapsed: number) {
  let t = Math.max(0, elapsed);
  for (const phase of phases) {
    if (t < phase.ms) return phase.from + (phase.to - phase.from) * easeInOut(t / phase.ms);
    t -= phase.ms;
  }
  return phases[phases.length - 1]?.to ?? 100;
}

export const totalMs = (phases: Phase[]) => phases.reduce((sum, p) => sum + p.ms, 0);

/** Tour: show the before, sweep to the after, linger on it, then move on. */
export const TOUR_PHASES: Phase[] = [
  { ms: 1500, from: 100, to: 100 },
  { ms: 3500, from: 100, to: 0 },
  { ms: 3000, from: 0, to: 0 },
];

/** Export: a seamless loop — before, sweep to after, hold, sweep back. */
export const LOOP_PHASES: Phase[] = [
  { ms: 900, from: 100, to: 100 },
  { ms: 2200, from: 100, to: 0 },
  { ms: 1400, from: 0, to: 0 },
  { ms: 2200, from: 0, to: 100 },
];

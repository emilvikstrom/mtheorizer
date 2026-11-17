import {
  type DiatonicTriad,
  type Key,
  circlePosition,
  diatonicTriads,
  dominantKey,
  keyEquals,
  subdominantKey,
} from "./keys";
import { mod12, pitchClass } from "./notes";

/**
 * Modulation through pivot chords.
 *
 * A pivot chord is a triad that belongs to both keys, so it can be heard in
 * the old key and then reinterpreted in the new one: C is I in C major and
 * IV in G major. Chords are compared by root pitch class and quality, never
 * by name, so the match is the same however the keys are spelled.
 */

export interface PivotChord {
  /** The chord as spelled in the key we leave. */
  readonly triad: DiatonicTriad;
  /** The same chord seen from the key we arrive in. */
  readonly inTarget: DiatonicTriad;
}

function sameChord(a: DiatonicTriad, b: DiatonicTriad): boolean {
  const [rootA] = a.notes;
  const [rootB] = b.notes;
  if (!rootA || !rootB) return false;
  return pitchClass(rootA) === pitchClass(rootB) && a.quality === b.quality;
}

/** Triads that `from` and `to` have in common, in the order of `from`'s scale. */
export function pivotChords(from: Key, to: Key): PivotChord[] {
  const targets = diatonicTriads(to);
  return diatonicTriads(from).flatMap((triad) => {
    const inTarget = targets.find((t) => sameChord(triad, t));
    return inTarget ? [{ triad, inTarget }] : [];
  });
}

/** Steps between two keys on the circle by the shorter way round (0–6). */
export function circleDistance(a: Key, b: Key): number {
  const clockwise = mod12(circlePosition(b) - circlePosition(a));
  return Math.min(clockwise, 12 - clockwise);
}

export interface ModulationStep {
  readonly from: Key;
  readonly to: Key;
  readonly pivots: readonly PivotChord[];
}

/**
 * A route from one key to another along the circle, the shorter way round,
 * with the pivot chords for every step. Neighbouring keys share most of their
 * chords; keys far apart share few or none, which is why the route goes
 * through the keys in between. Keys at the same position (C major and A minor)
 * are one step apart through their shared signature. The route is empty when
 * the keys are the same.
 */
export function modulationPath(from: Key, to: Key): ModulationStep[] {
  if (keyEquals(from, to)) return [];
  const clockwise = mod12(circlePosition(to) - circlePosition(from));
  const forward = clockwise <= 6;
  const hops = forward ? clockwise : 12 - clockwise;
  const keys: Key[] = [from];
  for (let i = 0; i < hops; i++) {
    const last = keys[keys.length - 1] ?? from;
    keys.push(forward ? dominantKey(last) : subdominantKey(last));
  }
  // The walk keeps the mode of `from`; finish on the requested key itself.
  const last = keys[keys.length - 1] ?? from;
  if (circlePosition(last) === circlePosition(to)) {
    if (hops > 0 && last.mode === to.mode) keys[keys.length - 1] = to;
    else keys.push(to);
  }
  return keys.slice(1).map((next, i) => {
    const previous = keys[i] ?? from;
    return { from: previous, to: next, pivots: pivotChords(previous, next) };
  });
}

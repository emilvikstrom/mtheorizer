/**
 * Small views of the guitar neck: a few frets at a time, as a guitarist
 * reads a chord diagram or a scale position.
 */

import { type NeckPlace, type OpenString, STANDARD_TUNING, positionsOnNeck } from "./fretboard";
import { pitchClass } from "./notes";
import type { HighlightTone } from "./voicing";

/** How many frets a view shows. A hand covers about four frets. */
export const VIEW_FRETS = 4;
/** The highest fret any view reaches. */
export const NECK_FRETS = 15;

export type NeckTone = HighlightTone & NeckPlace;

/**
 * A stretch of the neck: `frets` frets from `firstFret`. When `firstFret` is 1
 * the open strings belong to the view too.
 */
export interface NeckView {
  readonly firstFret: number;
  readonly frets: number;
  /** The places to mark. */
  readonly positions: readonly NeckTone[];
  /** Strings that are not played (chord shapes only). */
  readonly muted: readonly number[];
  /** Which finger frets what (chord shapes only). */
  readonly fingering?: Fingering;
}

/** A barre: one finger flat across `fromString`..`toString` (string 1 is the highest). */
export interface Barre {
  readonly fret: number;
  /** The lowest-pitched string under the barre. */
  readonly fromString: number;
  /** The highest-pitched string under the barre. */
  readonly toString: number;
}

export interface Fingering {
  /** Finger by string number: 1 = index … 4 = little finger. Open and muted strings have none. */
  readonly fingerOn: ReadonlyMap<number, number>;
  readonly barre?: Barre;
}

export function lastFret(view: NeckView): number {
  return view.firstFret + view.frets - 1;
}

export interface ChordShape extends NeckView {
  /** Fingers needed; a barre across several strings counts as one. */
  readonly fingers: number;
}

const MIN_STRINGS = 4;
const MAX_FINGERS = 4;
/** Open chords keep the fretting hand by the nut; with open strings nothing is fretted above this. */
const OPEN_CHORD_MAX_FRET = 3;

/** The barre `frets` (string 1 first, 0 = open) allow: one at the lowest fretted fret, if it covers two or more strings. */
function barreOf(frets: readonly number[]): Barre | undefined {
  // A negative fret marks a muted string, which a barre may cross.
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return undefined;
  const lowest = Math.min(...fretted);
  // A barre lies across the lowest fret from the lowest string that uses it up to string 1,
  // so every string under it must be fretted at or above that fret.
  const barreFrom = frets.lastIndexOf(lowest);
  const underBarre = frets.slice(0, barreFrom + 1);
  // The barre reaches up to the highest string that is played.
  const barreTo = frets.findIndex((f) => f >= 0);
  const canBarre =
    underBarre.every((f) => f >= lowest || f < 0) && fretted.filter((f) => f === lowest).length > 1;
  return canBarre ? { fret: lowest, fromString: barreFrom + 1, toString: barreTo + 1 } : undefined;
}

/**
 * Which finger plays what: a barre is the index finger, and the remaining
 * fretted notes take the next fingers from the lowest fret up (on the same
 * fret, from the bass string up).
 */
export function fingeringFor(frets: readonly number[]): Fingering {
  const barre = barreOf(frets);
  const fingerOn = new Map<number, number>();
  let next = 1;
  if (barre) {
    for (let string = barre.toString; string <= barre.fromString; string++) {
      if (frets[string - 1] === barre.fret) fingerOn.set(string, next);
    }
    next++;
  }
  frets
    .map((fret, i) => ({ fret, string: i + 1 }))
    .filter((p) => p.fret > 0 && !fingerOn.has(p.string))
    .sort((a, b) => a.fret - b.fret || b.string - a.string)
    .forEach((p) => fingerOn.set(p.string, next++));
  return barre ? { fingerOn, barre } : { fingerOn };
}

/** Fingers needed to fret `frets` (string 1 first, 0 = open, -1 = muted). One barre is allowed at the lowest fret. */
function fingersNeeded(frets: readonly number[]): number {
  return new Set(fingeringFor(frets).fingerOn.values()).size;
}

/** Every way to pick one item from each list. */
function* combinations<T>(lists: readonly (readonly T[])[], prefix: T[] = []): Generator<T[]> {
  if (prefix.length === lists.length) {
    yield prefix;
    return;
  }
  for (const item of lists[prefix.length] ?? []) yield* combinations(lists, [...prefix, item]);
}

/**
 * Lower is better: more strings first, then more of the chord's tones, then
 * fewer fingers, then a smaller stretch, then lower on the neck.
 */
function cost(shape: { positions: readonly NeckTone[]; fingers: number }): number[] {
  const fretted = shape.positions.map((p) => p.fret).filter((f) => f > 0);
  const stretch = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
  const height = fretted.reduce((sum, f) => sum + f, 0);
  const distinct = new Set(shape.positions.map((p) => pitchClass(p.note))).size;
  return [-shape.positions.length, -distinct, shape.fingers, stretch, height];
}

function compareCost(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** A chord with at most this many distinct tones that must sound is a power chord: played on few strings. */
const SPARSE_TONES = 2;
const SPARSE_MIN_STRINGS = 2;
const SPARSE_MAX_STRINGS = 3;
/** Power chords are played on the lowest strings: the bass is one of this many of them. */
const SPARSE_BASS_STRINGS = 3;

/** Extra fingers a variant may need compared with the easiest shape of its window. */
const VARIANT_EXTRA_FINGERS = 1;

/**
 * The best playable shape within frets `first`..`first + VIEW_FRETS - 1`, if any,
 * followed by its variants: shapes that play as many strings and chord tones as
 * the best one without being much harder. Best first.
 */
function shapesInWindow(
  tones: readonly HighlightTone[],
  onNeck: readonly NeckTone[],
  stringCount: number,
  first: number,
): Omit<ChordShape, "firstFret" | "frets">[] {
  const last = first + VIEW_FRETS - 1;
  const reachable = (p: NeckTone) =>
    (p.fret >= first && p.fret <= last) || (first === 1 && p.fret === 0);
  const candidates = Array.from({ length: stringCount }, (_, i) =>
    onNeck.filter((p) => p.string === i + 1 && reachable(p)),
  );
  const required = tones.filter((t) => !t.optional).map((t) => pitchClass(t.note));

  // Chords of two tones (power chords) are played on two or three of the lowest strings with the
  // rest muted. Any other chord plays every string from the bass up to string 1.
  const sparse = new Set(required).size <= SPARSE_TONES;
  const found: (Omit<ChordShape, "firstFret" | "frets"> & { cost: number[] })[] = [];
  const lowestBass = sparse ? stringCount - SPARSE_BASS_STRINGS + 1 : MIN_STRINGS;
  for (let bass = stringCount; bass >= lowestBass; bass--) {
    const bassChoices = (candidates[bass - 1] ?? []).filter((p) => p.isRoot);
    if (bassChoices.length === 0) continue;
    const topStrings = sparse
      ? Array.from({ length: SPARSE_MAX_STRINGS - SPARSE_MIN_STRINGS + 1 }, (_, i) => bass - 1 - i)
      : [1];
    for (const top of topStrings.filter((t) => t >= 1 && t < bass)) {
      const lists = [...candidates.slice(top - 1, bass - 1), bassChoices];
      for (const positions of combinations(lists)) {
        const covered = new Set(positions.map((p) => pitchClass(p.note)));
        if (!required.every((pc) => covered.has(pc))) continue;
        const fretOf = new Map(positions.map((p) => [p.string, p.fret]));
        const frets = Array.from({ length: stringCount }, (_, i) => fretOf.get(i + 1) ?? -1);
        const played = positions.map((p) => p.fret);
        if (played.includes(0) && Math.max(...played) > OPEN_CHORD_MAX_FRET) continue;
        const fingers = fingersNeeded(frets);
        if (fingers > MAX_FINGERS) continue;
        const shape = {
          positions: [...positions],
          muted: Array.from({ length: stringCount }, (_, i) => i + 1).filter(
            (string) => !fretOf.has(string),
          ),
          fingers,
          fingering: fingeringFor(frets),
        };
        found.push({ ...shape, cost: cost(shape) });
      }
    }
  }
  found.sort((a, b) => compareCost(a.cost, b.cost));
  const best = found[0];
  if (!best) return [];
  return found
    .filter(
      (f) =>
        // Same number of strings and chord tones as the best shape, and no big step up in fingers.
        f.cost[0] === best.cost[0] &&
        f.cost[1] === best.cost[1] &&
        f.fingers <= best.fingers + VARIANT_EXTRA_FINGERS,
    )
    .map((f) => ({
      positions: f.positions,
      muted: f.muted,
      fingers: f.fingers,
      fingering: f.fingering,
    }));
}

/** The chord tones a shape leaves out, e.g. the fifth of a seventh chord. */
export function omittedTones(
  view: NeckView,
  tones: readonly HighlightTone[],
): readonly HighlightTone[] {
  const played = new Set(view.positions.map((p) => pitchClass(p.note)));
  return tones.filter((t) => !played.has(pitchClass(t.note)));
}

/** "x 3 2 0 1 0": the fret on each string from the lowest string up, x for muted. */
export function formatShape(view: NeckView, stringCount = STANDARD_TUNING.length): string {
  const fretOn = new Map(view.positions.map((p) => [p.string, p.fret]));
  return Array.from({ length: stringCount }, (_, i) => fretOn.get(stringCount - i) ?? "x").join(
    " ",
  );
}

/** "x 3 2 – 1 –": the finger on each string from the lowest string up, – for open, x for muted. */
export function formatFingering(view: NeckView, stringCount = STANDARD_TUNING.length): string {
  const fretOn = new Map(view.positions.map((p) => [p.string, p.fret]));
  return Array.from({ length: stringCount }, (_, i) => {
    const string = stringCount - i;
    if (!fretOn.has(string)) return "x";
    return view.fingering?.fingerOn.get(string) ?? "–";
  }).join(" ");
}

/**
 * Playable shapes of a chord along the neck, lowest first.
 *
 * Each four-fret stretch gets its best root-position shape, plus variants of it
 * (such as x13331 and x10331 for B♭) that play as many strings and tones and
 * need at most one more finger. The easiest comes first. The lowest string
 * played is the root, every chord tone sounds (optional tones such as the
 * fifth of a seventh chord may be left out), the strings from the bass up to
 * string 1 are all played, and at most four fingers are needed (a barre counts
 * as one). Open strings are only used in open chords, with nothing fretted
 * above the third fret. For a major or
 * minor triad this finds the familiar CAGED shapes.
 */
export function chordShapes(
  tones: readonly HighlightTone[],
  tuning: readonly OpenString[] = STANDARD_TUNING,
): ChordShape[] {
  const onNeck = positionsOnNeck(tones, tuning, NECK_FRETS);
  const shapes = new Map<string, ChordShape>();
  for (let first = 1; first + VIEW_FRETS - 1 <= NECK_FRETS; first++) {
    for (const found of shapesInWindow(tones, onNeck, tuning.length, first)) {
      const fretted = found.positions.map((p) => p.fret).filter((f) => f > 0);
      const usesOpen = found.positions.some((p) => p.fret === 0);
      // Show the shape from its lowest fretted fret, the way chord diagrams do.
      const firstFret = usesOpen || fretted.length === 0 ? 1 : Math.min(...fretted);
      const shape: ChordShape = { ...found, firstFret, frets: VIEW_FRETS };
      const key = formatShape(shape, tuning.length);
      if (!shapes.has(key)) shapes.set(key, shape);
    }
  }
  // Stable sort: within a position the easiest variant comes first.
  return [...shapes.values()].sort((a, b) => a.firstFret - b.firstFret);
}

/**
 * Four-fret positions for a scale: the first position (with the open strings),
 * then one starting on each scale tone of the lowest string. In standard tuning
 * every four-fret stretch holds all twelve pitch classes, so each position
 * contains the whole scale; in tunings with repeated intervals (DADGAD) a
 * position can miss a tone.
 */
export function scalePositions(
  tones: readonly HighlightTone[],
  tuning: readonly OpenString[] = STANDARD_TUNING,
): NeckView[] {
  const onNeck = positionsOnNeck(tones, tuning, NECK_FRETS);
  const lowest = tuning.length;
  const starts = [1];
  for (let fret = 2; fret + VIEW_FRETS - 1 <= NECK_FRETS; fret++) {
    if (onNeck.some((p) => p.string === lowest && p.fret === fret)) starts.push(fret);
  }
  return starts.map((firstFret) => ({
    firstFret,
    frets: VIEW_FRETS,
    positions: onNeck.filter(
      (p) =>
        (p.fret >= firstFret && p.fret < firstFret + VIEW_FRETS) ||
        (firstFret === 1 && p.fret === 0),
    ),
    muted: [],
  }));
}

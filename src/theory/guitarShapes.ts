/**
 * Small views of the guitar neck: a few frets at a time, as a guitarist
 * reads a chord diagram or a scale position.
 */

import { type NeckPlace, type OpenString, STANDARD_TUNING, positionsOnNeck } from './fretboard';
import { pitchClass } from './notes';
import type { HighlightTone } from './voicing';

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

/** Fingers needed to fret `frets` (string 1 first, 0 = open). One barre is allowed at the lowest fret. */
function fingersNeeded(frets: readonly number[]): number {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return 0;
  const lowest = Math.min(...fretted);
  // A barre lies across the lowest fret from the lowest string that uses it up to string 1,
  // so every string under it must be fretted at or above that fret.
  const barreFrom = frets.lastIndexOf(lowest);
  const underBarre = frets.slice(0, barreFrom + 1);
  const canBarre = underBarre.every((f) => f >= lowest) && fretted.filter((f) => f === lowest).length > 1;
  return canBarre ? 1 + fretted.filter((f) => f > lowest).length : fretted.length;
}

/** Every way to pick one item from each list. */
function* combinations<T>(lists: readonly (readonly T[])[], prefix: T[] = []): Generator<T[]> {
  if (prefix.length === lists.length) {
    yield prefix;
    return;
  }
  for (const item of lists[prefix.length] ?? []) yield* combinations(lists, [...prefix, item]);
}

/** Lower is better: more strings first, then fewer fingers, then a smaller stretch, then lower on the neck. */
function cost(shape: { positions: readonly NeckTone[]; fingers: number }): number[] {
  const fretted = shape.positions.map((p) => p.fret).filter((f) => f > 0);
  const stretch = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
  const height = fretted.reduce((sum, f) => sum + f, 0);
  return [-shape.positions.length, shape.fingers, stretch, height];
}

function compareCost(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The best playable shape within frets `first`..`first + VIEW_FRETS - 1`, if any. */
function bestShapeInWindow(
  tones: readonly HighlightTone[],
  onNeck: readonly NeckTone[],
  stringCount: number,
  first: number,
): Omit<ChordShape, 'firstFret' | 'frets'> | undefined {
  const last = first + VIEW_FRETS - 1;
  const reachable = (p: NeckTone) => (p.fret >= first && p.fret <= last) || (first === 1 && p.fret === 0);
  const candidates = Array.from({ length: stringCount }, (_, i) =>
    onNeck.filter((p) => p.string === i + 1 && reachable(p)),
  );
  const pitchClasses = new Set(tones.map((t) => pitchClass(t.note)));

  let best: (Omit<ChordShape, 'firstFret' | 'frets'> & { cost: number[] }) | undefined;
  // Strings 1..sounding are played; the bass strings below them are muted.
  for (let sounding = stringCount; sounding >= MIN_STRINGS; sounding--) {
    const bassChoices = (candidates[sounding - 1] ?? []).filter((p) => p.isRoot);
    if (bassChoices.length === 0) continue;
    const lists = [...candidates.slice(0, sounding - 1), bassChoices];
    for (const positions of combinations(lists)) {
      const covered = new Set(positions.map((p) => pitchClass(p.note)));
      if (covered.size !== pitchClasses.size) continue;
      const frets = positions.map((p) => p.fret);
      if (frets.includes(0) && Math.max(...frets) > OPEN_CHORD_MAX_FRET) continue;
      const fingers = fingersNeeded(frets);
      if (fingers > MAX_FINGERS) continue;
      const shape = {
        positions: [...positions],
        muted: Array.from({ length: stringCount - sounding }, (_, i) => sounding + i + 1),
        fingers,
      };
      const shapeCost = cost(shape);
      if (!best || compareCost(shapeCost, best.cost) < 0) best = { ...shape, cost: shapeCost };
    }
  }
  if (!best) return undefined;
  const { cost: _cost, ...shape } = best;
  return shape;
}

/** "x 3 2 0 1 0": the fret on each string from the lowest string up, x for muted. */
export function formatShape(view: NeckView, stringCount = STANDARD_TUNING.length): string {
  const fretOn = new Map(view.positions.map((p) => [p.string, p.fret]));
  return Array.from({ length: stringCount }, (_, i) => fretOn.get(stringCount - i) ?? 'x').join(' ');
}

/**
 * Playable shapes of a chord along the neck, lowest first.
 *
 * Each four-fret stretch gets its best root-position shape: the lowest string
 * played is the root, every chord tone sounds, the strings from the bass up to
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
    const found = bestShapeInWindow(tones, onNeck, tuning.length, first);
    if (!found) continue;
    const fretted = found.positions.map((p) => p.fret).filter((f) => f > 0);
    const usesOpen = found.positions.some((p) => p.fret === 0);
    // Show the shape from its lowest fretted fret, the way chord diagrams do.
    const firstFret = usesOpen || fretted.length === 0 ? 1 : Math.min(...fretted);
    const shape: ChordShape = { ...found, firstFret, frets: VIEW_FRETS };
    const key = formatShape(shape, tuning.length);
    if (!shapes.has(key)) shapes.set(key, shape);
  }
  return [...shapes.values()].sort((a, b) => a.firstFret - b.firstFret);
}

/**
 * Four-fret positions for a scale: the first position (with the open strings),
 * then one starting on each scale tone of the lowest string. Every four-fret
 * stretch of a guitar in standard tuning holds all twelve pitch classes, so
 * each position contains the whole scale.
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
      (p) => (p.fret >= firstFret && p.fret < firstFret + VIEW_FRETS) || (firstFret === 1 && p.fret === 0),
    ),
    muted: [],
  }));
}

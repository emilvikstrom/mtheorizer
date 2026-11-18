/**
 * The Tonnetz and the neo-Riemannian transformations.
 *
 * The Tonnetz is a lattice of notes: a step to the right is a perfect fifth, a step up and to
 * the right a major third. Three neighbouring notes form a triad, a triangle that points up
 * for a major triad and down for a minor one. Each edge is shared with exactly one other
 * triangle, and crossing it is one of three transformations that change a single tone:
 *
 *   P (parallel)      C → Cm    the third moves a semitone
 *   L (leading tone)  C → Em    the root moves down a semitone (C → B)
 *   R (relative)      C → Am    the fifth moves up a whole tone (G → A)
 *
 * Triads are spelled: A♭m L gives E major, not F♭ major, since both are the same chord and
 * the first has one accidental where the second has three.
 */

import { type Interval, MAJOR_THIRD, MINOR_THIRD, PERFECT_FIFTH, transpose } from "./intervals";
import { LETTERS, type Letter, type Note, noteEquals, pitchClass } from "./notes";

export type TriadMode = "major" | "minor";

export interface Triad {
  readonly root: Note;
  readonly mode: TriadMode;
}

export type Transformation = "P" | "L" | "R";

export const TRANSFORMATIONS: readonly Transformation[] = ["P", "L", "R"];

export const TRANSFORMATION_NAMES: Record<Transformation, string> = {
  P: "Parallel",
  L: "Leading tone",
  R: "Relative",
};

/** The three tones of a triad, root first. */
export function triadTones(triad: Triad): [Note, Note, Note] {
  const third = triad.mode === "major" ? MAJOR_THIRD : MINOR_THIRD;
  return [triad.root, transpose(triad.root, third), transpose(triad.root, PERFECT_FIFTH)];
}

export function triadEquals(a: Triad, b: Triad): boolean {
  return a.mode === b.mode && noteEquals(a.root, b.root);
}

/** Sharps and flats in the triad, a double sharp or flat counting as two. */
function accidentalCount(triad: Triad): number {
  return triadTones(triad).reduce((sum, tone) => sum + Math.abs(tone.accidental), 0);
}

/**
 * The same triad spelled with the fewest sharps and flats, and with no accidental on the root
 * beyond a single sharp or flat. A tie keeps the spelling it has (E♭ minor and D♯ minor both
 * have six).
 */
export function simplestSpelling(triad: Triad): Triad {
  const target = pitchClass(triad.root);
  let best = triad;
  let bestCost = Math.abs(triad.root.accidental) > 1 ? Infinity : accidentalCount(triad);
  for (const letter of LETTERS) {
    for (const accidental of [0, -1, 1]) {
      const root: Note = { letter, accidental };
      if (pitchClass(root) !== target) continue;
      const candidate: Triad = { root, mode: triad.mode };
      const cost = accidentalCount(candidate);
      if (cost < bestCost) {
        best = candidate;
        bestCost = cost;
      }
    }
  }
  return best;
}

/** `interval` below `from`: going down a third is going up the inverted interval, a sixth. */
function transposeDown(from: Note, by: Interval): Note {
  return transpose(from, { ...by, steps: 7 - by.steps, semitones: 12 - by.semitones });
}

/** The root a transformation gives, before the spelling is simplified. */
function transformedRoot(triad: Triad, by: Transformation): Note {
  const major = triad.mode === "major";
  if (by === "P") return triad.root;
  if (by === "R") {
    // C major → A minor (the root down a minor third); A minor → C major (up a minor third).
    return major ? transposeDown(triad.root, MINOR_THIRD) : transpose(triad.root, MINOR_THIRD);
  }
  // C major → E minor (up a major third); E minor → C major (down a major third).
  return major ? transpose(triad.root, MAJOR_THIRD) : transposeDown(triad.root, MAJOR_THIRD);
}

/** The triad across the edge `by` of `triad`: P, L and R each turn major into minor and back. */
export function transform(triad: Triad, by: Transformation): Triad {
  const flipped: TriadMode = triad.mode === "major" ? "minor" : "major";
  return simplestSpelling({ root: transformedRoot(triad, by), mode: flipped });
}

/** The three neighbours of a triad. */
export function tonnetzNeighbors(triad: Triad): Record<Transformation, Triad> {
  return { P: transform(triad, "P"), L: transform(triad, "L"), R: transform(triad, "R") };
}

/** The triads a string of transformations visits, starting with `triad` itself. */
export function transformationPath(triad: Triad, steps: readonly Transformation[]): Triad[] {
  const path = [triad];
  for (const step of steps) path.push(transform(path[path.length - 1] as Triad, step));
  return path;
}

// --- The lattice ------------------------------------------------------------

/**
 * A point on the lattice, in steps of a fifth to the right (`i`) and of a major third up and to
 * the right (`j`). A major third is four fifths less two octaves, so a point is `i + 4j` fifths
 * from the origin on the line of fifths.
 */
export interface LatticePoint {
  readonly i: number;
  readonly j: number;
}

const FIFTHS_ORDER: readonly Letter[] = ["F", "C", "G", "D", "A", "E", "B"];

/** Position of a note on the line of fifths, with F = -1, C = 0, G = 1 and F♯ = 6. */
export function fifthsPosition(n: Note): number {
  return FIFTHS_ORDER.indexOf(n.letter) - 1 + 7 * n.accidental;
}

/** The note at a position on the line of fifths. */
export function noteAtFifths(position: number): Note {
  const shifted = position + 1;
  const letter = FIFTHS_ORDER[((shifted % 7) + 7) % 7] as Letter;
  return { letter, accidental: Math.floor(shifted / 7) };
}

/** The note at `point` on a lattice that has `origin` at (0, 0). */
export function noteAtPoint(origin: Note, point: LatticePoint): Note {
  return noteAtFifths(fifthsPosition(origin) + point.i + 4 * point.j);
}

/** The three lattice points of a triad whose root is at `root`. */
export function triangleAt(
  root: LatticePoint,
  mode: TriadMode,
): [LatticePoint, LatticePoint, LatticePoint] {
  const { i, j } = root;
  return mode === "major"
    ? [root, { i: i + 1, j }, { i, j: j + 1 }]
    : [root, { i: i + 1, j }, { i: i + 1, j: j - 1 }];
}

/** The lattice point of the root of the neighbour `by`, given the root's own point. */
export function neighborPoint(
  root: LatticePoint,
  mode: TriadMode,
  by: Transformation,
): LatticePoint {
  const { i, j } = root;
  if (by === "P") return root;
  if (mode === "major") return by === "L" ? { i, j: j + 1 } : { i: i - 1, j: j + 1 };
  return by === "L" ? { i, j: j - 1 } : { i: i + 1, j: j - 1 };
}

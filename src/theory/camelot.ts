import { type Key, type KeyMode, circlePosition, keyEquals, keysAt } from "./keys";

/**
 * The Camelot wheel: the circle of fifths with the keys numbered 1–12 and
 * lettered B (major) or A (minor), as DJ software shows them for harmonic
 * mixing. C major is 8B and A minor is 8A. A relative pair shares a number.
 */

export interface CamelotCode {
  /** 1–12, one step clockwise per fifth up. */
  readonly number: number;
  /** B for major keys, A for minor keys. */
  readonly letter: "A" | "B";
  /** E.g. "8B". */
  readonly label: string;
}

const wrap = (position: number): number => ((position % 12) + 12) % 12;

/** The code at a circle position (0 = C major / A minor, which is 8) and mode. */
export function camelotAt(position: number, mode: KeyMode): CamelotCode {
  const number = ((wrap(position) + 7) % 12) + 1;
  const letter = mode === "major" ? "B" : "A";
  return { number, letter, label: `${number}${letter}` };
}

/** The Camelot code of a key. Enharmonic spellings (F♯ and G♭) share one. */
export function camelotCode(k: Key): CamelotCode {
  return camelotAt(circlePosition(k), k.mode);
}

/** Every spelling of the key with this code, most common first (8B: C major; 2B: F♯ and G♭ major). */
export function keysForCamelot(code: string): Key[] {
  const match = /^(1[0-2]|[1-9])([AB])$/i.exec(code.trim());
  if (!match) return [];
  const number = Number(match[1]);
  const mode: KeyMode = match[2]?.toUpperCase() === "B" ? "major" : "minor";
  return keysAt((number + 4) % 12, mode);
}

export type CamelotRelation = "same" | "relative" | "up a fifth" | "down a fifth";

export interface CompatibleKey {
  readonly relation: CamelotRelation;
  readonly code: CamelotCode;
  /** Circle position of the key (0 = C major / A minor). */
  readonly position: number;
  readonly mode: KeyMode;
  /** Every spelling, most common first. */
  readonly keys: Key[];
}

/**
 * The keys that mix well with `k`: the key itself, the same number with the
 * other letter (the relative key), and one number up or down with the same
 * letter (a fifth above or below).
 */
export function compatibleKeys(k: Key): CompatibleKey[] {
  const position = circlePosition(k);
  const other: KeyMode = k.mode === "major" ? "minor" : "major";
  const entry = (relation: CamelotRelation, at: number, mode: KeyMode): CompatibleKey => ({
    relation,
    code: camelotAt(at, mode),
    position: wrap(at),
    mode,
    keys: keysAt(wrap(at), mode),
  });
  return [
    entry("same", position, k.mode),
    entry("relative", position, other),
    entry("up a fifth", position + 1, k.mode),
    entry("down a fifth", position - 1, k.mode),
  ];
}

/** Whether two keys are the same or neighbours on the Camelot wheel. */
export function camelotCompatible(a: Key, b: Key): boolean {
  const target = camelotCode(b).label;
  return compatibleKeys(a).some(({ code }) => code.label === target);
}

/**
 * The key to jump to for a typed Camelot code ("8B", " 2a "), or undefined when the text is no
 * code. `current` is kept when it already has the code, so G♭ major stays G♭ for 2B; otherwise
 * the most common spelling is chosen.
 */
export function keyForCamelot(code: string, current?: Key): Key | undefined {
  const keys = keysForCamelot(code);
  return (current && keys.find((k) => keyEquals(k, current))) ?? keys[0];
}

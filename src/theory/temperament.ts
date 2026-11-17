import { PERFECT_FIFTH, transpose } from "./intervals";
import { type Note, formatNote, note } from "./notes";

/** Cents in an octave. A cent is a hundredth of an equal-tempered semitone. */
export const OCTAVE_CENTS = 1200;

/** The ratio of a pure (just) perfect fifth. */
export const PURE_FIFTH_RATIO = 3 / 2;

/** The size in cents of a frequency ratio: 1200 cents per doubling. */
export function ratioToCents(ratio: number): number {
  return OCTAVE_CENTS * Math.log2(ratio);
}

/** The frequency ratio of an interval of `cents`. */
export function centsToRatio(cents: number): number {
  return 2 ** (cents / OCTAVE_CENTS);
}

/** The frequency `cents` above `hz`. */
export function frequencyAbove(hz: number, cents: number): number {
  return hz * centsToRatio(cents);
}

/** A pure fifth, about 701.96 cents. */
export const PURE_FIFTH_CENTS = ratioToCents(PURE_FIFTH_RATIO);

/** An equal-tempered fifth is exactly seven semitones. */
export const EQUAL_FIFTH_CENTS = 700;

/**
 * How far twelve pure fifths overshoot seven octaves: (3/2)^12 / 2^7 = 531441 / 524288,
 * about 23.46 cents. This is why the circle of fifths does not close in pure tuning.
 */
export const PYTHAGOREAN_COMMA_RATIO = 3 ** 12 / 2 ** 19;

export const PYTHAGOREAN_COMMA_CENTS = ratioToCents(PYTHAGOREAN_COMMA_RATIO);

/** How the fifths are tuned: exactly 3:2, or all slightly narrow so that twelve make seven octaves. */
export type Temperament = "pure" | "equal";

export const FIFTH_CENTS: Readonly<Record<Temperament, number>> = {
  pure: PURE_FIFTH_CENTS,
  equal: EQUAL_FIFTH_CENTS,
};

/** `count` stacked fifths, in cents. */
export function stackedCents(count: number, temperament: Temperament): number {
  return count * FIFTH_CENTS[temperament];
}

/** A cents value folded into one octave, from 0 up to just under 1200. */
export function foldIntoOctave(cents: number): number {
  const folded = cents % OCTAVE_CENTS;
  return folded < 0 ? folded + OCTAVE_CENTS : folded;
}

export interface FifthStep {
  /** How many fifths up from the start. */
  readonly count: number;
  /** The note, spelled by going up a perfect fifth each time: …E♯, B♯. */
  readonly note: Note;
  readonly label: string;
  /** Cents above the starting note in pure tuning, folded into the octave. */
  readonly pureCents: number;
  /** The same in equal temperament. */
  readonly equalCents: number;
  /** How far the pure stack has drifted from the equal-tempered note, in cents. */
  readonly drift: number;
}

/**
 * The notes reached by going up `count` fifths from `start` (C by default): C G D A E B F♯ C♯ G♯ D♯
 * A♯ E♯ B♯. After twelve the note is B♯, which is C again in equal temperament but 23.46 cents
 * sharp of it in pure tuning.
 */
export function fifthChain(count = 12, start: Note = note("C")): FifthStep[] {
  const steps: FifthStep[] = [];
  let current = start;
  for (let n = 0; n <= count; n++) {
    steps.push({
      count: n,
      note: current,
      label: formatNote(current),
      pureCents: foldIntoOctave(stackedCents(n, "pure")),
      equalCents: foldIntoOctave(stackedCents(n, "equal")),
      drift: n * (PURE_FIFTH_CENTS - EQUAL_FIFTH_CENTS),
    });
    current = transpose(current, PERFECT_FIFTH);
  }
  return steps;
}

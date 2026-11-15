import { type Note, letterAt, mod12, naturalPitchClass, note, pitchClass } from './notes';

/**
 * An interval is a number of letter steps plus a number of semitones.
 * A major third and a diminished fourth are both 4 semitones, but only
 * the third moves two letters (C → E rather than C → F♭).
 */
export interface Interval {
  /** Full name, e.g. "Minor third". */
  readonly name: string;
  /** Short name, e.g. "m3". */
  readonly short: string;
  /** Letter steps above the lower note (0 = unison, 2 = third, 4 = fifth). */
  readonly steps: number;
  /** Semitones above the lower note. */
  readonly semitones: number;
}

function interval(name: string, short: string, steps: number, semitones: number): Interval {
  return { name, short, steps, semitones };
}

export const PERFECT_UNISON = interval('Perfect unison', 'P1', 0, 0);
export const MINOR_SECOND = interval('Minor second', 'm2', 1, 1);
export const MAJOR_SECOND = interval('Major second', 'M2', 1, 2);
export const MINOR_THIRD = interval('Minor third', 'm3', 2, 3);
export const MAJOR_THIRD = interval('Major third', 'M3', 2, 4);
export const PERFECT_FOURTH = interval('Perfect fourth', 'P4', 3, 5);
export const PERFECT_FIFTH = interval('Perfect fifth', 'P5', 4, 7);
export const MINOR_SIXTH = interval('Minor sixth', 'm6', 5, 8);
export const MAJOR_SIXTH = interval('Major sixth', 'M6', 5, 9);
export const MINOR_SEVENTH = interval('Minor seventh', 'm7', 6, 10);
export const MAJOR_SEVENTH = interval('Major seventh', 'M7', 6, 11);

/**
 * The note `interval` above `from`, spelled correctly: the letter moves by
 * `interval.steps`, and the accidental is whatever makes the pitch right.
 *
 * transpose(E♭, MAJOR_THIRD) = G, transpose(C♯, MAJOR_THIRD) = E♯.
 */
export function transpose(from: Note, by: Interval): Note {
  const letter = letterAt(from.letter, by.steps);
  const target = mod12(pitchClass(from) + by.semitones);
  let accidental = mod12(target - naturalPitchClass(letter));
  if (accidental > 6) accidental -= 12;
  return note(letter, accidental);
}

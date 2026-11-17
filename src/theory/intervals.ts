import { type Note, letterAt, mod12, naturalPitchClass, note, pitchClass } from "./notes";

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

export const PERFECT_UNISON = interval("Perfect unison", "P1", 0, 0);
export const MINOR_SECOND = interval("Minor second", "m2", 1, 1);
export const MAJOR_SECOND = interval("Major second", "M2", 1, 2);
export const MINOR_THIRD = interval("Minor third", "m3", 2, 3);
export const MAJOR_THIRD = interval("Major third", "M3", 2, 4);
export const PERFECT_FOURTH = interval("Perfect fourth", "P4", 3, 5);
export const AUGMENTED_FOURTH = interval("Augmented fourth", "A4", 3, 6);
export const PERFECT_FIFTH = interval("Perfect fifth", "P5", 4, 7);
export const MINOR_SIXTH = interval("Minor sixth", "m6", 5, 8);
export const MAJOR_SIXTH = interval("Major sixth", "M6", 5, 9);
export const MINOR_SEVENTH = interval("Minor seventh", "m7", 6, 10);
export const MAJOR_SEVENTH = interval("Major seventh", "M7", 6, 11);

// Altered fifths and sevenths, used in diminished and augmented chords.
export const DIMINISHED_FIFTH = interval("Diminished fifth", "d5", 4, 6);
export const AUGMENTED_FIFTH = interval("Augmented fifth", "A5", 4, 8);
export const DIMINISHED_SEVENTH = interval("Diminished seventh", "d7", 6, 9);
// The altered scale has a ♭4 that is the major third, spelled on the fourth letter.
export const DIMINISHED_FOURTH = interval("Diminished fourth", "d4", 3, 4);

// Compound intervals (beyond the octave), used for chord extensions.
export const MINOR_NINTH = interval("Minor ninth", "m9", 8, 13);
export const MAJOR_NINTH = interval("Major ninth", "M9", 8, 14);
export const AUGMENTED_NINTH = interval("Augmented ninth", "A9", 8, 15);
export const PERFECT_ELEVENTH = interval("Perfect eleventh", "P11", 10, 17);
export const AUGMENTED_ELEVENTH = interval("Augmented eleventh", "A11", 10, 18);
export const MINOR_THIRTEENTH = interval("Minor thirteenth", "m13", 12, 20);
export const MAJOR_THIRTEENTH = interval("Major thirteenth", "M13", 12, 21);

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

import {
  type Interval,
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MAJOR_THIRD,
  MINOR_SEVENTH,
  MINOR_SIXTH,
  MINOR_THIRD,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  PERFECT_UNISON,
  transpose,
} from './intervals';
import type { Note } from './notes';

export interface Scale {
  readonly name: string;
  /** Intervals of each degree above the tonic. */
  readonly degrees: readonly Interval[];
}

export const MAJOR_SCALE: Scale = {
  name: 'Major',
  degrees: [
    PERFECT_UNISON,
    MAJOR_SECOND,
    MAJOR_THIRD,
    PERFECT_FOURTH,
    PERFECT_FIFTH,
    MAJOR_SIXTH,
    MAJOR_SEVENTH,
  ],
};

export const NATURAL_MINOR_SCALE: Scale = {
  name: 'Natural minor',
  degrees: [
    PERFECT_UNISON,
    MAJOR_SECOND,
    MINOR_THIRD,
    PERFECT_FOURTH,
    PERFECT_FIFTH,
    MINOR_SIXTH,
    MINOR_SEVENTH,
  ],
};

export function buildScale(tonic: Note, scale: Scale): Note[] {
  return scale.degrees.map((degree) => transpose(tonic, degree));
}

/**
 * Number of accidentals in the key signature of `scale` on `tonic`
 * (a double sharp counts as two). E♭ major → 3, D♯ major → 9.
 */
export function keySignatureAccidentals(tonic: Note, scale: Scale): number {
  return buildScale(tonic, scale).reduce((sum, n) => sum + Math.abs(n.accidental), 0);
}

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
import { type Note, formatNote, mod12, noteEquals, spellingsOf } from './notes';

export type ScaleId = 'major' | 'naturalMinor';

export interface Scale {
  readonly id: ScaleId;
  /** E.g. "Natural minor". */
  readonly name: string;
  /** Intervals of each degree above the tonic. */
  readonly degrees: readonly Interval[];
  /**
   * Black-key tonics whose two spellings give key signatures with equally many
   * accidentals, mapped to the spelling most often seen in lead sheets.
   */
  readonly tieBreaks: Partial<Record<number, Note>>;
}

export const MAJOR_SCALE: Scale = {
  id: 'major',
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
  // F♯ major (6♯), not G♭ major (6♭).
  tieBreaks: { 6: { letter: 'F', accidental: 1 } },
};

export const NATURAL_MINOR_SCALE: Scale = {
  id: 'naturalMinor',
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
  // E♭ minor (6♭), not D♯ minor (6♯).
  tieBreaks: { 3: { letter: 'E', accidental: -1 } },
};

export const SCALES: Record<ScaleId, Scale> = {
  major: MAJOR_SCALE,
  naturalMinor: NATURAL_MINOR_SCALE,
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

/**
 * How to spell a tonic on pitch class `pc` for `scale`.
 *
 * Rule: among the spellings with at most one accidental, use the one whose key
 * signature has the fewest accidentals. That gives D♭ major but C♯ minor,
 * A♭ major but G♯ minor, and always the natural name for white keys.
 */
export function preferredTonicSpelling(pc: number, scale: Scale): Note {
  const candidates = spellingsOf(pc).map((spelling) => ({
    spelling,
    cost: keySignatureAccidentals(spelling, scale),
  }));
  const lowest = Math.min(...candidates.map((c) => c.cost));
  const best = candidates.filter((c) => c.cost === lowest).map((c) => c.spelling);
  const tieBreak = scale.tieBreaks[mod12(pc)];
  const chosen = (tieBreak && best.find((n) => noteEquals(n, tieBreak))) ?? best[0];
  if (!chosen) {
    throw new Error(`No spelling found for pitch class ${pc}`);
  }
  return chosen;
}

export interface ScaleTone {
  readonly note: Note;
  /** Scale degree, 1 = tonic … 7. */
  readonly degree: number;
  readonly interval: Interval;
}

export interface SpelledScale {
  readonly tonic: Note;
  readonly scale: Scale;
  readonly tones: readonly ScaleTone[];
  /** E.g. "E♭ natural minor scale". */
  readonly name: string;
}

export function spellScale(tonic: Note, scaleId: ScaleId): SpelledScale {
  const scale = SCALES[scaleId];
  const tones = scale.degrees.map((interval, i) => ({
    note: transpose(tonic, interval),
    degree: i + 1,
    interval,
  }));
  return { tonic, scale, tones, name: `${formatNote(tonic)} ${scale.name.toLowerCase()} scale` };
}

/** The scale on pitch class `pc` (0 = C … 11 = B), with its tonic spelled the usual way. */
export function scaleOnPitchClass(pc: number, scaleId: ScaleId): SpelledScale {
  return spellScale(preferredTonicSpelling(pc, SCALES[scaleId]), scaleId);
}

/** How to describe a scale tone to the reader: "Tonic", "Major second" … */
export function scaleToneLabel(tone: ScaleTone): string {
  return tone.degree === 1 ? 'Tonic' : tone.interval.name;
}

import { type Interval, MAJOR_THIRD, MINOR_THIRD, PERFECT_FIFTH, PERFECT_UNISON, transpose } from './intervals';
import { type Note, formatNote, mod12, noteEquals, spellingsOf } from './notes';
import { MAJOR_SCALE, NATURAL_MINOR_SCALE, type Scale, keySignatureAccidentals } from './scales';

/** The function a tone has in the chord. */
export type ChordRole = 'root' | 'third' | 'fifth';

export type ChordQualityId = 'major' | 'minor';

export interface ChordQuality {
  readonly id: ChordQualityId;
  /** Name used after the root, e.g. "major" in "C major". */
  readonly name: string;
  /** Suffix in chord symbols, e.g. "m" in "Cm". */
  readonly symbol: string;
  readonly tones: readonly { readonly role: ChordRole; readonly interval: Interval }[];
  /** The key whose signature decides how to spell a black-key root. */
  readonly keyScale: Scale;
}

export const CHORD_QUALITIES: Record<ChordQualityId, ChordQuality> = {
  major: {
    id: 'major',
    name: 'major',
    symbol: '',
    tones: [
      { role: 'root', interval: PERFECT_UNISON },
      { role: 'third', interval: MAJOR_THIRD },
      { role: 'fifth', interval: PERFECT_FIFTH },
    ],
    keyScale: MAJOR_SCALE,
  },
  minor: {
    id: 'minor',
    name: 'minor',
    symbol: 'm',
    tones: [
      { role: 'root', interval: PERFECT_UNISON },
      { role: 'third', interval: MINOR_THIRD },
      { role: 'fifth', interval: PERFECT_FIFTH },
    ],
    keyScale: NATURAL_MINOR_SCALE,
  },
};

export interface ChordTone {
  readonly note: Note;
  readonly role: ChordRole;
  readonly interval: Interval;
}

/** How to describe a tone to the reader: "Root", "Minor third", "Perfect fifth". */
export function toneLabel(tone: ChordTone): string {
  return tone.role === 'root' ? 'Root' : tone.interval.name;
}

export interface Chord {
  readonly root: Note;
  readonly quality: ChordQuality;
  readonly tones: readonly ChordTone[];
  /** E.g. "E♭ minor". */
  readonly name: string;
  /** E.g. "E♭m". */
  readonly symbol: string;
}

export function buildChord(root: Note, qualityId: ChordQualityId): Chord {
  const quality = CHORD_QUALITIES[qualityId];
  const tones = quality.tones.map(({ role, interval }) => ({
    note: transpose(root, interval),
    role,
    interval,
  }));
  const rootName = formatNote(root);
  return {
    root,
    quality,
    tones,
    name: `${rootName} ${quality.name}`,
    symbol: `${rootName}${quality.symbol}`,
  };
}

/**
 * When two spellings give key signatures with equally many accidentals,
 * we pick the one most often seen in lead sheets:
 * F♯ major (not G♭ major) and E♭ minor (not D♯ minor).
 */
const TIE_BREAKS: Record<ChordQualityId, Partial<Record<number, Note>>> = {
  major: { 6: { letter: 'F', accidental: 1 } },
  minor: { 3: { letter: 'E', accidental: -1 } },
};

/**
 * How to spell the root of a chord on pitch class `pc`.
 *
 * Rule: among the spellings with at most one accidental, use the one whose
 * key (major key for major chords, minor key for minor chords) has the fewest
 * accidentals in its key signature. That gives D♭ major but C♯ minor, A♭ major
 * but G♯ minor, and always the natural name for white keys.
 */
export function preferredRootSpelling(pc: number, qualityId: ChordQualityId): Note {
  const { keyScale } = CHORD_QUALITIES[qualityId];
  const candidates = spellingsOf(pc).map((spelling) => ({
    spelling,
    cost: keySignatureAccidentals(spelling, keyScale),
  }));
  const lowest = Math.min(...candidates.map((c) => c.cost));
  const best = candidates.filter((c) => c.cost === lowest).map((c) => c.spelling);
  const tieBreak = TIE_BREAKS[qualityId][mod12(pc)];
  const chosen = (tieBreak && best.find((n) => noteEquals(n, tieBreak))) ?? best[0];
  if (!chosen) {
    throw new Error(`No spelling found for pitch class ${pc}`);
  }
  return chosen;
}

/** The chord on pitch class `pc` (0 = C … 11 = B), with its root spelled the usual way. */
export function chordOnPitchClass(pc: number, qualityId: ChordQualityId): Chord {
  return buildChord(preferredRootSpelling(pc, qualityId), qualityId);
}

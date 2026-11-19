import type { Chord, ChordTone } from "./chords";
import { type Note, formatNote, noteEquals, pitchClass } from "./notes";
import type { SpelledScale } from "./scales";

/** A tone the two chords have in common, as each chord spells it. */
export interface CommonTone {
  readonly first: Note;
  readonly second: Note;
  /** Both chords spell it the same (G and G), as opposed to E♭ against D♯. */
  readonly sameSpelling: boolean;
  /** The pitch class (0 = C … 11 = B): the key both chords press. */
  readonly pitchClass: number;
}

/** Two chords side by side: which of their tones sound the same key. */
export interface ChordComparison {
  readonly first: Chord;
  readonly second: Chord;
  /** The shared tones, in the order the first chord lists them. */
  readonly common: readonly CommonTone[];
  /** Pitch classes shared by both chords, for marking keys. */
  readonly sharedPitchClasses: ReadonlySet<number>;
}

/**
 * The tones two chords share. A tone is shared when both chords sound the same pitch class, so E♭
 * in one chord and D♯ in the other count (and are flagged `sameSpelling: false`); the spelling
 * is kept as each chord has it. A chord that lists a pitch class twice is matched once.
 */
export function compareChords(first: Chord, second: Chord): ChordComparison {
  const common: CommonTone[] = [];
  const seen = new Set<number>();
  for (const tone of first.tones) {
    const pc = pitchClass(tone.note);
    if (seen.has(pc)) continue;
    const match = second.tones.find((other) => pitchClass(other.note) === pc);
    if (!match) continue;
    seen.add(pc);
    common.push({
      first: tone.note,
      second: match.note,
      sameSpelling: noteEquals(tone.note, match.note),
      pitchClass: pc,
    });
  }
  return { first, second, common, sharedPitchClasses: seen };
}

/** "G", or "E♭ / D♯" when the two chords spell the shared tone differently. */
export function formatCommonTone(tone: CommonTone): string {
  return tone.sameSpelling
    ? formatNote(tone.first)
    : `${formatNote(tone.first)} / ${formatNote(tone.second)}`;
}

/** One tone of a chord, and whether the scale it is held against has it. */
export interface ChordScaleTone {
  readonly tone: ChordTone;
  /** The scale has this pitch class. */
  readonly inScale: boolean;
  /** The scale's spelling of it, when it has it (E♭ in the chord, D♯ in the scale). */
  readonly scaleNote: Note | undefined;
  /** The chord and the scale spell it the same; false when `inScale` is false. */
  readonly sameSpelling: boolean;
}

/** A chord held against a scale: which of the chord's tones the scale contains. */
export interface ChordScaleComparison {
  readonly chord: Chord;
  readonly scale: SpelledScale;
  /** Every tone of the chord, in the order the chord lists them. */
  readonly tones: readonly ChordScaleTone[];
  readonly inside: readonly ChordScaleTone[];
  readonly outside: readonly ChordScaleTone[];
  /** Every tone the chord needs is in the scale (an optional fifth may be outside). */
  readonly fits: boolean;
  /** Pitch classes of the chord that the scale has, for marking keys. */
  readonly sharedPitchClasses: ReadonlySet<number>;
}

/**
 * Which tones of a chord are in a scale. A tone is in the scale when the scale has its pitch
 * class, whatever the spelling; a different spelling is kept and flagged. The chord fits when
 * every tone it needs is in the scale, so a seventh chord whose optional fifth is outside still does.
 */
export function compareChordWithScale(chord: Chord, scale: SpelledScale): ChordScaleComparison {
  const tones = chord.tones.map((tone): ChordScaleTone => {
    const pc = pitchClass(tone.note);
    const match = scale.tones.find((s) => pitchClass(s.note) === pc);
    return {
      tone,
      inScale: match !== undefined,
      scaleNote: match?.note,
      sameSpelling: match !== undefined && noteEquals(tone.note, match.note),
    };
  });
  return {
    chord,
    scale,
    tones,
    inside: tones.filter((t) => t.inScale),
    outside: tones.filter((t) => !t.inScale),
    fits: tones.every((t) => t.inScale || t.tone.optional),
    sharedPitchClasses: new Set(tones.filter((t) => t.inScale).map((t) => pitchClass(t.tone.note))),
  };
}

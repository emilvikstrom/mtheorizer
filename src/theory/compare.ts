import type { Chord } from "./chords";
import { type Note, formatNote, noteEquals, pitchClass } from "./notes";

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

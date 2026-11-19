import { type ChordQualityId, buildChord, chordSymbol } from "./chords";
import { identifyChords } from "./identify";
import {
  AUGMENTED_FOURTH,
  type Interval,
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MAJOR_THIRD,
  MINOR_SECOND,
  MINOR_SEVENTH,
  MINOR_SIXTH,
  MINOR_THIRD,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  PERFECT_UNISON,
  transpose,
} from "./intervals";
import { type Key, diatonicSevenths, diatonicTriads } from "./keys";
import { type Note, mod12, pitchClass } from "./notes";

/**
 * Negative harmony (Ernst Levy, popularised by Jacob Collier): mirror every note of a
 * chord around the axis that lies halfway between the tonic and the dominant of the key.
 * In C the axis sits between E and E♭, so C ↔ G, D ↔ F, E ↔ E♭, A ↔ B♭, B ↔ A♭ and so on.
 * C major (C–E–G) becomes G–E♭–C, which is C minor, and G7 becomes Fm6.
 *
 * This is one convention among several. Others fix the axis at the tonic or use the
 * mirror of the chord's own root, so the results are suggestions, not rules. It is
 * built on the key's tonic, so a key and its relative key mirror differently.
 */

/** Tonic-relative spelling of each semitone offset: lowered second, third, sixth and seventh, raised fourth. */
const OFFSET_INTERVALS: readonly Interval[] = [
  PERFECT_UNISON,
  MINOR_SECOND,
  MAJOR_SECOND,
  MINOR_THIRD,
  MAJOR_THIRD,
  PERFECT_FOURTH,
  AUGMENTED_FOURTH,
  PERFECT_FIFTH,
  MINOR_SIXTH,
  MAJOR_SIXTH,
  MINOR_SEVENTH,
  MAJOR_SEVENTH,
];

/**
 * The mirror image of a note in a key: the pitch class `7 − offset` above the tonic,
 * where `offset` is the note's distance from the tonic. Spelled from the tonic with
 * ♭2, ♭3, ♯4, ♭6 and ♭7, so the spelling follows the key.
 */
export function negativeNote(tonic: Note, n: Note): Note {
  const offset = mod12(pitchClass(n) - pitchClass(tonic));
  const mirrored = mod12(7 - offset);
  return transpose(tonic, OFFSET_INTERVALS[mirrored] ?? PERFECT_UNISON);
}

/** A chord with its symbol and notes. */
export interface NegativeChord {
  readonly symbol: string;
  /** The tones of the chord, in the order the chord lists them. */
  readonly notes: readonly Note[];
  readonly root: Note;
  readonly qualityId: ChordQualityId;
}

export interface NegativeMapping {
  /** Scale degree, 1–7. */
  readonly degree: number;
  readonly roman: string;
  readonly source: NegativeChord;
  /** The mirrored chord. Its notes are listed in the same order as the source's. */
  readonly negative: NegativeChord;
  /** Other names for the same notes (Dm7♭5 for Fm6 in C), simplest first. At most two. */
  readonly alsoReads: readonly string[];
}

/** Mirror a chord in a key. */
export function negativeChord(
  k: Key,
  root: Note,
  qualityId: ChordQualityId,
): { chord: NegativeChord; alsoReads: string[] } {
  const source = buildChord(root, qualityId).tones.map((tone) => tone.note);
  const mirrored = source.map((n) => negativeNote(k.tonic, n));
  const matches = identifyChords(mirrored.map(pitchClass)).filter((m) => m.omitted.length === 0);
  const best = matches[0];
  if (!best) {
    // Cannot happen for the chords of the library, but fall back to the plain notes.
    const first = mirrored[0] ?? k.tonic;
    return { chord: { symbol: "?", notes: mirrored, root: first, qualityId }, alsoReads: [] };
  }
  const spelled = (pc: number, fallback: Note) =>
    mirrored.find((n) => pitchClass(n) === pc) ?? fallback;
  const rootPc = pitchClass(best.chord.root);
  const negativeRoot = spelled(rootPc, best.chord.root);
  const id = best.chord.quality.id;
  const alsoReads = matches
    .slice(1)
    .filter((m) => pitchClass(m.chord.root) !== rootPc || m.chord.quality.id !== id)
    .slice(0, 2)
    .map((m) => chordSymbol(spelled(pitchClass(m.chord.root), m.chord.root), m.chord.quality.id));
  return {
    chord: {
      symbol: chordSymbol(negativeRoot, id),
      notes: mirrored,
      root: negativeRoot,
      qualityId: id,
    },
    alsoReads,
  };
}

/** The negative of each diatonic chord of a key, triads or seventh chords. */
export function negativeDiatonic(
  k: Key,
  size: "triads" | "sevenths" = "triads",
): NegativeMapping[] {
  const entries = size === "sevenths" ? diatonicSevenths(k) : diatonicTriads(k);
  return entries.map((entry) => {
    const root = entry.notes[0] ?? k.tonic;
    const quality: ChordQualityId = entry.quality;
    const { chord, alsoReads } = negativeChord(k, root, quality);
    return {
      degree: entry.degree,
      roman: entry.roman,
      source: {
        symbol: entry.symbol,
        notes: buildChord(root, quality).tones.map((tone) => tone.note),
        root,
        qualityId: quality,
      },
      negative: chord,
      alsoReads,
    };
  });
}

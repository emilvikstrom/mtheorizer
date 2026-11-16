import {
  CHORD_QUALITY_IDS,
  type NamedChord,
  type ChordQualityId,
  type ChordTone,
  buildChord,
  preferredRootSpelling,
} from "./chords";
import { type Note, formatNote, mod12, note, pitchClass } from "./notes";

/** A chord that fits a set of pitch classes. */
export interface ChordMatch {
  readonly chord: NamedChord;
  /** The bass tone, spelled as the chord spells it. Only set when a bass was given. */
  readonly bass: Note | undefined;
  /** The bass is not the root: the chord is a slash chord such as Am7/C. */
  readonly inverted: boolean;
  /** Tones of the chord that are not among the given ones. They are all optional. */
  readonly omitted: readonly ChordTone[];
  /** E.g. "E♭m7" or "Am7/C". */
  readonly symbol: string;
}

export interface IdentifyOptions {
  /**
   * Pitch class (0–11) of the lowest tone. Chords that have it as another tone than
   * the root become slash chords (Am7/C). Without a bass, no chord is a slash chord.
   */
  readonly bass?: number;
}

function toPitchClass(n: number): number {
  if (!Number.isInteger(n)) throw new RangeError(`Not a pitch class: ${n}`);
  return mod12(n);
}

/** The pitch classes a quality has relative to its root, split into required and optional. */
const SHAPES = CHORD_QUALITY_IDS.map((id) => {
  // Any root will do: only the intervals matter, and C has them all spelled without surprises.
  const chord = buildChord(note("C"), id);
  return {
    id,
    required: new Set(chord.tones.filter((t) => !t.optional).map((t) => t.interval.semitones % 12)),
    optional: new Set(chord.tones.filter((t) => t.optional).map((t) => t.interval.semitones % 12)),
    size: chord.tones.length,
    symbolLength: chord.quality.symbol.length,
  };
});

/**
 * Every chord that the given pitch classes form, best first.
 *
 * A chord fits when the tones contain all its required tones and nothing outside
 * the chord. Optional tones (the fifth in a seventh chord, say) may be missing.
 * The roots are spelled with `preferredRootSpelling`, so 3, 6, 9 and 0 give D♯°7
 * (two accidentals) rather than E♭°7 (B𝄫 and D𝄫).
 *
 * The order is: fewest omitted tones, then root position before slash chords, then
 * fewer tones and shorter symbols (the simpler name), then fewer accidentals in the root.
 * Fewer than two different tones give nothing.
 */
export function identifyChords(
  tones: readonly number[],
  options: IdentifyOptions = {},
): ChordMatch[] {
  const present = new Set(tones.map(toPitchClass));
  const bassPc = options.bass === undefined ? undefined : toPitchClass(options.bass);
  if (bassPc !== undefined) present.add(bassPc);
  if (present.size < 2) return [];

  const matches: { match: ChordMatch; rank: readonly number[] }[] = [];
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    // Relative to this root, which of the given tones does the chord have to cover?
    const relative = new Set([...present].map((pc) => mod12(pc - rootPc)));
    if (!relative.has(0)) continue;
    for (const shape of SHAPES) {
      if (![...shape.required].every((r) => relative.has(r))) continue;
      if (![...relative].every((r) => shape.required.has(r) || shape.optional.has(r))) continue;

      const chord = buildChord(preferredRootSpelling(rootPc, shape.id), shape.id);
      const inverted = bassPc !== undefined && bassPc !== rootPc;
      const bassTone =
        bassPc === undefined ? undefined : chord.tones.find((t) => pitchClass(t.note) === bassPc);
      const omitted = chord.tones.filter((t) => !present.has(pitchClass(t.note)));
      const symbol =
        inverted && bassTone ? `${chord.symbol}/${formatNote(bassTone.note)}` : chord.symbol;
      matches.push({
        match: { chord, bass: bassTone?.note, inverted, omitted, symbol },
        rank: [
          omitted.length,
          inverted ? 1 : 0,
          shape.size,
          shape.symbolLength,
          accidentals(chord.root),
        ],
      });
    }
  }

  matches.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      const diff = (a.rank[i] ?? 0) - (b.rank[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return CHORD_ORDER[a.match.chord.quality.id] - CHORD_ORDER[b.match.chord.quality.id];
  });
  return matches.map(({ match }) => match);
}

const CHORD_ORDER = Object.fromEntries(CHORD_QUALITY_IDS.map((id, i) => [id, i])) as Record<
  ChordQualityId,
  number
>;

function accidentals(root: Note): number {
  return Math.abs(root.accidental);
}

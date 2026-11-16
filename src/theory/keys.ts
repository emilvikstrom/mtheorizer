import { type Chord, type ChordQualityId, buildChord, chordSymbol } from "./chords";
import {
  type Interval,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MINOR_THIRD,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  transpose,
} from "./intervals";
import { type Letter, type Note, formatNote, mod12, note, noteEquals, pitchClass } from "./notes";
import { MAJOR_SCALE, NATURAL_MINOR_SCALE, buildScale } from "./scales";

/**
 * Keys and the circle of fifths.
 *
 * A key is a spelled tonic plus a mode. Everything else (scale, signature,
 * diatonic chords, neighbours on the circle) is derived from that.
 */

export type KeyMode = "major" | "minor";

export interface Key {
  readonly tonic: Note;
  readonly mode: KeyMode;
}

export function key(tonic: Note, mode: KeyMode): Key {
  return { tonic, mode };
}

export function keyEquals(a: Key, b: Key): boolean {
  return a.mode === b.mode && noteEquals(a.tonic, b.tonic);
}

/** E.g. "E♭ major", "C♯ minor". */
export function formatKey(k: Key): string {
  return `${formatNote(k.tonic)} ${k.mode}`;
}

/** The scale of the key: major, or natural minor for minor keys. */
export function keyScale(k: Key): Note[] {
  return buildScale(k.tonic, k.mode === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE);
}

/** The relative key shares the key signature: C major ↔ A minor. */
export function relativeKey(k: Key): Key {
  return k.mode === "major"
    ? key(transpose(k.tonic, MAJOR_SIXTH), "minor")
    : key(transpose(k.tonic, MINOR_THIRD), "major");
}

// --- Key signature ----------------------------------------------------------

export type SignatureKind = "sharps" | "flats" | "none";

export interface KeySignature {
  readonly kind: SignatureKind;
  /** Altered notes in the order they are written: F♯ C♯ G♯ … or B♭ E♭ A♭ … */
  readonly accidentals: readonly Note[];
}

const SHARP_ORDER: readonly Letter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: readonly Letter[] = [...SHARP_ORDER].reverse();

export function keySignature(k: Key): KeySignature {
  const altered = keyScale(k).filter((n) => n.accidental !== 0);
  const first = altered[0];
  if (!first) return { kind: "none", accidentals: [] };
  const kind = first.accidental > 0 ? "sharps" : "flats";
  const order = kind === "sharps" ? SHARP_ORDER : FLAT_ORDER;
  const accidentals = [...altered].sort(
    (a, b) => order.indexOf(a.letter) - order.indexOf(b.letter),
  );
  return { kind, accidentals };
}

// --- The circle -------------------------------------------------------------

const MAX_ACCIDENTALS = 7;

function walk(step: Interval): Note[] {
  const tonics = [note("C")];
  for (let i = 0; i < MAX_ACCIDENTALS; i++) {
    tonics.push(transpose(tonics[tonics.length - 1] ?? note("C"), step));
  }
  return tonics;
}

/** C G D A E B F♯ C♯: each one more sharp. */
const SHARP_MAJORS = walk(PERFECT_FIFTH);
/** C F B♭ E♭ A♭ D♭ G♭ C♭: each one more flat. */
const FLAT_MAJORS = walk(PERFECT_FOURTH);

const signatureSize = (tonic: Note) => keySignature(key(tonic, "major")).accidentals.length;

/**
 * Major keys around the circle, clockwise from C (position 0) in fifths.
 * Each position lists every spelling with at most seven accidentals, the
 * one with fewer accidentals first. Positions 5–7 have two names
 * (B/C♭, F♯/G♭, D♭/C♯); for the tie at position 6, F♯ comes first.
 */
export const CIRCLE_OF_FIFTHS: readonly (readonly Note[])[] = Array.from(
  { length: 12 },
  (_, position) => {
    const spellings: Note[] = [];
    const sharp = SHARP_MAJORS[position];
    const flat = position === 0 ? undefined : FLAT_MAJORS[12 - position];
    if (sharp) spellings.push(sharp);
    if (flat) spellings.push(flat);
    // Array.prototype.sort is stable, so the sharp key wins a tie.
    return spellings.sort((a, b) => signatureSize(a) - signatureSize(b));
  },
);

/** Position on the circle (0 = C major / A minor, 1 = G major / E minor …). */
export function circlePosition(k: Key): number {
  const major = k.mode === "major" ? k.tonic : relativeKey(k).tonic;
  // Seven semitones per fifth, and 7 × 7 ≡ 1 (mod 12), so this inverts it.
  return mod12(pitchClass(major) * 7);
}

/** Every spelling of the keys at `position`, most common first. */
export function keysAt(position: number, mode: KeyMode): Key[] {
  const majors = CIRCLE_OF_FIFTHS[mod12(position)] ?? [];
  return majors.map((tonic) =>
    mode === "major" ? key(tonic, "major") : relativeKey(key(tonic, "major")),
  );
}

/** The key at `position`, spelled with the same kind of accidentals as `like` when there is a choice. */
function keyAtLike(position: number, mode: KeyMode, like: SignatureKind): Key {
  const options = keysAt(position, mode);
  const chosen = options.find((k) => keySignature(k).kind === like) ?? options[0];
  if (!chosen) throw new Error(`No key at position ${position}`);
  return chosen;
}

/** One step clockwise: G major from C major, D♯ minor (not E♭ minor) from G♯ minor. */
export function dominantKey(k: Key): Key {
  return keyAtLike(circlePosition(k) + 1, k.mode, keySignature(k).kind);
}

/** One step counterclockwise: F major from C major, G♭ major (not F♯) from D♭ major. */
export function subdominantKey(k: Key): Key {
  return keyAtLike(circlePosition(k) - 1, k.mode, keySignature(k).kind);
}

/**
 * Same tonic, other mode: C major ↔ C minor. When that key is not on the
 * circle (G♯ major would need F𝄪) the enharmonic key on the circle is used
 * instead (A♭ major).
 */
export function parallelKey(k: Key): Key {
  const mode: KeyMode = k.mode === "major" ? "minor" : "major";
  const options = keysAt(circlePosition(key(k.tonic, mode)), mode);
  const chosen = options.find((o) => noteEquals(o.tonic, k.tonic)) ?? options[0];
  if (!chosen) throw new Error(`No parallel key for ${formatKey(k)}`);
  return chosen;
}

// --- Diatonic chords --------------------------------------------------------

export type TriadQuality = "major" | "minor" | "diminished" | "augmented";
export type HarmonicFunction = "tonic" | "subdominant" | "dominant";

export interface DiatonicTriad {
  /** Scale degree, 1–7. */
  readonly degree: number;
  /** Roman numeral: upper case for major, lower case for minor, ° for diminished. */
  readonly roman: string;
  readonly quality: TriadQuality;
  readonly notes: readonly Note[];
  /** Chord symbol, e.g. "F♯m" or "B°". */
  readonly symbol: string;
  readonly function?: HarmonicFunction;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const SYMBOL_SUFFIX: Record<TriadQuality, string> = {
  major: "",
  minor: "m",
  diminished: "°",
  augmented: "+",
};
const FUNCTIONS: Partial<Record<number, HarmonicFunction>> = {
  1: "tonic",
  4: "subdominant",
  5: "dominant",
};

function triadQuality(third: number, fifth: number): TriadQuality {
  if (third === 4) return fifth === 8 ? "augmented" : "major";
  return fifth === 6 ? "diminished" : "minor";
}

/** The seven triads built by stacking thirds within the key's scale. */
export function diatonicTriads(k: Key): DiatonicTriad[] {
  const scale = keyScale(k);
  const at = (i: number) => scale[i % 7] ?? k.tonic;
  return scale.map((root, i) => {
    const notes = [root, at(i + 2), at(i + 4)];
    const quality = triadQuality(
      mod12(pitchClass(at(i + 2)) - pitchClass(root)),
      mod12(pitchClass(at(i + 4)) - pitchClass(root)),
    );
    const numeral = ROMAN[i] ?? "";
    const roman =
      quality === "major"
        ? numeral
        : quality === "augmented"
          ? `${numeral}+`
          : quality === "diminished"
            ? `${numeral.toLowerCase()}°`
            : numeral.toLowerCase();
    const degree = i + 1;
    const fn = FUNCTIONS[degree];
    return {
      degree,
      roman,
      quality,
      notes,
      symbol: formatNote(root) + SYMBOL_SUFFIX[quality],
      ...(fn ? { function: fn } : {}),
    };
  });
}

/**
 * In harmonic minor the seventh degree is raised, which turns the minor v
 * into a major V: E major in A minor. Undefined for major keys.
 */
export function harmonicMinorDominant(k: Key): Chord | undefined {
  return k.mode === "minor" ? buildChord(transpose(k.tonic, PERFECT_FIFTH), "major") : undefined;
}

// --- Rings of the extended circle ---------------------------------------------

export type RingId = "major" | "minor" | "diminished";

export interface RingChord {
  readonly ring: RingId;
  /** Position on the circle (0 = C major / A minor / B°). */
  readonly position: number;
  readonly root: Note;
  readonly notes: readonly Note[];
  /** Chord symbol, e.g. "C", "Am" or "B°". */
  readonly symbol: string;
}

const RING_QUALITY: Record<RingId, ChordQualityId> = {
  major: "major",
  minor: "minor",
  diminished: "diminished",
};

function ringChord(ring: RingId, position: number, root: Note): RingChord {
  const quality = RING_QUALITY[ring];
  return {
    ring,
    position: mod12(position),
    root,
    notes: buildChord(root, quality).tones.map((t) => t.note),
    symbol: chordSymbol(root, quality),
  };
}

/**
 * The three chords at `position`, one list per ring. Each list has one entry
 * per spelling of the major key there (see `keysAt`), in the same order:
 * C / Am / B° at 0, B / G♯m / A♯° and C♭ / A♭m / B♭° at 5. The diminished
 * chord is vii° of the major key and ii° of its relative minor.
 */
export function ringChords(position: number): Record<RingId, RingChord[]> {
  const majors = keysAt(position, "major");
  return {
    major: majors.map((m) => ringChord("major", position, m.tonic)),
    minor: majors.map((m) => ringChord("minor", position, relativeKey(m).tonic)),
    diminished: majors.map((m) =>
      ringChord("diminished", position, transpose(m.tonic, MAJOR_SEVENTH)),
    ),
  };
}

export interface BlockChord {
  /** Scale degree, 1–7. */
  readonly degree: number;
  readonly roman: string;
  readonly function?: HarmonicFunction;
  readonly chord: RingChord;
}

export interface DiatonicBlock {
  /** The seven diatonic triads placed on the rings, in scale-degree order. */
  readonly chords: readonly BlockChord[];
  /** Minor keys only: V and vii° of harmonic minor, which lie outside the block. */
  readonly harmonicMinor?: { readonly dominant: RingChord; readonly leadingTone: RingChord };
}

/** Ring and offset from the key's circle position, per scale degree 1–7. */
const BLOCK_MAJOR: readonly (readonly [RingId, number])[] = [
  ["major", 0], // I
  ["minor", -1], // ii
  ["minor", 1], // iii
  ["major", -1], // IV
  ["major", 1], // V
  ["minor", 0], // vi
  ["diminished", 0], // vii°
];
const BLOCK_MINOR: readonly (readonly [RingId, number])[] = [
  ["minor", 0], // i
  ["diminished", 0], // ii°
  ["major", 0], // III
  ["minor", -1], // iv
  ["minor", 1], // v
  ["major", -1], // VI
  ["major", 1], // VII
];

/**
 * The key's seven chords as a block on the rings. The shape is the same for
 * every key: IV I V outside, ii vi iii in the middle and vii° inside, with
 * the same offsets for a minor key (VI III VII, iv i v, ii°). Spelling
 * follows the key.
 */
export function diatonicBlock(k: Key): DiatonicBlock {
  const center = circlePosition(k);
  const layout = k.mode === "major" ? BLOCK_MAJOR : BLOCK_MINOR;
  const chords = diatonicTriads(k).map((triad, i): BlockChord => {
    const [ring, offset] = layout[i] ?? ["major", 0];
    return {
      degree: triad.degree,
      roman: triad.roman,
      ...(triad.function ? { function: triad.function } : {}),
      chord: ringChord(ring, center + offset, triad.notes[0] ?? k.tonic),
    };
  });
  const dominant = harmonicMinorDominant(k);
  if (!dominant) return { chords };
  const leading = transpose(k.tonic, MAJOR_SEVENTH);
  return {
    chords,
    harmonicMinor: {
      dominant: ringChord("major", circlePosition(key(dominant.root, "major")), dominant.root),
      leadingTone: ringChord("diminished", circlePosition(key(k.tonic, "major")), leading),
    },
  };
}

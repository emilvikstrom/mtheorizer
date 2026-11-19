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

/** A diatonic chord of the parallel key, used in this key (modal interchange). */
export interface BorrowedChord {
  /** Scale degree in the parallel key, 1–7. */
  readonly degree: number;
  /** Roman numeral relative to this key: ♭III, iv, ♭VI, ♭VII, ii°, I, ii, IV. */
  readonly roman: string;
  readonly quality: TriadQuality;
  readonly notes: readonly Note[];
  /** Chord symbol, e.g. "A♭" or "Fm". */
  readonly symbol: string;
  /** The key the chord comes from: C minor for A♭ in C major. */
  readonly origin: Key;
}

/** Degrees borrowed from the parallel minor in a major key: ii°, ♭III, iv, ♭VI, ♭VII. */
const BORROWED_FROM_MINOR: readonly number[] = [2, 3, 4, 6, 7];
/**
 * Degrees borrowed from the parallel major in a minor key: I (the "Picardy"
 * major tonic), ii and IV. The major V is left out, since harmonic minor
 * already gives it (see `harmonicMinorDominant`).
 */
const BORROWED_FROM_MAJOR: readonly number[] = [1, 2, 4];

/**
 * Chords borrowed from the parallel key (same tonic, other mode): from C minor
 * into C major (D°, E♭, Fm, A♭ and B♭), and from C major into C minor (C, Dm and
 * F). Only chords that the key does not already have are included. The origin
 * is spelled from this key's own tonic, so D♭ major borrows from D♭ minor
 * (with B𝄫) rather than from the enharmonic C♯ minor.
 */
export function borrowedChords(k: Key): BorrowedChord[] {
  const fromMinor = k.mode === "major";
  const origin = key(k.tonic, fromMinor ? "minor" : "major");
  const degrees = fromMinor ? BORROWED_FROM_MINOR : BORROWED_FROM_MAJOR;
  const own = new Set(diatonicTriads(k).map((t) => t.symbol));
  return diatonicTriads(origin)
    .filter((t) => degrees.includes(t.degree) && !own.has(t.symbol))
    .map((t) => ({
      degree: t.degree,
      roman: fromMinor && [3, 6, 7].includes(t.degree) ? `♭${t.roman}` : t.roman,
      quality: t.quality,
      notes: t.notes,
      symbol: t.symbol,
      origin,
    }));
}

/** A dominant seventh that points at another chord of the key: D7 → G in C major (V7/V). */
export interface SecondaryDominant {
  /** Scale degree of the chord it resolves to, 2–7 (never the tonic: V7/I is just V7). */
  readonly target: number;
  /** Roman numeral with the target: V7/V, V7/ii, V7/vi. */
  readonly roman: string;
  /** The chord it resolves to, e.g. "G" or "Am". */
  readonly targetSymbol: string;
  readonly notes: readonly Note[];
  /** Chord symbol of the dominant seventh, e.g. "D7". */
  readonly symbol: string;
  /**
   * Notes that are not in the key's scale: F♯ in D7 (C major). Empty only for
   * V7/III in a minor key, where the chord (B♭7 in C minor) is the diatonic VII7.
   */
  readonly foreign: readonly Note[];
}

/**
 * The secondary dominants of a key: a dominant seventh a perfect fifth above
 * each diatonic major or minor chord except the tonic. In C major that is
 * D7 (V7/V), E7 (V7/vi), A7 (V7/ii), B7 (V7/iii) and C7 (V7/IV). The
 * diminished chord on the seventh degree is not tonicised, so it has none.
 * Roots are spelled a fifth up from the target (B7 for Em, never C♭7), and
 * the notes outside the key are listed, since they are what colours the chord.
 */
export function secondaryDominants(k: Key): SecondaryDominant[] {
  const scale = new Set(keyScale(k).map((n) => formatNote(n)));
  return diatonicTriads(k)
    .filter((t) => t.degree !== 1 && (t.quality === "major" || t.quality === "minor"))
    .map((t) => {
      const root = transpose(t.notes[0] ?? k.tonic, PERFECT_FIFTH);
      const notes = buildChord(root, "dominant7").tones.map((tone) => tone.note);
      return {
        target: t.degree,
        roman: `V7/${t.roman}`,
        targetSymbol: t.symbol,
        notes,
        symbol: chordSymbol(root, "dominant7"),
        foreign: notes.filter((n) => !scale.has(formatNote(n))),
      };
    });
}

/** Which seventh chord a secondary leading-tone chord is: fully (°7) or half (ø7) diminished. */
export type LeadingToneVariant = "diminished" | "halfDiminished";

export interface SecondaryLeadingToneChord {
  /** Scale degree of the chord it resolves to, 2–7 (never the tonic: vii°7/I is just vii°7). */
  readonly target: number;
  /** Roman numeral with the target: vii°7/V, viiø7/V, vii°7/ii. */
  readonly roman: string;
  /** The chord it resolves to, e.g. "G" or "Am". */
  readonly targetSymbol: string;
  readonly notes: readonly Note[];
  /** Chord symbol of the seventh chord, e.g. "F♯°7" or "F♯m7♭5". */
  readonly symbol: string;
  /** The quality built: diminished7, or halfDiminished7 for a major target in the ø7 variant. */
  readonly quality: ChordQualityId;
  /** Notes that are not in the key's scale: F♯ and A♭ in F♯°7 (C major). */
  readonly foreign: readonly Note[];
}

/**
 * The secondary leading-tone chords of a key: a fully diminished seventh chord
 * built on the leading tone of each diatonic major or minor chord except the
 * tonic. In C major that is C♯°7 (vii°7/ii), D♯°7 (vii°7/iii), E°7 (vii°7/IV),
 * F♯°7 (vii°7/V) and G♯°7 (vii°7/vi). The diminished chord on the seventh
 * degree is not tonicised, so it has none.
 *
 * Roots are spelled a major seventh above the target (F♯ for G, never G♭), so
 * the leading tone sits a letter and a half step below the target's root.
 *
 * With the "halfDiminished" variant a major target gets viiø7/x instead (F♯ø7 → G,
 * which is the key's own viiø7 over that target). Minor targets keep °7, since
 * harmonic minor gives the fully diminished chord there.
 */
export function secondaryLeadingToneChords(
  k: Key,
  variant: LeadingToneVariant = "diminished",
): SecondaryLeadingToneChord[] {
  const scale = new Set(keyScale(k).map((n) => formatNote(n)));
  return diatonicTriads(k)
    .filter((t) => t.degree !== 1 && (t.quality === "major" || t.quality === "minor"))
    .map((t) => {
      const root = transpose(t.notes[0] ?? k.tonic, MAJOR_SEVENTH);
      const quality: ChordQualityId =
        variant === "halfDiminished" && t.quality === "major" ? "halfDiminished7" : "diminished7";
      const notes = buildChord(root, quality).tones.map((tone) => tone.note);
      return {
        target: t.degree,
        roman: `vii${quality === "halfDiminished7" ? "ø" : "°"}7/${t.roman}`,
        targetSymbol: t.symbol,
        notes,
        symbol: chordSymbol(root, quality),
        quality,
        foreign: notes.filter((n) => !scale.has(formatNote(n))),
      };
    });
}

export interface DiatonicSeventh {
  /** Scale degree, 1–7. */
  readonly degree: number;
  /** Roman numeral with the seventh: Imaj7, ii7, V7, viiø7. */
  readonly roman: string;
  readonly quality: ChordQualityId;
  readonly notes: readonly Note[];
  /** Chord symbol, e.g. "Cmaj7" or "Bm7♭5". */
  readonly symbol: string;
  readonly function?: HarmonicFunction;
}

const SEVENTH_ROMAN_SUFFIX: Partial<Record<ChordQualityId, string>> = {
  major7: "maj7",
  dominant7: "7",
  minor7: "7",
  halfDiminished7: "ø7",
};

function seventhQuality(triad: TriadQuality, seventh: number): ChordQualityId {
  if (triad === "major") return seventh === 11 ? "major7" : "dominant7";
  if (triad === "diminished") return seventh === 9 ? "diminished7" : "halfDiminished7";
  return seventh === 11 ? "minorMajor7" : "minor7";
}

/**
 * The seven chords built by stacking four thirds within the key's scale: Imaj7,
 * ii7, iii7, IVmaj7, V7, vi7 and viiø7 in a major key; i7, iiø7, IIImaj7, iv7,
 * v7, VImaj7 and VII7 in natural minor. Spelling follows the key.
 */
export function diatonicSevenths(k: Key): DiatonicSeventh[] {
  const scale = keyScale(k);
  const at = (i: number) => scale[i % 7] ?? k.tonic;
  return diatonicTriads(k).map((triad, i) => {
    const root = triad.notes[0] ?? k.tonic;
    const quality = seventhQuality(triad.quality, mod12(pitchClass(at(i + 6)) - pitchClass(root)));
    const numeral = triad.roman.replace("°", "");
    const upper = triad.quality === "major" ? numeral : numeral.toLowerCase();
    return {
      degree: triad.degree,
      roman: `${upper}${SEVENTH_ROMAN_SUFFIX[quality] ?? ""}`,
      quality,
      notes: buildChord(root, quality).tones.map((t) => t.note),
      symbol: chordSymbol(root, quality),
      ...(triad.function ? { function: triad.function } : {}),
    };
  });
}

// --- Rings of the extended circle ---------------------------------------------

export type RingId = "major" | "minor" | "diminished";

/** What the rings hold: triads, or seventh chords (maj7, m7, m7♭5 and V7). */
export type ChordSize = "triads" | "sevenths";

export interface RingChord {
  readonly ring: RingId;
  /** Position on the circle (0 = C major / A minor / B°). */
  readonly position: number;
  readonly root: Note;
  readonly notes: readonly Note[];
  readonly quality: ChordQualityId;
  /** Chord symbol, e.g. "C", "Am" or "B°", or with sevenths "Cmaj7", "Am7" or "Bm7♭5". */
  readonly symbol: string;
}

const RING_QUALITY: Record<ChordSize, Record<RingId, ChordQualityId>> = {
  triads: { major: "major", minor: "minor", diminished: "diminished" },
  sevenths: { major: "major7", minor: "minor7", diminished: "halfDiminished7" },
};

function ringChord(
  ring: RingId,
  position: number,
  root: Note,
  size: ChordSize,
  quality: ChordQualityId = RING_QUALITY[size][ring],
): RingChord {
  return {
    ring,
    position: mod12(position),
    root,
    quality,
    notes: buildChord(root, quality).tones.map((t) => t.note),
    symbol: chordSymbol(root, quality),
  };
}

/**
 * The three chords at `position`, one list per ring. Each list has one entry
 * per spelling of the major key there (see `keysAt`), in the same order:
 * C / Am / B° at 0, B / G♯m / A♯° and C♭ / A♭m / B♭° at 5. The diminished
 * chord is vii° of the major key and ii° of its relative minor. With
 * `sevenths` the rings hold maj7, m7 and m7♭5.
 */
export function ringChords(
  position: number,
  size: ChordSize = "triads",
): Record<RingId, RingChord[]> {
  const majors = keysAt(position, "major");
  return {
    major: majors.map((m) => ringChord("major", position, m.tonic, size)),
    minor: majors.map((m) => ringChord("minor", position, relativeKey(m).tonic, size)),
    diminished: majors.map((m) =>
      ringChord("diminished", position, transpose(m.tonic, MAJOR_SEVENTH), size),
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
 * follows the key. With `sevenths` the block holds the diatonic seventh chords
 * (Imaj7 … viiø7): the dominant sits on the major ring as V7 and, in a minor
 * key, VII is a dominant seventh. V and vii° of harmonic minor become V7 and
 * vii°7.
 */
export function diatonicBlock(k: Key, size: ChordSize = "triads"): DiatonicBlock {
  const center = circlePosition(k);
  const layout = k.mode === "major" ? BLOCK_MAJOR : BLOCK_MINOR;
  const entries: readonly (DiatonicTriad | DiatonicSeventh)[] =
    size === "sevenths" ? diatonicSevenths(k) : diatonicTriads(k);
  const chords = entries.map((entry, i): BlockChord => {
    const [ring, offset] = layout[i] ?? ["major", 0];
    return {
      degree: entry.degree,
      roman: entry.roman,
      ...(entry.function ? { function: entry.function } : {}),
      chord: ringChord(
        ring,
        center + offset,
        entry.notes[0] ?? k.tonic,
        size,
        "quality" in entry && size === "sevenths" ? entry.quality : undefined,
      ),
    };
  });
  const dominant = harmonicMinorDominant(k);
  if (!dominant) return { chords };
  const leading = transpose(k.tonic, MAJOR_SEVENTH);
  const sevenths = size === "sevenths";
  return {
    chords,
    harmonicMinor: {
      dominant: ringChord(
        "major",
        circlePosition(key(dominant.root, "major")),
        dominant.root,
        size,
        sevenths ? "dominant7" : undefined,
      ),
      leadingTone: ringChord(
        "diminished",
        circlePosition(key(k.tonic, "major")),
        leading,
        size,
        sevenths ? "diminished7" : undefined,
      ),
    },
  };
}

// --- Rotating degree ring -----------------------------------------------------

export interface WheelStep {
  /** Scale degree, 1–7. */
  readonly degree: number;
  readonly roman: string;
  readonly function?: HarmonicFunction;
  readonly root: Note;
  /** Position of the chord's root on the circle of fifths (C = 0, G = 1 …). */
  readonly slot: number;
  /** `slot` relative to the key's own position, from -6 to 5. */
  readonly offset: number;
}

/**
 * The seven chords of the key as steps on a ring that is turned so that I (or
 * i) sits at the key's tonic. Chords a fifth apart are neighbours, so the
 * roots always fill seven consecutive positions of the circle, IV I V ii vi
 * iii vii° in a major key. The offsets are the same in every key and for
 * both modes, which is why one ring can be rotated to any key. In a minor key
 * the ring uses the minor numbering (VI III VII iv i v ii°) on the same roots.
 */
export function degreeWheel(k: Key): { position: number; steps: readonly WheelStep[] } {
  const position = circlePosition(k);
  const steps = diatonicTriads(k).map((triad): WheelStep => {
    const root = triad.notes[0] ?? k.tonic;
    const slot = mod12(pitchClass(root) * 7);
    return {
      degree: triad.degree,
      roman: triad.roman,
      ...(triad.function ? { function: triad.function } : {}),
      root,
      slot,
      offset: mod12(slot - position + 6) - 6,
    };
  });
  return { position, steps };
}

// --- Falling fifths ---------------------------------------------------------

/** One chord of a chain that falls a fifth at a time. */
export interface FifthsFallStep {
  /** Step number in the key: vi ii V I, or ii° V i in a minor key. */
  readonly roman: string;
  readonly chord: Chord;
  /** Where the chord's root sits on the circle of fifths (C at 0, G at 1 …). */
  readonly position: number;
}

const TRIAD_QUALITY_ID: Partial<Record<TriadQuality, ChordQualityId>> = {
  major: "major",
  minor: "minor",
  diminished: "diminished",
};

/**
 * The chain that ends on the tonic by falling a fifth at a time, the most common
 * root movement: vi–ii–V–I in a major key (A–D–G–C in C) and ii°–V–i in a minor
 * key (B–E–A in A minor), where V is major as in harmonic minor. Each root is
 * a fifth below the one before it, which is one step counterclockwise on the
 * circle, so the positions run down by one. Spelled from the key's own scale.
 */
export function fifthsFall(k: Key): FifthsFallStep[] {
  const triads = diatonicTriads(k);
  const degrees = k.mode === "major" ? [6, 2, 5, 1] : [2, 5, 1];
  return degrees.flatMap((degree): FifthsFallStep[] => {
    const triad = triads.find((t) => t.degree === degree);
    const root = triad?.notes[0];
    const qualityId = triad && TRIAD_QUALITY_ID[triad.quality];
    if (!triad || !root || !qualityId) return [];
    const harmonicDominant =
      k.mode === "minor" && degree === 5 ? harmonicMinorDominant(k) : undefined;
    return [
      {
        roman: harmonicDominant ? "V" : triad.roman,
        chord: harmonicDominant ?? buildChord(root, qualityId),
        position: mod12(pitchClass(root) * 7),
      },
    ];
  });
}

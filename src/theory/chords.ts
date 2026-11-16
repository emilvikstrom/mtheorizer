import {
  AUGMENTED_ELEVENTH,
  AUGMENTED_FIFTH,
  AUGMENTED_NINTH,
  DIMINISHED_FIFTH,
  DIMINISHED_SEVENTH,
  type Interval,
  MAJOR_NINTH,
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MAJOR_THIRD,
  MAJOR_THIRTEENTH,
  MINOR_NINTH,
  MINOR_THIRTEENTH,
  MINOR_SEVENTH,
  MINOR_THIRD,
  PERFECT_ELEVENTH,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  PERFECT_UNISON,
  transpose,
} from "./intervals";
import { type Note, commonSpellings, formatNote } from "./notes";
import { MAJOR_SCALE, NATURAL_MINOR_SCALE, type Scale, preferredTonicSpelling } from "./scales";

/** The function a tone has in the chord. */
export type ChordRole =
  | "root"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "sixth"
  | "seventh"
  | "ninth"
  | "eleventh"
  | "thirteenth";

export interface ChordToneSpec {
  readonly role: ChordRole;
  readonly interval: Interval;
  /**
   * The tone may be left out when the chord is played, as guitarists and
   * pianists usually do with the perfect fifth in seventh chords and larger.
   */
  readonly optional: boolean;
}

function spec(role: ChordRole, interval: Interval, optional = false): ChordToneSpec {
  return { role, interval, optional };
}

const ROOT = spec("root", PERFECT_UNISON);
const MAJ2 = spec("second", MAJOR_SECOND);
const MIN3 = spec("third", MINOR_THIRD);
const MAJ3 = spec("third", MAJOR_THIRD);
const P4 = spec("fourth", PERFECT_FOURTH);
const P5 = spec("fifth", PERFECT_FIFTH);
/** The perfect fifth in a chord of four tones or more adds little colour and is often dropped. */
const P5_OPTIONAL = spec("fifth", PERFECT_FIFTH, true);
const DIM5 = spec("fifth", DIMINISHED_FIFTH);
const AUG5 = spec("fifth", AUGMENTED_FIFTH);
const MAJ6 = spec("sixth", MAJOR_SIXTH);
const DIM7 = spec("seventh", DIMINISHED_SEVENTH);
const MIN7 = spec("seventh", MINOR_SEVENTH);
const MAJ7 = spec("seventh", MAJOR_SEVENTH);
const MIN9 = spec("ninth", MINOR_NINTH);
const MAJ9 = spec("ninth", MAJOR_NINTH);
/** In eleventh and thirteenth chords the ninth is often dropped too. */
const MAJ9_OPTIONAL = spec("ninth", MAJOR_NINTH, true);
const AUG9 = spec("ninth", AUGMENTED_NINTH);
const P11 = spec("eleventh", PERFECT_ELEVENTH);
const P11_OPTIONAL = spec("eleventh", PERFECT_ELEVENTH, true);
const AUG11 = spec("eleventh", AUGMENTED_ELEVENTH);
const MIN13 = spec("thirteenth", MINOR_THIRTEENTH);
const MAJ13 = spec("thirteenth", MAJOR_THIRTEENTH);

/** Families of chords, in the order the chord picker shows them. */
export const CHORD_GROUPS = [
  { id: "triads", name: "Triads" },
  { id: "sixths", name: "Sixths" },
  { id: "sevenths", name: "Sevenths" },
  { id: "ninths", name: "Ninths" },
  { id: "elevenths", name: "Elevenths" },
  { id: "thirteenths", name: "Thirteenths" },
  { id: "added", name: "Added tones" },
] as const;

export type ChordGroupId = (typeof CHORD_GROUPS)[number]["id"];

interface QualityDefinition {
  readonly group: ChordGroupId;
  /** Name used after the root, e.g. "minor seventh" in "C minor seventh". */
  readonly name: string;
  /** Suffix in chord symbols, e.g. "m7" in "Cm7". */
  readonly symbol: string;
  readonly tones: readonly ChordToneSpec[];
}

/**
 * Every chord quality, by id. Extensions are stacked in thirds above the
 * octave (ninth, eleventh, thirteenth). In the dominant and major thirteenth
 * chords the eleventh is left out, since it clashes with the major third.
 */
const DEFINITIONS = {
  // Triads
  major: { group: "triads", name: "major", symbol: "", tones: [ROOT, MAJ3, P5] },
  minor: { group: "triads", name: "minor", symbol: "m", tones: [ROOT, MIN3, P5] },
  diminished: { group: "triads", name: "diminished", symbol: "°", tones: [ROOT, MIN3, DIM5] },
  augmented: { group: "triads", name: "augmented", symbol: "+", tones: [ROOT, MAJ3, AUG5] },
  sus2: { group: "triads", name: "suspended second", symbol: "sus2", tones: [ROOT, MAJ2, P5] },
  sus4: { group: "triads", name: "suspended fourth", symbol: "sus4", tones: [ROOT, P4, P5] },
  power: { group: "triads", name: "power chord", symbol: "5", tones: [ROOT, P5] },

  // Sixths
  major6: {
    group: "sixths",
    name: "major sixth",
    symbol: "6",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ6],
  },
  minor6: {
    group: "sixths",
    name: "minor sixth",
    symbol: "m6",
    tones: [ROOT, MIN3, P5_OPTIONAL, MAJ6],
  },
  sixNine: {
    group: "sixths",
    name: "six-nine",
    symbol: "6/9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ6, MAJ9],
  },
  minorSixNine: {
    group: "sixths",
    name: "minor six-nine",
    symbol: "m6/9",
    tones: [ROOT, MIN3, P5_OPTIONAL, MAJ6, MAJ9],
  },

  // Sevenths
  major7: {
    group: "sevenths",
    name: "major seventh",
    symbol: "maj7",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ7],
  },
  dominant7: {
    group: "sevenths",
    name: "dominant seventh",
    symbol: "7",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7],
  },
  minor7: {
    group: "sevenths",
    name: "minor seventh",
    symbol: "m7",
    tones: [ROOT, MIN3, P5_OPTIONAL, MIN7],
  },
  minorMajor7: {
    group: "sevenths",
    name: "minor major seventh",
    symbol: "m(maj7)",
    tones: [ROOT, MIN3, P5_OPTIONAL, MAJ7],
  },
  halfDiminished7: {
    group: "sevenths",
    name: "half-diminished seventh",
    symbol: "m7♭5",
    tones: [ROOT, MIN3, DIM5, MIN7],
  },
  diminished7: {
    group: "sevenths",
    name: "diminished seventh",
    symbol: "°7",
    tones: [ROOT, MIN3, DIM5, DIM7],
  },
  augmented7: {
    group: "sevenths",
    name: "augmented seventh",
    symbol: "7♯5",
    tones: [ROOT, MAJ3, AUG5, MIN7],
  },
  augmentedMajor7: {
    group: "sevenths",
    name: "augmented major seventh",
    symbol: "maj7♯5",
    tones: [ROOT, MAJ3, AUG5, MAJ7],
  },
  dominant7Flat5: {
    group: "sevenths",
    name: "dominant seventh flat five",
    symbol: "7♭5",
    tones: [ROOT, MAJ3, DIM5, MIN7],
  },
  dominant7Sus4: {
    group: "sevenths",
    name: "dominant seventh suspended fourth",
    symbol: "7sus4",
    tones: [ROOT, P4, P5_OPTIONAL, MIN7],
  },

  // Ninths
  major9: {
    group: "ninths",
    name: "major ninth",
    symbol: "maj9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ7, MAJ9],
  },
  dominant9: {
    group: "ninths",
    name: "dominant ninth",
    symbol: "9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, MAJ9],
  },
  minor9: {
    group: "ninths",
    name: "minor ninth",
    symbol: "m9",
    tones: [ROOT, MIN3, P5_OPTIONAL, MIN7, MAJ9],
  },
  dominant7Flat9: {
    group: "ninths",
    name: "dominant seventh flat nine",
    symbol: "7♭9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, MIN9],
  },
  dominant7Sharp9: {
    group: "ninths",
    name: "dominant seventh sharp nine",
    symbol: "7♯9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, AUG9],
  },
  minorMajor9: {
    group: "ninths",
    name: "minor major ninth",
    symbol: "m(maj9)",
    tones: [ROOT, MIN3, P5_OPTIONAL, MAJ7, MAJ9],
  },
  dominant7Sharp5Sharp9: {
    group: "ninths",
    name: "dominant seventh sharp five sharp nine",
    symbol: "7♯5♯9",
    tones: [ROOT, MAJ3, AUG5, MIN7, AUG9],
  },
  dominant9Sus4: {
    group: "ninths",
    name: "dominant ninth suspended fourth",
    symbol: "9sus4",
    tones: [ROOT, P4, P5_OPTIONAL, MIN7, MAJ9],
  },

  // Elevenths
  dominant11: {
    group: "elevenths",
    name: "dominant eleventh",
    symbol: "11",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, MAJ9_OPTIONAL, P11],
  },
  minor11: {
    group: "elevenths",
    name: "minor eleventh",
    symbol: "m11",
    tones: [ROOT, MIN3, P5_OPTIONAL, MIN7, MAJ9_OPTIONAL, P11],
  },
  dominant7Sharp11: {
    group: "elevenths",
    name: "dominant seventh sharp eleven",
    symbol: "7♯11",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, AUG11],
  },
  major7Sharp11: {
    group: "elevenths",
    name: "major seventh sharp eleven",
    symbol: "maj7♯11",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ7, AUG11],
  },

  // Thirteenths
  dominant13: {
    group: "thirteenths",
    name: "dominant thirteenth",
    symbol: "13",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, MAJ9_OPTIONAL, MAJ13],
  },
  major13: {
    group: "thirteenths",
    name: "major thirteenth",
    symbol: "maj13",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ7, MAJ9_OPTIONAL, MAJ13],
  },
  minor13: {
    group: "thirteenths",
    name: "minor thirteenth",
    symbol: "m13",
    tones: [ROOT, MIN3, P5_OPTIONAL, MIN7, MAJ9_OPTIONAL, P11_OPTIONAL, MAJ13],
  },
  dominant7Flat13: {
    group: "thirteenths",
    name: "dominant seventh flat thirteen",
    symbol: "7♭13",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MIN7, MIN13],
  },
  dominant13Sus4: {
    group: "thirteenths",
    name: "dominant thirteenth suspended fourth",
    symbol: "13sus4",
    tones: [ROOT, P4, P5_OPTIONAL, MIN7, MAJ9_OPTIONAL, MAJ13],
  },

  // Added tones: a triad plus one tone, without a seventh
  add2: {
    group: "added",
    name: "added second",
    symbol: "add2",
    tones: [ROOT, MAJ2, MAJ3, P5_OPTIONAL],
  },
  add4: {
    group: "added",
    name: "added fourth",
    symbol: "add4",
    tones: [ROOT, MAJ3, P4, P5_OPTIONAL],
  },
  add9: {
    group: "added",
    name: "added ninth",
    symbol: "add9",
    tones: [ROOT, MAJ3, P5_OPTIONAL, MAJ9],
  },
  minorAdd9: {
    group: "added",
    name: "minor added ninth",
    symbol: "m(add9)",
    tones: [ROOT, MIN3, P5_OPTIONAL, MAJ9],
  },
  add11: {
    group: "added",
    name: "added eleventh",
    symbol: "add11",
    tones: [ROOT, MAJ3, P5_OPTIONAL, P11],
  },
} as const satisfies Record<string, QualityDefinition>;

export type ChordQualityId = keyof typeof DEFINITIONS;

export interface ChordQuality extends QualityDefinition {
  readonly id: ChordQualityId;
  /**
   * The key whose signature breaks ties when spelling a black-key root:
   * the minor key for chords with a minor third, otherwise the major key.
   */
  readonly keyScale: Scale;
}

/** All quality ids, in picker order. */
export const CHORD_QUALITY_IDS = Object.keys(DEFINITIONS) as ChordQualityId[];

function quality(id: ChordQualityId): ChordQuality {
  const definition: QualityDefinition = DEFINITIONS[id];
  const hasMinorThird = definition.tones.some((t) => t.interval === MINOR_THIRD);
  return { id, ...definition, keyScale: hasMinorThird ? NATURAL_MINOR_SCALE : MAJOR_SCALE };
}

export const CHORD_QUALITIES = Object.fromEntries(
  CHORD_QUALITY_IDS.map((id) => [id, quality(id)]),
) as Record<ChordQualityId, ChordQuality>;

export function qualitiesInGroup(group: ChordGroupId): ChordQuality[] {
  return CHORD_QUALITY_IDS.map((id) => CHORD_QUALITIES[id]).filter((q) => q.group === group);
}

export interface ChordTone extends ChordToneSpec {
  readonly note: Note;
}

/** How to describe a tone to the reader: "Root", "Minor third", "Major ninth". */
export function toneLabel(tone: ChordTone): string {
  return tone.role === "root" ? "Root" : tone.interval.name;
}

export interface Chord {
  readonly root: Note;
  /** The named chord quality; a free combination from the chord builder (C7♭5♭9) has none. */
  readonly quality?: ChordQuality;
  readonly tones: readonly ChordTone[];
  /** E.g. "E♭ minor seventh". */
  readonly name: string;
  /** E.g. "E♭m7". */
  readonly symbol: string;
}

/** The chord symbol for `quality` on `root`, e.g. "B♭7". */
export function chordSymbol(root: Note, qualityId: ChordQualityId): string {
  return `${formatNote(root)}${CHORD_QUALITIES[qualityId].symbol}`;
}

export function buildChord(root: Note, qualityId: ChordQualityId): Chord {
  const quality = CHORD_QUALITIES[qualityId];
  const tones = quality.tones.map((tone) => ({ ...tone, note: transpose(root, tone.interval) }));
  return {
    root,
    quality,
    tones,
    name: `${formatNote(root)} ${quality.name}`,
    symbol: chordSymbol(root, qualityId),
  };
}

/** Sharps and flats in the chord, a double sharp or flat counting as two. */
function accidentalsIn(root: Note, quality: ChordQuality): number {
  return quality.tones.reduce(
    (sum, { interval }) => sum + Math.abs(transpose(root, interval).accidental),
    0,
  );
}

/**
 * How to spell the root of a chord on pitch class `pc`. White keys are always
 * natural. A black key gets the spelling that gives the chord the fewest
 * accidentals: D♭ major (D♭–F–A♭) but C♯ minor (C♯–E–G♯), C♯° (C♯–E–G) and
 * G♭+ (G♭–B♭–D). On a tie the chord's key decides, as with
 * `preferredTonicSpelling`: F♯ major, E♭ minor.
 */
export function preferredRootSpelling(pc: number, qualityId: ChordQualityId): Note {
  const quality = CHORD_QUALITIES[qualityId];
  const [first, second] = commonSpellings(pc);
  if (!first) throw new Error(`No spelling for pitch class ${pc}`);
  if (!second) return first;
  const diff = accidentalsIn(first, quality) - accidentalsIn(second, quality);
  if (diff !== 0) return diff < 0 ? first : second;
  return preferredTonicSpelling(pc, quality.keyScale);
}

/** The chord on pitch class `pc` (0 = C … 11 = B), with its root spelled the usual way. */
export function chordOnPitchClass(pc: number, qualityId: ChordQualityId): Chord {
  return buildChord(preferredRootSpelling(pc, qualityId), qualityId);
}

import {
  AUGMENTED_FIFTH,
  AUGMENTED_FOURTH,
  DIMINISHED_FIFTH,
  DIMINISHED_FOURTH,
  type Interval,
  MINOR_SECOND,
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
} from "./intervals";
import { type Note, formatNote, mod12, noteEquals, spellingsOf } from "./notes";

export type ScaleId =
  | "major"
  | "naturalMinor"
  | "harmonicMinor"
  | "melodicMinor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian"
  | "lydianDominant"
  | "altered"
  | "wholeTone"
  | "diminishedWholeHalf"
  | "diminishedHalfWhole"
  | "majorPentatonic"
  | "minorPentatonic"
  | "minorBlues"
  | "majorBlues"
  | "dorianFlat2"
  | "lydianAugmented"
  | "mixolydianFlat6"
  | "locrianNatural2"
  | "phrygianDominant"
  | "hungarianMinor"
  | "doubleHarmonic"
  | "bebopDominant"
  | "hirajoshi"
  | "inSen";

export type ScaleGroupId =
  | "minor"
  | "modes"
  | "melodicModes"
  | "harmonicModes"
  | "jazz"
  | "symmetric"
  | "pentatonic"
  | "world";

export interface Scale {
  readonly id: ScaleId;
  /** E.g. "Natural minor". */
  readonly name: string;
  /** Other name for the same scale, e.g. "Ionian" for major. */
  readonly alias?: string;
  /** Intervals of each degree above the tonic. */
  readonly degrees: readonly Interval[];
  /**
   * Black-key tonics whose two spellings give key signatures with equally many
   * accidentals, mapped to the spelling most often seen in lead sheets.
   */
  readonly tieBreaks: Partial<Record<number, Note>>;
}

const sharp = (letter: Note["letter"]): Note => ({ letter, accidental: 1 });
const flat = (letter: Note["letter"]): Note => ({ letter, accidental: -1 });

function scaleOf(
  id: ScaleId,
  name: string,
  degrees: readonly Interval[],
  tieBreaks: Partial<Record<number, Note>> = {},
  alias?: string,
): Scale {
  return {
    id,
    name,
    degrees: [PERFECT_UNISON, ...degrees],
    tieBreaks,
    ...(alias ? { alias } : {}),
  };
}

export const MAJOR_SCALE = scaleOf(
  "major",
  "Major",
  [MAJOR_SECOND, MAJOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MAJOR_SIXTH, MAJOR_SEVENTH],
  // F♯ major (6♯), not G♭ major (6♭).
  { 6: sharp("F") },
  "Ionian",
);

export const NATURAL_MINOR_SCALE = scaleOf(
  "naturalMinor",
  "Natural minor",
  [MAJOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SIXTH, MINOR_SEVENTH],
  // E♭ minor (6♭), not D♯ minor (6♯).
  { 3: flat("E") },
  "Aeolian",
);

const HARMONIC_MINOR_SCALE = scaleOf(
  "harmonicMinor",
  "Harmonic minor",
  [MAJOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SIXTH, MAJOR_SEVENTH],
  { 8: flat("A") },
);

const MELODIC_MINOR_SCALE = scaleOf(
  "melodicMinor",
  "Melodic minor",
  [MAJOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MAJOR_SIXTH, MAJOR_SEVENTH],
  { 1: sharp("C") },
);

const DORIAN_SCALE = scaleOf(
  "dorian",
  "Dorian",
  [MAJOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MAJOR_SIXTH, MINOR_SEVENTH],
  { 8: sharp("G") },
);

const PHRYGIAN_SCALE = scaleOf(
  "phrygian",
  "Phrygian",
  [MINOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SIXTH, MINOR_SEVENTH],
  { 10: flat("B") },
);

const LYDIAN_SCALE = scaleOf("lydian", "Lydian", [
  MAJOR_SECOND,
  MAJOR_THIRD,
  AUGMENTED_FOURTH,
  PERFECT_FIFTH,
  MAJOR_SIXTH,
  MAJOR_SEVENTH,
]);

const MIXOLYDIAN_SCALE = scaleOf(
  "mixolydian",
  "Mixolydian",
  [MAJOR_SECOND, MAJOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MAJOR_SIXTH, MINOR_SEVENTH],
  { 1: flat("D") },
);

const LOCRIAN_SCALE = scaleOf("locrian", "Locrian", [
  MINOR_SECOND,
  MINOR_THIRD,
  PERFECT_FOURTH,
  DIMINISHED_FIFTH,
  MINOR_SIXTH,
  MINOR_SEVENTH,
]);

/** The fourth mode of melodic minor: a mixolydian with a raised fourth (1 2 3 ♯4 5 6 ♭7). */
const LYDIAN_DOMINANT_SCALE = scaleOf("lydianDominant", "Lydian dominant", [
  MAJOR_SECOND,
  MAJOR_THIRD,
  AUGMENTED_FOURTH,
  PERFECT_FIFTH,
  MAJOR_SIXTH,
  MINOR_SEVENTH,
]);

/**
 * The seventh mode of melodic minor, the "super locrian" (1 ♭2 ♭3 ♭4 ♭5 ♭6 ♭7). The ♭4 is the
 * major third and the ♭6 the sharp fifth, so every altered note of a dominant chord is in it.
 */
const ALTERED_SCALE = scaleOf("altered", "Altered", [
  MINOR_SECOND,
  MINOR_THIRD,
  DIMINISHED_FOURTH,
  DIMINISHED_FIFTH,
  MINOR_SIXTH,
  MINOR_SEVENTH,
]);

/** Six notes a whole step apart (1 2 3 ♯4 ♯5 ♭7). It repeats after two transpositions. */
const WHOLE_TONE_SCALE = scaleOf(
  "wholeTone",
  "Whole tone",
  [MAJOR_SECOND, MAJOR_THIRD, AUGMENTED_FOURTH, AUGMENTED_FIFTH, MINOR_SEVENTH],
  { 1: flat("D"), 3: flat("E"), 8: flat("A"), 10: flat("B") },
);

/**
 * The octatonic scale that starts with a whole step: whole, half, whole, half … (1 2 ♭3 4 ♭5 ♭6
 * 6 7). It uses seven letters, one of them twice (the ♭6 and the 6). Repeats after three
 * transpositions.
 */
const DIMINISHED_WHOLE_HALF_SCALE = scaleOf("diminishedWholeHalf", "Diminished (whole–half)", [
  MAJOR_SECOND,
  MINOR_THIRD,
  PERFECT_FOURTH,
  DIMINISHED_FIFTH,
  MINOR_SIXTH,
  MAJOR_SIXTH,
  MAJOR_SEVENTH,
]);

/**
 * The octatonic scale that starts with a half step: half, whole, half, whole … (1 ♭2 ♭3 3 ♯4 5 6
 * ♭7), the "dominant diminished" scale. The ♭3 and the 3 share a letter. Repeats after three
 * transpositions.
 */
const DIMINISHED_HALF_WHOLE_SCALE = scaleOf("diminishedHalfWhole", "Diminished (half–whole)", [
  MINOR_SECOND,
  MINOR_THIRD,
  MAJOR_THIRD,
  AUGMENTED_FOURTH,
  PERFECT_FIFTH,
  MAJOR_SIXTH,
  MINOR_SEVENTH,
]);

const MAJOR_PENTATONIC_SCALE = scaleOf(
  "majorPentatonic",
  "Major pentatonic",
  [MAJOR_SECOND, MAJOR_THIRD, PERFECT_FIFTH, MAJOR_SIXTH],
  { 6: sharp("F") },
);

const MINOR_PENTATONIC_SCALE = scaleOf(
  "minorPentatonic",
  "Minor pentatonic",
  [MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SEVENTH],
  { 3: flat("E") },
);

/** Minor pentatonic with the "blue note" ♭5 between the fourth and the fifth. */
const MINOR_BLUES_SCALE = scaleOf(
  "minorBlues",
  "Minor blues",
  [MINOR_THIRD, PERFECT_FOURTH, DIMINISHED_FIFTH, PERFECT_FIFTH, MINOR_SEVENTH],
  { 10: flat("B") },
);

/** Major pentatonic with the blue note ♭3 between the second and the major third. */
const MAJOR_BLUES_SCALE = scaleOf(
  "majorBlues",
  "Major blues",
  [MAJOR_SECOND, MINOR_THIRD, MAJOR_THIRD, PERFECT_FIFTH, MAJOR_SIXTH],
  { 1: flat("D") },
);

/** The second mode of melodic minor: phrygian with a major sixth (1 ♭2 ♭3 4 5 6 ♭7). */
const DORIAN_FLAT_2_SCALE = scaleOf(
  "dorianFlat2",
  "Dorian ♭2",
  [MINOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MAJOR_SIXTH, MINOR_SEVENTH],
  {},
  "Phrygian ♮6",
);

/** The third mode of melodic minor: lydian with a sharp fifth (1 2 3 ♯4 ♯5 6 7), for maj7♯5. */
const LYDIAN_AUGMENTED_SCALE = scaleOf("lydianAugmented", "Lydian augmented", [
  MAJOR_SECOND,
  MAJOR_THIRD,
  AUGMENTED_FOURTH,
  AUGMENTED_FIFTH,
  MAJOR_SIXTH,
  MAJOR_SEVENTH,
]);

/** The fifth mode of melodic minor: mixolydian with a minor sixth (1 2 3 4 5 ♭6 ♭7). */
const MIXOLYDIAN_FLAT_6_SCALE = scaleOf(
  "mixolydianFlat6",
  "Mixolydian ♭6",
  [MAJOR_SECOND, MAJOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SIXTH, MINOR_SEVENTH],
  {},
  "Aeolian dominant",
);

/** The sixth mode of melodic minor: locrian with a major second (1 2 ♭3 4 ♭5 ♭6 ♭7), for m7♭5. */
const LOCRIAN_NATURAL_2_SCALE = scaleOf(
  "locrianNatural2",
  "Locrian ♮2",
  [MAJOR_SECOND, MINOR_THIRD, PERFECT_FOURTH, DIMINISHED_FIFTH, MINOR_SIXTH, MINOR_SEVENTH],
  {},
  "Half-diminished",
);

/**
 * The fifth mode of harmonic minor (1 ♭2 3 4 5 ♭6 ♭7): the scale of V7♭9 in a minor key, and of
 * much flamenco and klezmer.
 */
const PHRYGIAN_DOMINANT_SCALE = scaleOf("phrygianDominant", "Phrygian dominant", [
  MINOR_SECOND,
  MAJOR_THIRD,
  PERFECT_FOURTH,
  PERFECT_FIFTH,
  MINOR_SIXTH,
  MINOR_SEVENTH,
]);

/** Harmonic minor with a raised fourth (1 2 ♭3 ♯4 5 ♭6 7): two augmented seconds. */
const HUNGARIAN_MINOR_SCALE = scaleOf("hungarianMinor", "Hungarian minor", [
  MAJOR_SECOND,
  MINOR_THIRD,
  AUGMENTED_FOURTH,
  PERFECT_FIFTH,
  MINOR_SIXTH,
  MAJOR_SEVENTH,
]);

/** Major with a flat second and sixth (1 ♭2 3 4 5 ♭6 7): an augmented second in each half. */
const DOUBLE_HARMONIC_SCALE = scaleOf(
  "doubleHarmonic",
  "Double harmonic major",
  [MINOR_SECOND, MAJOR_THIRD, PERFECT_FOURTH, PERFECT_FIFTH, MINOR_SIXTH, MAJOR_SEVENTH],
  {},
  "Byzantine",
);

/**
 * Mixolydian with a passing major seventh (1 2 3 4 5 6 ♭7 7). Eight notes, so a run of eighth
 * notes from a chord tone on the beat lands on chord tones on every beat. The ♭7 and 7 share a
 * letter.
 */
const BEBOP_DOMINANT_SCALE = scaleOf("bebopDominant", "Bebop dominant", [
  MAJOR_SECOND,
  MAJOR_THIRD,
  PERFECT_FOURTH,
  PERFECT_FIFTH,
  MAJOR_SIXTH,
  MINOR_SEVENTH,
  MAJOR_SEVENTH,
]);

/** A Japanese pentatonic scale (1 2 ♭3 5 ♭6), the minor pentatonic's darker relative. */
const HIRAJOSHI_SCALE = scaleOf("hirajoshi", "Hirajoshi", [
  MAJOR_SECOND,
  MINOR_THIRD,
  PERFECT_FIFTH,
  MINOR_SIXTH,
]);

/** A Japanese pentatonic scale with a half step above the tonic (1 ♭2 4 5 ♭7). */
const IN_SEN_SCALE = scaleOf("inSen", "In-sen", [
  MINOR_SECOND,
  PERFECT_FOURTH,
  PERFECT_FIFTH,
  MINOR_SEVENTH,
]);

export const SCALES: Record<ScaleId, Scale> = {
  major: MAJOR_SCALE,
  naturalMinor: NATURAL_MINOR_SCALE,
  harmonicMinor: HARMONIC_MINOR_SCALE,
  melodicMinor: MELODIC_MINOR_SCALE,
  dorian: DORIAN_SCALE,
  phrygian: PHRYGIAN_SCALE,
  lydian: LYDIAN_SCALE,
  mixolydian: MIXOLYDIAN_SCALE,
  locrian: LOCRIAN_SCALE,
  lydianDominant: LYDIAN_DOMINANT_SCALE,
  altered: ALTERED_SCALE,
  wholeTone: WHOLE_TONE_SCALE,
  diminishedWholeHalf: DIMINISHED_WHOLE_HALF_SCALE,
  diminishedHalfWhole: DIMINISHED_HALF_WHOLE_SCALE,
  majorPentatonic: MAJOR_PENTATONIC_SCALE,
  minorPentatonic: MINOR_PENTATONIC_SCALE,
  minorBlues: MINOR_BLUES_SCALE,
  majorBlues: MAJOR_BLUES_SCALE,
  dorianFlat2: DORIAN_FLAT_2_SCALE,
  lydianAugmented: LYDIAN_AUGMENTED_SCALE,
  mixolydianFlat6: MIXOLYDIAN_FLAT_6_SCALE,
  locrianNatural2: LOCRIAN_NATURAL_2_SCALE,
  phrygianDominant: PHRYGIAN_DOMINANT_SCALE,
  hungarianMinor: HUNGARIAN_MINOR_SCALE,
  doubleHarmonic: DOUBLE_HARMONIC_SCALE,
  bebopDominant: BEBOP_DOMINANT_SCALE,
  hirajoshi: HIRAJOSHI_SCALE,
  inSen: IN_SEN_SCALE,
};

export interface ScaleGroup {
  readonly id: ScaleGroupId;
  readonly name: string;
  readonly scales: readonly ScaleId[];
}

/** The scales as the picker lists them. Major and natural minor come first, ungrouped by family. */
export const SCALE_GROUPS: readonly ScaleGroup[] = [
  {
    id: "minor",
    name: "Major & minor",
    scales: ["major", "naturalMinor", "harmonicMinor", "melodicMinor"],
  },
  {
    id: "modes",
    name: "Modes",
    scales: ["dorian", "phrygian", "lydian", "mixolydian", "locrian"],
  },
  {
    id: "melodicModes",
    name: "Modes of melodic minor",
    scales: [
      "dorianFlat2",
      "lydianAugmented",
      "lydianDominant",
      "mixolydianFlat6",
      "locrianNatural2",
      "altered",
    ],
  },
  {
    id: "harmonicModes",
    name: "Harmonic minor & relatives",
    scales: ["phrygianDominant", "hungarianMinor", "doubleHarmonic"],
  },
  {
    id: "jazz",
    name: "Bebop",
    scales: ["bebopDominant"],
  },
  {
    id: "symmetric",
    name: "Symmetric",
    scales: ["wholeTone", "diminishedWholeHalf", "diminishedHalfWhole"],
  },
  {
    id: "pentatonic",
    name: "Pentatonic & blues",
    scales: ["majorPentatonic", "minorPentatonic", "minorBlues", "majorBlues"],
  },
  {
    id: "world",
    name: "Japanese pentatonic",
    scales: ["hirajoshi", "inSen"],
  },
];

/** The name a picker shows: "Major (Ionian)", "Dorian". */
export function scaleLabel(scale: Scale): string {
  return scale.alias ? `${scale.name} (${scale.alias})` : scale.name;
}

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
 * Rule: a white key keeps its natural name (F altered, not E♯ altered). Among the spellings of a
 * black key, use the one whose key signature has the fewest accidentals. That gives D♭ major but
 * C♯ minor, and A♭ major but G♯ minor.
 */
export function preferredTonicSpelling(pc: number, scale: Scale): Note {
  const natural = spellingsOf(pc).find((n) => n.accidental === 0);
  if (natural) return natural;
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
  return tone.degree === 1 ? "Tonic" : tone.interval.name;
}

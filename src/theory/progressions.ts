import { type Chord, type ChordQualityId, buildChord } from "./chords";
import type { Key, KeyMode } from "./keys";
import type { Note } from "./notes";
import {
  type Tonality,
  type TonalityId,
  keyTonality,
  tonality,
  tonalityOnPitchClass,
  tonalityScale,
} from "./tonality";

/**
 * Common chord progressions as data: each chord is a scale degree of the tonality (raised or
 * lowered a half step for a chord from outside it), a chord quality and a step number. Putting one
 * on a tonic spells every chord from that tonality's scale, so I–V–vi–IV in A♭ major is
 * A♭–E♭–Fm–D♭ and i–IV in D dorian is Dm–G.
 */

export const PROGRESSION_IDS = [
  // Major
  "pop",
  "fifties",
  "sensitive",
  "rock",
  "royalRoad",
  "twoFiveOne",
  "turnaround",
  "circleMajor",
  "ragtime",
  "pachelbel",
  "minorPlagal",
  "heroic",
  "backdoor",
  "blues",
  // Minor
  "aeolian",
  "andalusian",
  "minorClimb",
  "minorRock",
  "circleMinor",
  "lineCliche",
  "minorBlues",
  "classicalMinor",
  "minorTwoFiveOne",
  "minorDrama",
  // Modes
  "dorianVamp",
  "dorianLoop",
  "mixolydianLoop",
  "mixolydianVamp",
  "lydianVamp",
  "phrygianVamp",
  "phrygianMetal",
  "hijaz",
  "melodicMinorVamp",
] as const;

export type ProgressionId = (typeof PROGRESSION_IDS)[number];

/** Keywords to find a progression by: a style or a mood. */
export const PROGRESSION_TAGS = [
  "pop",
  "rock",
  "jazz",
  "blues",
  "folk",
  "classical",
  "soul",
  "metal",
  "flamenco",
  "cinematic",
  "happy",
  "sad",
  "dark",
  "dreamy",
  "epic",
  "nostalgic",
  "tense",
  "loop",
  "cadence",
] as const;

export type ProgressionTag = (typeof PROGRESSION_TAGS)[number];

export const isProgressionTag = (tag: string): tag is ProgressionTag =>
  (PROGRESSION_TAGS as readonly string[]).includes(tag);

/** `tags` once each, in the order of `PROGRESSION_TAGS`, so a set of keywords has one link. */
export const sortProgressionTags = (tags: readonly string[]): ProgressionTag[] =>
  PROGRESSION_TAGS.filter((tag) => tags.includes(tag));

/** Keywords from link text (`jazz,sad`); a word that is not a keyword is left out. */
export const parseProgressionTags = (text: string | null): ProgressionTag[] =>
  sortProgressionTags((text ?? "").split(",").filter(isProgressionTag));

export interface ProgressionStep {
  /** Scale degree of the tonality (1–7) the chord is built on. */
  readonly degree: number;
  /**
   * Half steps the root is moved from the scale degree: -1 for ♭VI in a major key (A♭ in C).
   * The letter stays, so the root is spelled A♭ and never G♯.
   */
  readonly alter?: -1 | 1;
  readonly quality: ChordQualityId;
  /** Step number as written in the key, e.g. "ii7", "V7" or "♭VI". */
  readonly roman: string;
}

export interface Progression {
  readonly id: ProgressionId;
  /** E.g. "I–V–vi–IV". */
  readonly name: string;
  /** A short name for the list, e.g. "Pop" or "Andalusian cadence". */
  readonly title: string;
  /** Which tonality the step numbers belong to: major, minor, dorian … */
  readonly tonality: TonalityId;
  readonly steps: readonly ProgressionStep[];
  /** How many chords make one line when the progression is written out (bars of a blues). */
  readonly perRow: number;
  /** Styles and moods it is known for. */
  readonly tags: readonly ProgressionTag[];
  /** A line about where the progression is used and how it sounds. */
  readonly description: string;
}

const step = (
  degree: number,
  quality: ChordQualityId,
  roman: string,
  alter?: -1 | 1,
): ProgressionStep => ({ degree, quality, roman, ...(alter ? { alter } : {}) });

const I = step(1, "major", "I");
const I7 = step(1, "dominant7", "I7");
const Imaj7 = step(1, "major7", "Imaj7");
const ii7 = step(2, "minor7", "ii7");
const iii = step(3, "minor", "iii");
const iii7 = step(3, "minor7", "iii7");
const IV = step(4, "major", "IV");
const IV7 = step(4, "dominant7", "IV7");
const IVmaj7 = step(4, "major7", "IVmaj7");
const iv = step(4, "minor", "iv");
const V = step(5, "major", "V");
const V7 = step(5, "dominant7", "V7");
const vi = step(6, "minor", "vi");
const vi7 = step(6, "minor7", "vi7");

// Minor tonalities: the step numbers are written against the major scale (♭III, ♭VI, ♭VII).
const i = step(1, "minor", "i");
const i7 = step(1, "minor7", "i7");
const iiHalfDim7 = step(2, "halfDiminished7", "iiø7");
const iiDim = step(2, "diminished", "ii°");
const flatIII = step(3, "major", "♭III");
const iv7 = step(4, "minor7", "iv7");
const v = step(5, "minor", "v");
const flatVI = step(6, "major", "♭VI");
const flatVII = step(7, "major", "♭VII");

const progression = (p: Progression): Progression => p;

export const PROGRESSIONS: Record<ProgressionId, Progression> = {
  pop: progression({
    id: "pop",
    name: "I–V–vi–IV",
    title: "Pop progression",
    tonality: "major",
    steps: [I, V, vi, IV],
    perRow: 4,
    tags: ["pop", "rock", "happy", "loop"],
    description: "The pop progression: hundreds of songs from the 1990s on are built on it.",
  }),
  fifties: progression({
    id: "fifties",
    name: "I–vi–IV–V",
    title: "50s progression",
    tonality: "major",
    steps: [I, vi, IV, V],
    perRow: 4,
    tags: ["pop", "nostalgic", "loop"],
    description: "The 50s progression (doo-wop), with the dominant leading back to the tonic.",
  }),
  sensitive: progression({
    id: "sensitive",
    name: "vi–IV–I–V",
    title: "Minor-start pop",
    tonality: "major",
    steps: [vi, IV, I, V],
    perRow: 4,
    tags: ["pop", "sad", "loop"],
    description:
      "The pop progression started on vi: the same four chords, but the loop sounds wistful.",
  }),
  rock: progression({
    id: "rock",
    name: "I–IV–V–IV",
    title: "Three-chord rock",
    tonality: "major",
    steps: [I, IV, V, IV],
    perRow: 4,
    tags: ["rock", "happy", "loop"],
    description: "Tonic, subdominant and dominant: the riff behind garage rock and party songs.",
  }),
  royalRoad: progression({
    id: "royalRoad",
    name: "IVmaj7–V7–iii7–vi",
    title: "Royal road",
    tonality: "major",
    steps: [IVmaj7, V7, iii7, vi],
    perRow: 4,
    tags: ["pop", "nostalgic", "dreamy", "loop"],
    description:
      'The "royal road" of J-pop and anime: it starts away from home and keeps longing for it.',
  }),
  twoFiveOne: progression({
    id: "twoFiveOne",
    name: "ii7–V7–Imaj7",
    title: "Jazz ii–V–I",
    tonality: "major",
    steps: [ii7, V7, Imaj7],
    perRow: 3,
    tags: ["jazz", "cadence"],
    description: "The jazz cadence: subdominant, dominant, tonic.",
  }),
  turnaround: progression({
    id: "turnaround",
    name: "Imaj7–vi7–ii7–V7",
    title: "Jazz turnaround",
    tonality: "major",
    steps: [Imaj7, vi7, ii7, V7],
    perRow: 4,
    tags: ["jazz", "loop"],
    description:
      "I–vi–ii–V: the roots fall by fifths back to the tonic, the end of countless standards.",
  }),
  circleMajor: progression({
    id: "circleMajor",
    name: "iii7–vi7–ii7–V7–Imaj7",
    title: "Circle of fifths",
    tonality: "major",
    steps: [iii7, vi7, ii7, V7, Imaj7],
    perRow: 5,
    tags: ["jazz", "classical", "cadence"],
    description: "Each root a fifth below the last: a chain that can only end at home.",
  }),
  ragtime: progression({
    id: "ragtime",
    name: "III7–VI7–II7–V7–I",
    title: "Ragtime",
    tonality: "major",
    steps: [
      step(3, "dominant7", "III7"),
      step(6, "dominant7", "VI7"),
      step(2, "dominant7", "II7"),
      V7,
      I,
    ],
    perRow: 5,
    tags: ["jazz", "nostalgic", "happy"],
    description:
      "The circle of fifths with every chord a dominant seventh: each one is the V7 of the next.",
  }),
  pachelbel: progression({
    id: "pachelbel",
    name: "I–V–vi–iii–IV–I–IV–V",
    title: "Pachelbel's canon",
    tonality: "major",
    steps: [I, V, vi, iii, IV, I, IV, V],
    perRow: 4,
    tags: ["classical", "pop", "nostalgic"],
    description: "Pachelbel's canon: the roots fall by thirds and fourths, then close on V.",
  }),
  minorPlagal: progression({
    id: "minorPlagal",
    name: "I–IV–iv–I",
    title: "Minor plagal",
    tonality: "major",
    steps: [I, IV, iv, I],
    perRow: 4,
    tags: ["pop", "sad", "nostalgic", "cadence"],
    description:
      "IV turns minor on its way home: a chord borrowed from the parallel minor, bittersweet.",
  }),
  heroic: progression({
    id: "heroic",
    name: "I–♭VI–♭VII–I",
    title: "Heroic cadence",
    tonality: "major",
    steps: [I, step(6, "major", "♭VI", -1), step(7, "major", "♭VII", -1), I],
    perRow: 4,
    tags: ["cinematic", "epic", "rock", "cadence"],
    description:
      "♭VI and ♭VII borrowed from the parallel minor climb to the tonic: the victory fanfare of film and game music.",
  }),
  backdoor: progression({
    id: "backdoor",
    name: "iv7–♭VII7–Imaj7",
    title: "Backdoor ii–V",
    tonality: "major",
    steps: [iv7, step(7, "dominant7", "♭VII7", -1), Imaj7],
    perRow: 3,
    tags: ["jazz", "soul", "cadence"],
    description: "Home through the back door: ♭VII7 stands in for V7 and lands softly on I.",
  }),
  blues: progression({
    id: "blues",
    name: "12-bar blues",
    title: "12-bar blues",
    tonality: "major",
    steps: [I7, I7, I7, I7, IV7, IV7, I7, I7, V7, IV7, I7, V7],
    perRow: 4,
    tags: ["blues", "rock"],
    description: "Twelve bars of dominant sevenths on I, IV and V, one chord per bar.",
  }),

  aeolian: progression({
    id: "aeolian",
    name: "i–♭VI–♭III–♭VII",
    title: "Aeolian loop",
    tonality: "naturalMinor",
    steps: [i, flatVI, flatIII, flatVII],
    perRow: 4,
    tags: ["pop", "rock", "sad", "epic", "loop"],
    description: "The aeolian progression: all four chords come from the natural minor scale.",
  }),
  andalusian: progression({
    id: "andalusian",
    name: "i–♭VII–♭VI–V",
    title: "Andalusian cadence",
    tonality: "naturalMinor",
    steps: [i, flatVII, flatVI, V],
    perRow: 4,
    tags: ["flamenco", "classical", "rock", "dark", "loop"],
    description:
      "A bass that walks down four steps to a major V: flamenco, baroque laments and surf rock.",
  }),
  minorClimb: progression({
    id: "minorClimb",
    name: "i–♭VI–♭VII–i",
    title: "Minor climb",
    tonality: "naturalMinor",
    steps: [i, flatVI, flatVII, i],
    perRow: 4,
    tags: ["cinematic", "epic", "metal", "loop"],
    description: "♭VI and ♭VII step up to the minor tonic: a dark, driving build.",
  }),
  minorRock: progression({
    id: "minorRock",
    name: "i–♭VII–♭VI–♭VII",
    title: "Minor rock loop",
    tonality: "naturalMinor",
    steps: [i, flatVII, flatVI, flatVII],
    perRow: 4,
    tags: ["rock", "epic", "loop"],
    description: "Down and back up a whole step: an endless rock riff without a leading tone.",
  }),
  circleMinor: progression({
    id: "circleMinor",
    name: "i–iv–♭VII–♭III–♭VI–ii°–V–i",
    title: "Minor circle of fifths",
    tonality: "naturalMinor",
    steps: [i, iv, flatVII, flatIII, flatVI, iiDim, V, i],
    perRow: 4,
    tags: ["classical", "jazz", "sad"],
    description:
      "Every chord of the minor key, each a fifth below the last, with a major V to close.",
  }),
  lineCliche: progression({
    id: "lineCliche",
    name: "i–i(maj7)–i7–i6",
    title: "Line cliché",
    tonality: "naturalMinor",
    steps: [i, step(1, "minorMajor7", "i(maj7)"), i7, step(1, "minor6", "i6")],
    perRow: 4,
    tags: ["jazz", "cinematic", "sad", "dark"],
    description:
      "The tonic stays while one voice falls by half steps: the spy-film and Bond-theme sound.",
  }),
  minorBlues: progression({
    id: "minorBlues",
    name: "Minor 12-bar blues",
    title: "Minor blues",
    tonality: "naturalMinor",
    steps: [i7, i7, i7, i7, iv7, iv7, i7, i7, step(6, "dominant7", "♭VI7"), V7, i7, V7],
    perRow: 4,
    tags: ["blues", "jazz", "sad", "dark"],
    description: "The 12-bar form in minor, with ♭VI7 sliding down to V7 in bars 9 and 10.",
  }),
  classicalMinor: progression({
    id: "classicalMinor",
    name: "i–iv–V–i",
    title: "Classical minor",
    tonality: "harmonicMinor",
    steps: [i, iv, V, i],
    perRow: 4,
    tags: ["classical", "sad", "cadence"],
    description: "Harmonic minor raises the seventh, so V is major and pulls hard to i.",
  }),
  minorTwoFiveOne: progression({
    id: "minorTwoFiveOne",
    name: "iiø7–V7–i",
    title: "Minor ii–V–i",
    tonality: "harmonicMinor",
    steps: [iiHalfDim7, V7, i],
    perRow: 3,
    tags: ["jazz", "sad", "cadence"],
    description: "The jazz cadence in minor: a half-diminished ii and a dominant V7.",
  }),
  minorDrama: progression({
    id: "minorDrama",
    name: "i–♭VI–iv–V",
    title: "Minor drama",
    tonality: "harmonicMinor",
    steps: [i, flatVI, iv, V],
    perRow: 4,
    tags: ["cinematic", "classical", "dark", "tense", "loop"],
    description: "Down to ♭VI, through iv and up to a major V that demands the tonic again.",
  }),

  dorianVamp: progression({
    id: "dorianVamp",
    name: "i7–IV7",
    title: "Dorian vamp",
    tonality: "dorian",
    steps: [i7, IV7],
    perRow: 2,
    tags: ["soul", "jazz", "loop"],
    description:
      "Minor tonic, major IV: the ♮6 of dorian sits in the IV chord. Funk and modal jazz.",
  }),
  dorianLoop: progression({
    id: "dorianLoop",
    name: "i–♭VII–IV–i",
    title: "Dorian folk-rock",
    tonality: "dorian",
    steps: [i, flatVII, IV, i],
    perRow: 4,
    tags: ["folk", "rock", "loop"],
    description: "The major IV keeps the minor tonic from sounding sad: Celtic and folk-rock.",
  }),
  mixolydianLoop: progression({
    id: "mixolydianLoop",
    name: "I–♭VII–IV–I",
    title: "Mixolydian loop",
    tonality: "mixolydian",
    steps: [I, flatVII, IV, I],
    perRow: 4,
    tags: ["rock", "folk", "happy", "loop"],
    description: "♭VII takes the place of V: classic rock and the coda of many anthems.",
  }),
  mixolydianVamp: progression({
    id: "mixolydianVamp",
    name: "I–v–♭VII–IV",
    title: "Mixolydian riff",
    tonality: "mixolydian",
    steps: [I, v, flatVII, IV],
    perRow: 4,
    tags: ["rock", "blues", "loop"],
    description: "A minor v and a major ♭VII, both from the ♭7: a laid-back, bluesy major.",
  }),
  lydianVamp: progression({
    id: "lydianVamp",
    name: "I–II",
    title: "Lydian vamp",
    tonality: "lydian",
    steps: [I, step(2, "major", "II")],
    perRow: 2,
    tags: ["cinematic", "dreamy", "loop"],
    description: "A major II holds the ♯4: weightless and wondering, the sound of film scores.",
  }),
  phrygianVamp: progression({
    id: "phrygianVamp",
    name: "i–♭II",
    title: "Phrygian vamp",
    tonality: "phrygian",
    steps: [i, step(2, "major", "♭II")],
    perRow: 2,
    tags: ["metal", "flamenco", "dark", "tense", "loop"],
    description: "The ♭II a half step above the tonic: menacing in metal, fiery in flamenco.",
  }),
  phrygianMetal: progression({
    id: "phrygianMetal",
    name: "i–♭II–♭III–♭II",
    title: "Phrygian riff",
    tonality: "phrygian",
    steps: [i, step(2, "major", "♭II"), flatIII, step(2, "major", "♭II")],
    perRow: 4,
    tags: ["metal", "dark", "loop"],
    description: "Climbing from the tonic and falling back to ♭II: a heavy, brooding riff.",
  }),
  hijaz: progression({
    id: "hijaz",
    name: "I–♭II–♭vii–I",
    title: "Phrygian dominant",
    tonality: "phrygianDominant",
    steps: [I, step(2, "major", "♭II"), step(7, "minor", "♭vii"), I],
    perRow: 4,
    tags: ["flamenco", "dark", "cinematic"],
    description:
      "A major tonic with ♭II above it: the flamenco and Middle-Eastern sound of the fifth mode of harmonic minor.",
  }),
  melodicMinorVamp: progression({
    id: "melodicMinorVamp",
    name: "i(maj7)–IV7",
    title: "Jazz minor vamp",
    tonality: "melodicMinor",
    steps: [step(1, "minorMajor7", "i(maj7)"), IV7],
    perRow: 2,
    tags: ["jazz", "dark", "cinematic", "loop"],
    description:
      "Melodic minor's raised sixth and seventh: a minor-major tonic and a dominant IV7.",
  }),
};

export const isProgressionId = (id: string): id is ProgressionId =>
  (PROGRESSION_IDS as readonly string[]).includes(id);

/** The progressions that carry every tag in `tags` and are in `tonality` (any, when undefined). */
export function findProgressions(
  tags: readonly ProgressionTag[],
  tonalityId?: TonalityId,
): Progression[] {
  return PROGRESSION_IDS.map((id) => PROGRESSIONS[id]).filter(
    (p) =>
      tags.every((tag) => p.tags.includes(tag)) &&
      (tonalityId === undefined || p.tonality === tonalityId),
  );
}

/** A chord of a progression put in a key. */
export interface ProgressionChord {
  readonly step: ProgressionStep;
  readonly chord: Chord;
}

/** The chords of `progression` on `t`, spelled from the tonality's scale. */
export function progressionChords(
  progression: Pick<Progression, "steps">,
  t: Tonality,
): ProgressionChord[] {
  const scale = tonalityScale(t);
  return progression.steps.map((s) => {
    const degree = scale[s.degree - 1];
    if (!degree) throw new Error(`No scale degree ${s.degree}`);
    const root = s.alter ? { ...degree, accidental: degree.accidental + s.alter } : degree;
    return { step: s, chord: buildChord(root, s.quality) };
  });
}

/** The tonality a progression is shown in when only the tonic's pitch class is known: fewest accidentals. */
export const progressionTonality = (progression: Progression, pc: number): Tonality =>
  tonalityOnPitchClass(pc, progression.tonality);

/** The progression's tonality on this tonic (for a choice of C♯ or D♭). */
export const progressionTonalityOn = (progression: Progression, tonic: Note): Tonality =>
  tonality(tonic, progression.tonality);

export const CADENCE_IDS = ["authentic", "plagal", "half", "deceptive"] as const;

export type CadenceId = (typeof CADENCE_IDS)[number];

export interface Cadence {
  readonly id: CadenceId;
  /** E.g. "Authentic". */
  readonly name: string;
  /** The chords in major and in minor; in minor V is the major dominant of harmonic minor. */
  readonly steps: Record<KeyMode, readonly ProgressionStep[]>;
  /** One line on what the ending sounds like. */
  readonly description: string;
}

const dominant = step(5, "major", "V");
const subdominantMinor = step(4, "minor", "iv");

export const CADENCES: Record<CadenceId, Cadence> = {
  authentic: {
    id: "authentic",
    name: "Authentic",
    steps: {
      major: [V, I],
      minor: [dominant, step(1, "minor", "i")],
    },
    description: "V–I: the dominant resolves to the tonic, the strongest full stop.",
  },
  plagal: {
    id: "plagal",
    name: "Plagal",
    steps: {
      major: [IV, I],
      minor: [subdominantMinor, step(1, "minor", "i")],
    },
    description: 'IV–I: the "Amen" cadence, softer than the authentic one.',
  },
  half: {
    id: "half",
    name: "Half",
    steps: {
      major: [I, V],
      minor: [step(1, "minor", "i"), dominant],
    },
    description: "Ends on V: a comma rather than a full stop, so the phrase asks for more.",
  },
  deceptive: {
    id: "deceptive",
    name: "Deceptive",
    steps: {
      major: [V, vi],
      minor: [dominant, step(6, "major", "♭VI")],
    },
    description: "V–vi: the dominant promises the tonic and lands on the relative minor instead.",
  },
};

/** The chords of `cadence` in `k`, spelled from the key's scale. */
export const cadenceChords = (cadence: Cadence, k: Key): ProgressionChord[] =>
  progressionChords({ steps: cadence.steps[k.mode] }, keyTonality(k));

import { type Chord, type ChordQualityId, buildChord } from "./chords";
import { type Key, type KeyMode, key, keyScale } from "./keys";
import type { Note } from "./notes";
import { MAJOR_SCALE, NATURAL_MINOR_SCALE, preferredTonicSpelling } from "./scales";

/**
 * Common chord progressions as data: each chord is a scale degree of the key, a
 * chord quality and a step number. Putting one in a key spells every chord from
 * that key's scale, so I–V–vi–IV in A♭ major is A♭–E♭–Fm–D♭.
 */

export const PROGRESSION_IDS = [
  "pop",
  "fifties",
  "twoFiveOne",
  "pachelbel",
  "blues",
  "aeolian",
] as const;

export type ProgressionId = (typeof PROGRESSION_IDS)[number];

export interface ProgressionStep {
  /** Scale degree of the key (1–7) the chord is built on. */
  readonly degree: number;
  readonly quality: ChordQualityId;
  /** Step number as written in the key, e.g. "ii7", "V7" or "♭VI". */
  readonly roman: string;
}

export interface Progression {
  readonly id: ProgressionId;
  /** E.g. "I–V–vi–IV". */
  readonly name: string;
  /** Which kind of key the step numbers belong to. */
  readonly mode: KeyMode;
  readonly steps: readonly ProgressionStep[];
  /** How many chords make one line when the progression is written out (bars of a blues). */
  readonly perRow: number;
  /** A line about where the progression is used. */
  readonly description: string;
}

const step = (degree: number, quality: ChordQualityId, roman: string): ProgressionStep => ({
  degree,
  quality,
  roman,
});

const I = step(1, "major", "I");
const I7 = step(1, "dominant7", "I7");
const IV = step(4, "major", "IV");
const IV7 = step(4, "dominant7", "IV7");
const V = step(5, "major", "V");
const V7 = step(5, "dominant7", "V7");
const iii = step(3, "minor", "iii");
const vi = step(6, "minor", "vi");

export const PROGRESSIONS: Record<ProgressionId, Progression> = {
  pop: {
    id: "pop",
    name: "I–V–vi–IV",
    mode: "major",
    steps: [I, V, vi, IV],
    perRow: 4,
    description: "The pop progression: hundreds of songs from the 1990s on are built on it.",
  },
  fifties: {
    id: "fifties",
    name: "I–vi–IV–V",
    mode: "major",
    steps: [I, vi, IV, V],
    perRow: 4,
    description: "The 50s progression (doo-wop), with the dominant leading back to the tonic.",
  },
  twoFiveOne: {
    id: "twoFiveOne",
    name: "ii7–V7–Imaj7",
    mode: "major",
    steps: [step(2, "minor7", "ii7"), step(5, "dominant7", "V7"), step(1, "major7", "Imaj7")],
    perRow: 3,
    description: "The jazz cadence: subdominant, dominant, tonic.",
  },
  pachelbel: {
    id: "pachelbel",
    name: "I–V–vi–iii–IV–I–IV–V",
    mode: "major",
    steps: [I, V, vi, iii, IV, I, IV, V],
    perRow: 4,
    description: "Pachelbel's canon: the roots fall by thirds and fourths, then close on V.",
  },
  blues: {
    id: "blues",
    name: "12-bar blues",
    mode: "major",
    steps: [I7, I7, I7, I7, IV7, IV7, I7, I7, V7, IV7, I7, V7],
    perRow: 4,
    description: "Twelve bars of dominant sevenths on I, IV and V, one chord per bar.",
  },
  aeolian: {
    id: "aeolian",
    name: "i–♭VI–♭III–♭VII",
    mode: "minor",
    steps: [
      step(1, "minor", "i"),
      step(6, "major", "♭VI"),
      step(3, "major", "♭III"),
      step(7, "major", "♭VII"),
    ],
    perRow: 4,
    description: "The aeolian progression: all four chords come from the natural minor scale.",
  },
};

export const isProgressionId = (id: string): id is ProgressionId =>
  (PROGRESSION_IDS as readonly string[]).includes(id);

/** A chord of a progression put in a key. */
export interface ProgressionChord {
  readonly step: ProgressionStep;
  readonly chord: Chord;
}

/** The chords of `progression` in `k`, spelled from the key's scale. */
export function progressionChords(progression: Progression, k: Key): ProgressionChord[] {
  const scale = keyScale(k);
  return progression.steps.map((s) => {
    const root = scale[s.degree - 1];
    if (!root) throw new Error(`No scale degree ${s.degree}`);
    return { step: s, chord: buildChord(root, s.quality) };
  });
}

/** The key a progression is shown in when only the tonic's pitch class is known: fewest accidentals. */
export function progressionKey(progression: Progression, pc: number): Key {
  const scale = progression.mode === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE;
  return key(preferredTonicSpelling(pc, scale), progression.mode);
}

/** The same key with another tonic spelling (for a choice of C♯ or D♭). */
export const progressionKeyOn = (progression: Progression, tonic: Note): Key =>
  key(tonic, progression.mode);

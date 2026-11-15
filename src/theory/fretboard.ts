import type { Chord, ChordTone } from "./chords";
import { type Note, note, pitchClass } from "./notes";
import { midiOf } from "./voicing";

/** An open string: its spelled note and octave (scientific pitch notation). */
export interface OpenString {
  readonly note: Note;
  readonly octave: number;
}

/**
 * Standard guitar tuning, listed from string 1 (high E4) to string 6 (low E2),
 * the order guitarists number the strings and tablature draws them.
 */
export const STANDARD_TUNING: readonly OpenString[] = [
  { note: note("E"), octave: 4 },
  { note: note("B"), octave: 3 },
  { note: note("G"), octave: 3 },
  { note: note("D"), octave: 3 },
  { note: note("A"), octave: 2 },
  { note: note("E"), octave: 2 },
];

export type TuningId = "standard" | "dropD" | "dadgad";

export interface Tuning {
  readonly id: TuningId;
  readonly label: string;
  /** From string 1 (highest) to the lowest string. */
  readonly strings: readonly OpenString[];
}

export const TUNINGS: Readonly<Record<TuningId, Tuning>> = {
  standard: { id: "standard", label: "Standard", strings: STANDARD_TUNING },
  dropD: {
    id: "dropD",
    label: "Drop D",
    strings: [
      { note: note("E"), octave: 4 },
      { note: note("B"), octave: 3 },
      { note: note("G"), octave: 3 },
      { note: note("D"), octave: 3 },
      { note: note("A"), octave: 2 },
      { note: note("D"), octave: 2 },
    ],
  },
  dadgad: {
    id: "dadgad",
    label: "DADGAD",
    strings: [
      { note: note("D"), octave: 4 },
      { note: note("A"), octave: 3 },
      { note: note("G"), octave: 3 },
      { note: note("D"), octave: 3 },
      { note: note("A"), octave: 2 },
      { note: note("D"), octave: 2 },
    ],
  },
};

export const TUNING_IDS = Object.keys(TUNINGS) as TuningId[];

/** Where on the neck a tone is played. */
export interface NeckPlace {
  /** 1 = the highest-sounding string (high E in standard tuning). */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
  /** MIDI note number of the sounding pitch. */
  readonly midi: number;
}

export type FretPosition = ChordTone & NeckPlace;

export function openStringMidi(open: OpenString): number {
  return midiOf(pitchClass(open.note), open.octave);
}

/**
 * Every place on the neck, from the open string up to `frets`, where one of
 * `tones` can be played. Each position carries the tone it belongs to, so it is
 * spelled as in the chord or scale (E♭ in E♭ minor, never D♯).
 */
export function positionsOnNeck<T extends { readonly note: Note }>(
  tones: readonly T[],
  tuning: readonly OpenString[] = STANDARD_TUNING,
  frets = 12,
): (T & NeckPlace)[] {
  const toneByPitchClass = new Map(tones.map((tone) => [pitchClass(tone.note), tone]));
  const positions: (T & NeckPlace)[] = [];
  tuning.forEach((open, index) => {
    const openMidi = openStringMidi(open);
    for (let fret = 0; fret <= frets; fret++) {
      const midi = openMidi + fret;
      const tone = toneByPitchClass.get(midi % 12);
      if (tone) positions.push({ ...tone, string: index + 1, fret, midi });
    }
  });
  return positions;
}

/** Every place on the neck where a tone of `chord` can be played. */
export function fretboardPositions(
  chord: Chord,
  tuning: readonly OpenString[] = STANDARD_TUNING,
  frets = 12,
): FretPosition[] {
  return positionsOnNeck(chord.tones, tuning, frets);
}

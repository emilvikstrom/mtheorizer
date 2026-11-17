import type { Chord, ChordTone } from "./chords";
import { type Letter, type Note, note, pitchClass } from "./notes";
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

/** The fretted string instruments the app shows besides the piano. */
export type StringInstrumentId = "guitar" | "ukulele" | "bass" | "bass5" | "mandolin";

export const STRING_INSTRUMENTS: Readonly<Record<StringInstrumentId, { readonly label: string }>> =
  {
    guitar: { label: "Guitar" },
    ukulele: { label: "Ukulele" },
    bass: { label: "Bass" },
    bass5: { label: "5-string bass" },
    mandolin: { label: "Mandolin" },
  };

export const STRING_INSTRUMENT_IDS = Object.keys(STRING_INSTRUMENTS) as StringInstrumentId[];

/** The guitar tunings, then the one tuning of each other instrument (named after it). */
export type TuningId = "standard" | "dropD" | "dadgad" | "ukulele" | "bass" | "bass5" | "mandolin";

export interface Tuning {
  readonly id: TuningId;
  readonly label: string;
  readonly instrument: StringInstrumentId;
  /**
   * From string 1 to the last string. String 1 is the highest-sounding string on the
   * guitar, bass and mandolin; on the ukulele string 4 (the high G) is not the lowest.
   */
  readonly strings: readonly OpenString[];
  /**
   * Whether chord grips put the chord's root lowest, as guitar and bass players do.
   * Ukulele and mandolin grips often start on the third or fifth (Am is 2000, C is 0230).
   */
  readonly rootInBass: boolean;
}

const stringsOf = (...open: readonly (readonly [Letter, number])[]): OpenString[] =>
  open.map(([letter, octave]) => ({ note: note(letter), octave }));

export const TUNINGS: Readonly<Record<TuningId, Tuning>> = {
  standard: {
    id: "standard",
    label: "Standard",
    instrument: "guitar",
    strings: STANDARD_TUNING,
    rootInBass: true,
  },
  dropD: {
    id: "dropD",
    label: "Drop D",
    instrument: "guitar",
    strings: stringsOf(["E", 4], ["B", 3], ["G", 3], ["D", 3], ["A", 2], ["D", 2]),
    rootInBass: true,
  },
  dadgad: {
    id: "dadgad",
    label: "DADGAD",
    instrument: "guitar",
    strings: stringsOf(["D", 4], ["A", 3], ["G", 3], ["D", 3], ["A", 2], ["D", 2]),
    rootInBass: true,
  },
  // Re-entrant: the high G on string 4 sits above the C string.
  ukulele: {
    id: "ukulele",
    label: "GCEA",
    instrument: "ukulele",
    strings: stringsOf(["A", 4], ["E", 4], ["C", 4], ["G", 4]),
    rootInBass: false,
  },
  // Sounding pitch: the bass guitar sounds an octave below the guitar's E A D G.
  bass: {
    id: "bass",
    label: "EADG",
    instrument: "bass",
    strings: stringsOf(["G", 2], ["D", 2], ["A", 1], ["E", 1]),
    rootInBass: true,
  },
  bass5: {
    id: "bass5",
    label: "BEADG",
    instrument: "bass5",
    strings: stringsOf(["G", 2], ["D", 2], ["A", 1], ["E", 1], ["B", 0]),
    rootInBass: true,
  },
  mandolin: {
    id: "mandolin",
    label: "GDAE",
    instrument: "mandolin",
    strings: stringsOf(["E", 5], ["A", 4], ["D", 4], ["G", 3]),
    rootInBass: false,
  },
};

/** The tunings the guitar can be in. The other instruments have one each. */
export const TUNING_IDS: readonly TuningId[] = ["standard", "dropD", "dadgad"];

/** The tuning of `instrument`: a guitar uses `tuning` (standard when left out), the others their own. */
export function tuningFor(instrument: StringInstrumentId, tuning: TuningId = "standard"): Tuning {
  if (instrument !== "guitar") return TUNINGS[instrument];
  return TUNING_IDS.includes(tuning) ? TUNINGS[tuning] : TUNINGS.standard;
}

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

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
export type StringInstrumentId = "guitar" | "ukulele" | "bass" | "bass5" | "mandolin" | "custom";

export const STRING_INSTRUMENTS: Readonly<Record<StringInstrumentId, { readonly label: string }>> =
  {
    guitar: { label: "Guitar" },
    ukulele: { label: "Ukulele" },
    bass: { label: "Bass" },
    bass5: { label: "5-string bass" },
    mandolin: { label: "Mandolin" },
    // Any number of strings in any tuning, set on the settings page.
    custom: { label: "Custom" },
  };

export const STRING_INSTRUMENT_IDS = Object.keys(STRING_INSTRUMENTS) as StringInstrumentId[];

/** The guitar tunings, then the one tuning of each other instrument (named after it). */
export type TuningId = "standard" | "dropD" | "dadgad" | "ukulele" | "bass" | "bass5" | "mandolin";

export interface Tuning {
  readonly id: TuningId | "custom";
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
  /**
   * The highest fret an open chord may use: with an open string played, nothing is fretted above
   * it. Three on the guitar and bass; four on the ukulele and mandolin, whose short necks put the
   * fingers closer together (the ukulele's Em is 0432).
   */
  readonly openChordMaxFret: number;
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
    openChordMaxFret: 3,
  },
  dropD: {
    id: "dropD",
    label: "Drop D",
    instrument: "guitar",
    strings: stringsOf(["E", 4], ["B", 3], ["G", 3], ["D", 3], ["A", 2], ["D", 2]),
    rootInBass: true,
    openChordMaxFret: 3,
  },
  dadgad: {
    id: "dadgad",
    label: "DADGAD",
    instrument: "guitar",
    strings: stringsOf(["D", 4], ["A", 3], ["G", 3], ["D", 3], ["A", 2], ["D", 2]),
    rootInBass: true,
    openChordMaxFret: 3,
  },
  // Re-entrant: the high G on string 4 sits above the C string.
  ukulele: {
    id: "ukulele",
    label: "GCEA",
    instrument: "ukulele",
    strings: stringsOf(["A", 4], ["E", 4], ["C", 4], ["G", 4]),
    rootInBass: false,
    openChordMaxFret: 4,
  },
  // Sounding pitch: the bass guitar sounds an octave below the guitar's E A D G.
  bass: {
    id: "bass",
    label: "EADG",
    instrument: "bass",
    strings: stringsOf(["G", 2], ["D", 2], ["A", 1], ["E", 1]),
    rootInBass: true,
    openChordMaxFret: 3,
  },
  bass5: {
    id: "bass5",
    label: "BEADG",
    instrument: "bass5",
    strings: stringsOf(["G", 2], ["D", 2], ["A", 1], ["E", 1], ["B", 0]),
    rootInBass: true,
    openChordMaxFret: 3,
  },
  mandolin: {
    id: "mandolin",
    label: "GDAE",
    instrument: "mandolin",
    strings: stringsOf(["E", 5], ["A", 4], ["D", 4], ["G", 3]),
    rootInBass: false,
    openChordMaxFret: 4,
  },
};

/** The tunings the guitar can be in. The other instruments have one each. */
export const TUNING_IDS: readonly TuningId[] = ["standard", "dropD", "dadgad"];

/** The fewest and most strings a custom setup can have. */
export const MIN_STRINGS = 2;
export const MAX_STRINGS = 8;

/** Open strings below this (G3) put the chord's root lowest in a grip; above it the grips start on any chord tone. */
const ROOT_IN_BASS_BELOW = 55;

/**
 * A tuning made of `strings` (string 1 first, the highest-sounding on most instruments). How
 * grips are searched follows from the range: instruments that reach below G3 (guitar, bass)
 * put the root lowest and open chords stop at the third fret; higher ones (ukulele, mandolin)
 * start grips on any chord tone and reach to the fourth fret. This reproduces the built-in
 * tunings.
 */
export function customTuning(strings: readonly OpenString[]): Tuning {
  const lowest = Math.min(...strings.map(openStringMidi));
  const low = lowest < ROOT_IN_BASS_BELOW;
  return {
    id: "custom",
    label: "Custom",
    instrument: "custom",
    strings,
    rootInBass: low,
    openChordMaxFret: low ? 3 : 4,
  };
}

/**
 * The tuning of `instrument`: a guitar uses `tuning` (standard when left out), a custom setup
 * its own `strings` (standard guitar when left out), the others their own.
 */
export function tuningFor(
  instrument: StringInstrumentId,
  tuning: TuningId = "standard",
  strings?: readonly OpenString[],
): Tuning {
  if (instrument === "custom") return customTuning(strings ?? STANDARD_TUNING);
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

/** A pressed place on the neck: one string at one fret (0 = the open string). */
export interface FretPick {
  /** 1 = the highest-sounding string, as in `NeckPlace`. */
  readonly string: number;
  readonly fret: number;
}

/**
 * Press `fret` on `string`. A string sounds one note at a time, so this replaces
 * whatever was pressed on that string; pressing the same place again lets go.
 */
export function togglePick(picks: readonly FretPick[], pick: FretPick): FretPick[] {
  const same = picks.some((p) => p.string === pick.string && p.fret === pick.fret);
  const others = picks.filter((p) => p.string !== pick.string);
  return same ? others : [...others, pick].sort((a, b) => a.string - b.string);
}

/**
 * MIDI numbers of the notes the pressed places sound in `tuning`, lowest first.
 * Places on strings the tuning doesn't have are ignored.
 */
export function pickedMidi(
  picks: readonly FretPick[],
  tuning: readonly OpenString[] = STANDARD_TUNING,
): number[] {
  return picks
    .flatMap((pick) => {
      const open = tuning[pick.string - 1];
      return open ? [openStringMidi(open) + pick.fret] : [];
    })
    .sort((a, b) => a - b);
}

/** How many frets the picker shows at a time (the open string is always shown too). */
export const FRET_WINDOW = 12;

/** The highest fret that can be pressed: two octaves up the neck. */
export const MAX_PICK_FRET = 24;

/** The first fret of each window the picker can show: frets 1–12 and frets 13–24. */
export const FRET_WINDOW_STARTS: readonly number[] = [1, 1 + FRET_WINDOW];

/** Pressed places as link text, "6.0,5.2,4.2": string, a dot and the fret, lowest string number first. */
export function formatPicks(picks: readonly FretPick[]): string {
  return picks.map((p) => `${p.string}.${p.fret}`).join(",");
}

/**
 * Pressed places from link text. A place that is not `string.fret`, is on a string the
 * instrument lacks or above `MAX_PICK_FRET` is dropped, and a string keeps its first
 * place, so any text gives a valid set, sorted by string.
 */
export function parsePicks(text: string | null, stringCount: number): FretPick[] {
  if (!text) return [];
  const picks: FretPick[] = [];
  for (const part of text.split(",")) {
    const match = /^(\d{1,2})\.(\d{1,2})$/.exec(part);
    if (!match) continue;
    const string = Number(match[1]);
    const fret = Number(match[2]);
    if (string < 1 || string > stringCount || fret > MAX_PICK_FRET) continue;
    if (picks.some((p) => p.string === string)) continue;
    picks.push({ string, fret });
  }
  return picks.sort((a, b) => a.string - b.string);
}

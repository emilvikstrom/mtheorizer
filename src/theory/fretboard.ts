import type { Chord, ChordTone } from './chords';
import { type Note, note, pitchClass } from './notes';
import { midiOf } from './voicing';

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
  { note: note('E'), octave: 4 },
  { note: note('B'), octave: 3 },
  { note: note('G'), octave: 3 },
  { note: note('D'), octave: 3 },
  { note: note('A'), octave: 2 },
  { note: note('E'), octave: 2 },
];

export interface FretPosition extends ChordTone {
  /** 1 = the highest-sounding string (high E in standard tuning). */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
  /** MIDI note number of the sounding pitch. */
  readonly midi: number;
}

export function openStringMidi(open: OpenString): number {
  return midiOf(pitchClass(open.note), open.octave);
}

/**
 * Every place on the neck, from the open string up to `frets`, where a tone of
 * the chord can be played. Each position carries the chord tone it belongs to,
 * so it is spelled as in the chord (E♭ in E♭ minor, never D♯).
 */
export function fretboardPositions(
  chord: Chord,
  tuning: readonly OpenString[] = STANDARD_TUNING,
  frets = 12,
): FretPosition[] {
  const toneByPitchClass = new Map(chord.tones.map((tone) => [pitchClass(tone.note), tone]));
  const positions: FretPosition[] = [];
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

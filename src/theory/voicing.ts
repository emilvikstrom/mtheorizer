import type { Chord, ChordTone } from './chords';
import { pitchClass } from './notes';

export interface VoicedTone extends ChordTone {
  /** MIDI note number; middle C (C4) is 60. */
  readonly midi: number;
}

/** MIDI number of pitch class `pc` in `octave` (scientific pitch notation, C4 = 60). */
export function midiOf(pc: number, octave: number): number {
  return 12 * (octave + 1) + pc;
}

/**
 * The chord in root position, with the root in `octave` and the other tones
 * stacked above it. With octave 4 every major or minor triad fits in C4–B5.
 */
export function rootPosition(chord: Chord, octave = 4): VoicedTone[] {
  const rootMidi = midiOf(pitchClass(chord.root), octave);
  return chord.tones.map((tone) => ({ ...tone, midi: rootMidi + tone.interval.semitones }));
}

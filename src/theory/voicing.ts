import type { Chord, ChordTone } from './chords';
import { type Note, pitchClass } from './notes';
import type { SpelledScale } from './scales';

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

/** A tone to highlight on an instrument, whether it belongs to a chord or a scale. */
export interface HighlightTone {
  readonly note: Note;
  /** The root of a chord or the tonic of a scale. */
  readonly isRoot: boolean;
  /** What the tone is, e.g. "third" in a chord or "degree-3" in a scale. */
  readonly role: string;
}

/** A key to highlight on the keyboard. */
export interface KeyboardTone extends HighlightTone {
  readonly midi: number;
}

export function chordHighlights(chord: Chord): HighlightTone[] {
  return chord.tones.map(({ note, role }) => ({ note, isRoot: role === 'root', role }));
}

export function scaleHighlights(scale: SpelledScale): HighlightTone[] {
  return scale.tones.map(({ note, degree }) => ({ note, isRoot: degree === 1, role: `degree-${degree}` }));
}

export function chordOnKeyboard(chord: Chord, octave = 4): KeyboardTone[] {
  return rootPosition(chord, octave).map(({ note, midi, role }) => ({
    note,
    midi,
    isRoot: role === 'root',
    role,
  }));
}

/**
 * The scale ascending from the tonic in `octave`, ending on the tonic an octave
 * up. With octave 4 every scale fits in C4–B5 (B major runs B4–B5).
 */
export function scaleOnKeyboard(scale: SpelledScale, octave = 4): KeyboardTone[] {
  const tonicMidi = midiOf(pitchClass(scale.tonic), octave);
  const tones: KeyboardTone[] = scale.tones.map(({ note, degree, interval }) => ({
    note,
    midi: tonicMidi + interval.semitones,
    isRoot: degree === 1,
    role: `degree-${degree}`,
  }));
  tones.push({ note: scale.tonic, midi: tonicMidi + 12, isRoot: true, role: 'degree-8' });
  return tones;
}

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
 * stacked above it in thirds, extensions above the octave. With octave 4
 * every triad and seventh chord fits in C4–B5; a thirteenth chord on B
 * reaches G♯6.
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
  /** A chord tone that may be left out when the chord is played (often the fifth). */
  readonly optional?: boolean;
}

/** A key to highlight on the keyboard. */
export interface KeyboardTone extends HighlightTone {
  readonly midi: number;
  /** The lowest sounding tone of a chord, which decides the inversion. */
  readonly isBass?: boolean;
}

export function chordHighlights(chord: Chord): HighlightTone[] {
  return chord.tones.map(({ note, role, optional }) => ({ note, isRoot: role === 'root', role, optional }));
}

export function scaleHighlights(scale: SpelledScale): HighlightTone[] {
  return scale.tones.map(({ note, degree }) => ({ note, isRoot: degree === 1, role: `degree-${degree}` }));
}

/** Most inversions offered: up to the third, even for chords with more tones. */
const MAX_INVERSION = 3;

/**
 * How many inversions `chord` has: two for a triad, three for seventh chords
 * and larger. Only tones within the octave can take the bass, so a ninth or a
 * thirteenth stays where it is.
 */
export function inversionCount(chord: Chord): number {
  const inOctave = chord.tones.filter((tone) => tone.interval.semitones < 12).length;
  return Math.min(MAX_INVERSION, inOctave - 1);
}

/** The name of an inversion: "Root position", "1st inversion", "2nd inversion" … */
export function inversionName(inversion: number): string {
  if (inversion === 0) return 'Root position';
  const suffix = inversion === 1 ? 'st' : inversion === 2 ? 'nd' : inversion === 3 ? 'rd' : 'th';
  return `${inversion}${suffix} inversion`;
}

/**
 * The chord on the keyboard in the given inversion. Each inversion moves the
 * lowest tone up an octave, so the next tone up ends up in the bass.
 * The inversion is clamped to what the chord has.
 */
export function chordOnKeyboard(chord: Chord, octave = 4, inversion = 0): KeyboardTone[] {
  const n = Math.max(0, Math.min(Math.trunc(inversion), inversionCount(chord)));
  // Tones are not always listed in pitch order, so invert by pitch.
  const inRootPosition = rootPosition(chord, octave);
  const lowest = new Set([...inRootPosition].sort((a, b) => a.midi - b.midi).slice(0, n));
  const voiced = inRootPosition.map((tone) => (lowest.has(tone) ? { ...tone, midi: tone.midi + 12 } : tone));
  const bass = Math.min(...voiced.map((tone) => tone.midi));
  return voiced.map(({ note, midi, role, optional }) => ({
    note,
    midi,
    isRoot: role === 'root',
    isBass: midi === bass,
    role,
    optional,
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

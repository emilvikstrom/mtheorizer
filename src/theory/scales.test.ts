import { describe, expect, it } from 'vitest';
import { formatNoteAscii, parseNote } from './notes';
import {
  MAJOR_SCALE,
  NATURAL_MINOR_SCALE,
  buildScale,
  keySignatureAccidentals,
  scaleOnPitchClass,
  scaleToneLabel,
} from './scales';

const scale = (tonic: string, s: typeof MAJOR_SCALE) =>
  buildScale(parseNote(tonic), s).map(formatNoteAscii).join(' ');

describe('scales', () => {
  it('builds major scales', () => {
    expect(scale('C', MAJOR_SCALE)).toBe('C D E F G A B');
    expect(scale('Eb', MAJOR_SCALE)).toBe('Eb F G Ab Bb C D');
    expect(scale('F#', MAJOR_SCALE)).toBe('F# G# A# B C# D# E#');
  });

  it('builds natural minor scales', () => {
    expect(scale('A', NATURAL_MINOR_SCALE)).toBe('A B C D E F G');
    expect(scale('C#', NATURAL_MINOR_SCALE)).toBe('C# D# E F# G# A B');
  });

  it('counts key signature accidentals', () => {
    expect(keySignatureAccidentals(parseNote('C'), MAJOR_SCALE)).toBe(0);
    expect(keySignatureAccidentals(parseNote('Db'), MAJOR_SCALE)).toBe(5);
    expect(keySignatureAccidentals(parseNote('C#'), MAJOR_SCALE)).toBe(7);
    expect(keySignatureAccidentals(parseNote('D#'), MAJOR_SCALE)).toBe(9);
    expect(keySignatureAccidentals(parseNote('Eb'), NATURAL_MINOR_SCALE)).toBe(6);
    expect(keySignatureAccidentals(parseNote('D#'), NATURAL_MINOR_SCALE)).toBe(6);
  });
});

describe('all 24 major and natural minor scales', () => {
  // Pitch class 0..11 → expected spelling, the way a musician would write it.
  const MAJOR = [
    'C D E F G A B',
    'Db Eb F Gb Ab Bb C',
    'D E F# G A B C#',
    'Eb F G Ab Bb C D',
    'E F# G# A B C# D#',
    'F G A Bb C D E',
    'F# G# A# B C# D# E#',
    'G A B C D E F#',
    'Ab Bb C Db Eb F G',
    'A B C# D E F# G#',
    'Bb C D Eb F G A',
    'B C# D# E F# G# A#',
  ];
  const NATURAL_MINOR = [
    'C D Eb F G Ab Bb',
    'C# D# E F# G# A B',
    'D E F G A Bb C',
    'Eb F Gb Ab Bb Cb Db',
    'E F# G A B C D',
    'F G Ab Bb C Db Eb',
    'F# G# A B C# D E',
    'G A Bb C D Eb F',
    'G# A# B C# D# E F#',
    'A B C D E F G',
    'Bb C Db Eb F Gb Ab',
    'B C# D E F# G A',
  ];

  const notesOf = (pc: number, id: 'major' | 'naturalMinor') =>
    scaleOnPitchClass(pc, id)
      .tones.map((t) => formatNoteAscii(t.note))
      .join(' ');

  it.each(MAJOR.map((expected, pc) => [pc, expected]))('major on pitch class %i is %s', (pc, expected) => {
    expect(notesOf(pc as number, 'major')).toBe(expected);
  });

  it.each(NATURAL_MINOR.map((expected, pc) => [pc, expected]))(
    'natural minor on pitch class %i is %s',
    (pc, expected) => {
      expect(notesOf(pc as number, 'naturalMinor')).toBe(expected);
    },
  );

  it('uses every letter exactly once', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const id of ['major', 'naturalMinor'] as const) {
        const letters = scaleOnPitchClass(pc, id).tones.map((t) => t.note.letter);
        expect(new Set(letters).size).toBe(7);
      }
    }
  });

  it('numbers the degrees and names the scale', () => {
    const scale = scaleOnPitchClass(3, 'naturalMinor');
    expect(scale.name).toBe('E♭ natural minor scale');
    expect(scale.tones.map((t) => t.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scale.tones.map(scaleToneLabel)).toEqual([
      'Tonic',
      'Major second',
      'Minor third',
      'Perfect fourth',
      'Perfect fifth',
      'Minor sixth',
      'Minor seventh',
    ]);
  });
});

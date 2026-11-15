import { describe, expect, it } from 'vitest';
import { formatNoteAscii, parseNote } from './notes';
import { MAJOR_SCALE, NATURAL_MINOR_SCALE, buildScale, keySignatureAccidentals } from './scales';

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

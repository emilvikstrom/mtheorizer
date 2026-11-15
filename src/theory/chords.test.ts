import { describe, expect, it } from 'vitest';
import { buildChord, chordOnPitchClass, preferredRootSpelling } from './chords';
import { formatNoteAscii, parseNote, pitchClass } from './notes';

const notesOf = (chord: ReturnType<typeof buildChord>) =>
  chord.tones.map((t) => formatNoteAscii(t.note)).join(' ');

describe('all 24 major and minor triads', () => {
  // Pitch class 0..11 → expected spelling, the way a musician would write it.
  const MAJOR = [
    'C E G',
    'Db F Ab',
    'D F# A',
    'Eb G Bb',
    'E G# B',
    'F A C',
    'F# A# C#',
    'G B D',
    'Ab C Eb',
    'A C# E',
    'Bb D F',
    'B D# F#',
  ];
  const MINOR = [
    'C Eb G',
    'C# E G#',
    'D F A',
    'Eb Gb Bb',
    'E G B',
    'F Ab C',
    'F# A C#',
    'G Bb D',
    'G# B D#',
    'A C E',
    'Bb Db F',
    'B D F#',
  ];

  it.each(MAJOR.map((expected, pc) => [pc, expected]))('major on pitch class %i is %s', (pc, expected) => {
    expect(notesOf(chordOnPitchClass(pc as number, 'major'))).toBe(expected);
  });

  it.each(MINOR.map((expected, pc) => [pc, expected]))('minor on pitch class %i is %s', (pc, expected) => {
    expect(notesOf(chordOnPitchClass(pc as number, 'minor'))).toBe(expected);
  });

  it('keeps every chord tone on the right pitch', () => {
    for (let pc = 0; pc < 12; pc++) {
      const major = chordOnPitchClass(pc, 'major').tones.map((t) => pitchClass(t.note));
      const minor = chordOnPitchClass(pc, 'minor').tones.map((t) => pitchClass(t.note));
      expect(major).toEqual([pc, (pc + 4) % 12, (pc + 7) % 12]);
      expect(minor).toEqual([pc, (pc + 3) % 12, (pc + 7) % 12]);
    }
  });
});

describe('preferredRootSpelling', () => {
  const spell = (pc: number, q: 'major' | 'minor') => formatNoteAscii(preferredRootSpelling(pc, q));

  it('uses the key with fewer accidentals', () => {
    expect(spell(1, 'major')).toBe('Db');
    expect(spell(1, 'minor')).toBe('C#');
    expect(spell(8, 'major')).toBe('Ab');
    expect(spell(8, 'minor')).toBe('G#');
  });

  it('breaks ties toward F# major and Eb minor', () => {
    expect(spell(6, 'major')).toBe('F#');
    expect(spell(3, 'minor')).toBe('Eb');
  });

  it('always names white keys naturally', () => {
    for (const pc of [0, 2, 4, 5, 7, 9, 11]) {
      expect(preferredRootSpelling(pc, 'major').accidental).toBe(0);
      expect(preferredRootSpelling(pc, 'minor').accidental).toBe(0);
    }
  });
});

describe('buildChord', () => {
  it('names the chord and its symbol', () => {
    const chord = buildChord(parseNote('Eb'), 'minor');
    expect(chord.name).toBe('E♭ minor');
    expect(chord.symbol).toBe('E♭m');
    expect(buildChord(parseNote('C'), 'major').symbol).toBe('C');
  });

  it('spells any root strictly, even unusual ones', () => {
    expect(notesOf(buildChord(parseNote('C#'), 'major'))).toBe('C# E# G#');
    expect(notesOf(buildChord(parseNote('Db'), 'minor'))).toBe('Db Fb Ab');
  });

  it('labels each tone with its role and interval', () => {
    const chord = buildChord(parseNote('A'), 'minor');
    expect(chord.tones.map((t) => [t.role, t.interval.name])).toEqual([
      ['root', 'Perfect unison'],
      ['third', 'Minor third'],
      ['fifth', 'Perfect fifth'],
    ]);
  });
});

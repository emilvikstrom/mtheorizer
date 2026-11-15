import { describe, expect, it } from 'vitest';
import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  circlePosition,
  diatonicTriads,
  dominantKey,
  formatKey,
  harmonicMinorDominant,
  key,
  keyScale,
  keySignature,
  keysAt,
  parallelKey,
  relativeKey,
  subdominantKey,
} from './keys';
import { formatNoteAscii, parseNote, pitchClass } from './notes';

const k = (tonic: string, mode: KeyMode = 'major') => key(parseNote(tonic), mode);
const ascii = (key: Key) => `${formatNoteAscii(key.tonic)} ${key.mode}`;
const signature = (key: Key) => keySignature(key).accidentals.map(formatNoteAscii).join(' ');

describe('circle of fifths', () => {
  // Position 0..11 clockwise from C: every spelling, the usual one first.
  const MAJORS = ['C', 'G', 'D', 'A', 'E', 'B Cb', 'F# Gb', 'Db C#', 'Ab', 'Eb', 'Bb', 'F'];
  const MINORS = ['A', 'E', 'B', 'F#', 'C#', 'G# Ab', 'D# Eb', 'Bb A#', 'F', 'C', 'G', 'D'];

  it.each(MAJORS.map((expected, position) => [position, expected]))(
    'position %i has the major keys %s',
    (position, expected) => {
      expect(keysAt(position as number, 'major').map((x) => formatNoteAscii(x.tonic)).join(' ')).toBe(expected);
    },
  );

  it.each(MINORS.map((expected, position) => [position, expected]))(
    'position %i has the minor keys %s',
    (position, expected) => {
      expect(keysAt(position as number, 'minor').map((x) => formatNoteAscii(x.tonic)).join(' ')).toBe(expected);
    },
  );

  it('steps a perfect fifth (7 semitones) between neighbours', () => {
    for (let position = 0; position < 12; position++) {
      const here = CIRCLE_OF_FIFTHS[position]?.[0];
      const next = CIRCLE_OF_FIFTHS[(position + 1) % 12]?.[0];
      expect(here && next && (pitchClass(next) - pitchClass(here) + 12) % 12).toBe(7);
    }
  });

  it('finds the position of any key, major or minor', () => {
    for (let position = 0; position < 12; position++) {
      for (const mode of ['major', 'minor'] as const) {
        for (const x of keysAt(position, mode)) {
          expect(circlePosition(x)).toBe(position);
        }
      }
    }
  });
});

describe('keySignature', () => {
  it.each([
    ['C', 'none', ''],
    ['G', 'sharps', 'F#'],
    ['D', 'sharps', 'F# C#'],
    ['A', 'sharps', 'F# C# G#'],
    ['E', 'sharps', 'F# C# G# D#'],
    ['B', 'sharps', 'F# C# G# D# A#'],
    ['F#', 'sharps', 'F# C# G# D# A# E#'],
    ['C#', 'sharps', 'F# C# G# D# A# E# B#'],
    ['F', 'flats', 'Bb'],
    ['Bb', 'flats', 'Bb Eb'],
    ['Eb', 'flats', 'Bb Eb Ab'],
    ['Ab', 'flats', 'Bb Eb Ab Db'],
    ['Db', 'flats', 'Bb Eb Ab Db Gb'],
    ['Gb', 'flats', 'Bb Eb Ab Db Gb Cb'],
    ['Cb', 'flats', 'Bb Eb Ab Db Gb Cb Fb'],
  ])('%s major has %s: %s', (tonic, kind, expected) => {
    expect(keySignature(k(tonic)).kind).toBe(kind);
    expect(signature(k(tonic))).toBe(expected);
  });

  it('gives a minor key the signature of its relative major', () => {
    for (let position = 0; position < 12; position++) {
      for (const minor of keysAt(position, 'minor')) {
        expect(signature(minor)).toBe(signature(relativeKey(minor)));
      }
    }
  });
});

describe('related keys', () => {
  it('finds relative keys', () => {
    expect(ascii(relativeKey(k('C')))).toBe('A minor');
    expect(ascii(relativeKey(k('Eb')))).toBe('C minor');
    expect(ascii(relativeKey(k('F#')))).toBe('D# minor');
    expect(ascii(relativeKey(k('Bb', 'minor')))).toBe('Db major');
  });

  it('finds dominant and subdominant keys', () => {
    expect(ascii(dominantKey(k('C')))).toBe('G major');
    expect(ascii(subdominantKey(k('C')))).toBe('F major');
    expect(ascii(dominantKey(k('A', 'minor')))).toBe('E minor');
    expect(ascii(subdominantKey(k('A', 'minor')))).toBe('D minor');
    expect(ascii(dominantKey(k('F')))).toBe('C major');
    expect(ascii(subdominantKey(k('G')))).toBe('C major');
  });

  it('keeps sharps or flats when the neighbour has two names', () => {
    expect(ascii(dominantKey(k('B')))).toBe('F# major');
    expect(ascii(subdominantKey(k('Db')))).toBe('Gb major');
    expect(ascii(dominantKey(k('F#')))).toBe('C# major');
    expect(ascii(dominantKey(k('G#', 'minor')))).toBe('D# minor');
    expect(ascii(subdominantKey(k('Bb', 'minor')))).toBe('Eb minor');
  });

  it('finds parallel keys on the circle', () => {
    expect(ascii(parallelKey(k('C')))).toBe('C minor');
    expect(ascii(parallelKey(k('A', 'minor')))).toBe('A major');
    expect(ascii(parallelKey(k('C#', 'minor')))).toBe('C# major');
    expect(ascii(parallelKey(k('Eb')))).toBe('Eb minor');
    // G# major (with F##) is not on the circle, so its enharmonic twin is used.
    expect(ascii(parallelKey(k('G#', 'minor')))).toBe('Ab major');
  });

  it('formats keys', () => {
    expect(formatKey(k('Eb'))).toBe('E♭ major');
    expect(formatKey(k('C#', 'minor'))).toBe('C♯ minor');
  });
});

describe('diatonicTriads', () => {
  const symbols = (key: Key) => diatonicTriads(key).map((t) => t.symbol).join(' ');
  const romans = (key: Key) => diatonicTriads(key).map((t) => t.roman).join(' ');

  it('builds the triads of C major and A minor', () => {
    expect(symbols(k('C'))).toBe('C Dm Em F G Am B°');
    expect(romans(k('C'))).toBe('I ii iii IV V vi vii°');
    expect(symbols(k('A', 'minor'))).toBe('Am B° C Dm Em F G');
    expect(romans(k('A', 'minor'))).toBe('i ii° III iv v VI VII');
  });

  it('spells the triads from the scale', () => {
    expect(symbols(k('F#'))).toBe('F♯ G♯m A♯m B C♯ D♯m E♯°');
    expect(symbols(k('Eb', 'minor'))).toBe('E♭m F° G♭ A♭m B♭m C♭ D♭');
    expect(diatonicTriads(k('Eb'))[4]?.notes.map(formatNoteAscii)).toEqual(['Bb', 'D', 'F']);
  });

  it('has the same pattern of qualities in every key on the circle', () => {
    const MAJOR = 'major minor minor major major minor diminished';
    const MINOR = 'minor diminished major minor minor major major';
    for (let position = 0; position < 12; position++) {
      for (const x of keysAt(position, 'major')) {
        expect(diatonicTriads(x).map((t) => t.quality).join(' ')).toBe(MAJOR);
      }
      for (const x of keysAt(position, 'minor')) {
        expect(diatonicTriads(x).map((t) => t.quality).join(' ')).toBe(MINOR);
      }
    }
  });

  it('marks tonic, subdominant and dominant', () => {
    expect(diatonicTriads(k('G')).map((t) => t.function ?? '-')).toEqual([
      'tonic', '-', '-', 'subdominant', 'dominant', '-', '-',
    ]);
  });

  it('uses the key scale as roots', () => {
    expect(diatonicTriads(k('D', 'minor')).map((t) => formatNoteAscii(t.notes[0]!))).toEqual(
      keyScale(k('D', 'minor')).map(formatNoteAscii),
    );
  });
});

describe('harmonicMinorDominant', () => {
  it('raises the seventh to make a major dominant', () => {
    expect(harmonicMinorDominant(k('A', 'minor'))?.symbol).toBe('E');
    expect(harmonicMinorDominant(k('G#', 'minor'))?.tones.map((t) => formatNoteAscii(t.note))).toEqual([
      'D#', 'F##', 'A#',
    ]);
    expect(harmonicMinorDominant(k('C'))).toBeUndefined();
  });
});

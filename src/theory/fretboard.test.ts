import { describe, expect, it } from 'vitest';
import { CHORD_QUALITY_IDS, chordOnPitchClass } from './chords';
import { STANDARD_TUNING, fretboardPositions, openStringMidi } from './fretboard';
import { formatNote, pitchClass } from './notes';


/** Positions on one string as "fret:note:role". */
const onString = (positions: ReturnType<typeof fretboardPositions>, string: number) =>
  positions
    .filter((p) => p.string === string)
    .map((p) => `${p.fret}:${formatNote(p.note)}:${p.role}`);

describe('fretboard', () => {
  it('tunes the open strings E4 B3 G3 D3 A2 E2', () => {
    expect(STANDARD_TUNING.map(openStringMidi)).toEqual([64, 59, 55, 50, 45, 40]);
  });

  it('finds C major on the low E string', () => {
    const positions = fretboardPositions(chordOnPitchClass(0, 'major'));
    expect(onString(positions, 6)).toEqual(['0:E:third', '3:G:fifth', '8:C:root', '12:E:third']);
    expect(positions.find((p) => p.string === 6 && p.fret === 8)?.midi).toBe(48);
  });

  it('spells E♭ minor with flats on the G string', () => {
    const positions = fretboardPositions(chordOnPitchClass(3, 'minor'));
    expect(onString(positions, 3)).toEqual(['3:B♭:fifth', '8:E♭:root', '11:G♭:third']);
  });

  it('respects the fret count', () => {
    const positions = fretboardPositions(chordOnPitchClass(0, 'major'), STANDARD_TUNING, 5);
    expect(Math.max(...positions.map((p) => p.fret))).toBeLessThanOrEqual(5);
    expect(onString(positions, 6)).toEqual(['0:E:third', '3:G:fifth']);
  });

  describe.each(CHORD_QUALITY_IDS)('every %s chord', (quality) => {
    it.each(Array.from({ length: 12 }, (_, pc) => pc))('on pitch class %i fits the neck', (pc) => {
      const chord = chordOnPitchClass(pc, quality);
      const positions = fretboardPositions(chord);

      for (const position of positions) {
        // The sounding pitch matches the spelled note it is labelled with.
        expect(position.midi % 12).toBe(pitchClass(position.note));
        expect(chord.tones.map((t) => t.note)).toContainEqual(position.note);
      }

      STANDARD_TUNING.forEach((open, index) => {
        const string = positions.filter((p) => p.string === index + 1);
        // Frets 0–11 hold each chord tone exactly once; fret 12 repeats the open string.
        for (const tone of chord.tones) {
          expect(string.filter((p) => p.fret < 12 && p.role === tone.role)).toHaveLength(1);
        }
        const openIsChordTone = chord.tones.some((t) => pitchClass(t.note) === pitchClass(open.note));
        expect(string).toHaveLength(chord.tones.length + (openIsChordTone ? 1 : 0));
      });
    });
  });
});

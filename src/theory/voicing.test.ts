import { describe, expect, it } from 'vitest';
import { CHORD_QUALITIES, CHORD_QUALITY_IDS, chordOnPitchClass, qualitiesInGroup } from './chords';
import { scaleOnPitchClass } from './scales';
import { chordOnKeyboard, midiOf, rootPosition, scaleOnKeyboard } from './voicing';

describe('voicing', () => {
  it('numbers middle C as 60', () => {
    expect(midiOf(0, 4)).toBe(60);
    expect(midiOf(11, 5)).toBe(83);
  });

  it('stacks the chord above the root', () => {
    expect(rootPosition(chordOnPitchClass(0, 'major')).map((t) => t.midi)).toEqual([60, 64, 67]);
    expect(rootPosition(chordOnPitchClass(11, 'major')).map((t) => t.midi)).toEqual([71, 75, 78]);
  });

  it('fits every triad and seventh chord on a two-octave keyboard from C4', () => {
    const qualities = [...qualitiesInGroup('triads'), ...qualitiesInGroup('sixths'), ...qualitiesInGroup('sevenths')]
      // A six-nine reaches past the octave.
      .filter((q) => q.tones.every((t) => t.interval.semitones < 12))
      .map((q) => q.id);
    expect(qualities).toContain('diminished7');
    for (let pc = 0; pc < 12; pc++) {
      for (const quality of qualities) {
        for (const { midi } of rootPosition(chordOnPitchClass(pc, quality))) {
          expect(midi).toBeGreaterThanOrEqual(60);
          expect(midi).toBeLessThanOrEqual(83);
        }
      }
    }
  });

  it('stacks extensions above the octave, within C4–G♯6', () => {
    expect(rootPosition(chordOnPitchClass(0, 'dominant13')).map((t) => t.midi)).toEqual([60, 64, 67, 70, 74, 81]);
    for (let pc = 0; pc < 12; pc++) {
      for (const quality of CHORD_QUALITY_IDS) {
        const midis = rootPosition(chordOnPitchClass(pc, quality)).map((t) => t.midi);
        expect(Math.min(...midis)).toBe(60 + pc);
        expect(Math.max(...midis)).toBeLessThanOrEqual(midiOf(8, 6));
        expect(midis).toEqual([...midis].sort((a, b) => a - b));
        expect(midis.length).toBe(CHORD_QUALITIES[quality].tones.length);
      }
    }
  });

  it('marks the chord root on the keyboard', () => {
    expect(chordOnKeyboard(chordOnPitchClass(9, 'minor')).map((t) => `${t.midi}:${t.role}:${t.isRoot}`)).toEqual([
      '69:root:true',
      '72:third:false',
      '76:fifth:false',
    ]);
  });

  it('runs a scale from tonic to tonic', () => {
    const tones = scaleOnKeyboard(scaleOnPitchClass(0, 'major'));
    expect(tones.map((t) => t.midi)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(tones.filter((t) => t.isRoot).map((t) => t.midi)).toEqual([60, 72]);
  });

  it('fits every scale on a two-octave keyboard from C4', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const id of ['major', 'naturalMinor'] as const) {
        for (const { midi } of scaleOnKeyboard(scaleOnPitchClass(pc, id))) {
          expect(midi).toBeGreaterThanOrEqual(60);
          expect(midi).toBeLessThanOrEqual(83);
        }
      }
    }
  });
});

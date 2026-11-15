import { describe, expect, it } from 'vitest';
import { chordOnPitchClass } from './chords';
import { midiOf, rootPosition } from './voicing';

describe('voicing', () => {
  it('numbers middle C as 60', () => {
    expect(midiOf(0, 4)).toBe(60);
    expect(midiOf(11, 5)).toBe(83);
  });

  it('stacks the chord above the root', () => {
    expect(rootPosition(chordOnPitchClass(0, 'major')).map((t) => t.midi)).toEqual([60, 64, 67]);
    expect(rootPosition(chordOnPitchClass(11, 'major')).map((t) => t.midi)).toEqual([71, 75, 78]);
  });

  it('fits every triad on a two-octave keyboard from C4', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const quality of ['major', 'minor'] as const) {
        for (const { midi } of rootPosition(chordOnPitchClass(pc, quality))) {
          expect(midi).toBeGreaterThanOrEqual(60);
          expect(midi).toBeLessThanOrEqual(83);
        }
      }
    }
  });
});

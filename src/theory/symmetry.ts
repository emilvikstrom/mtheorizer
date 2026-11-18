import { type Chord, buildChord, preferredRootSpelling } from "./chords";
import { type Note, mod12, pitchClass } from "./notes";
import { SCALES, type ScaleId, preferredTonicSpelling } from "./scales";

/**
 * The smallest number of semitones that maps a set of pitch classes onto itself, 1–12. A
 * diminished seventh (0 3 6 9) gives 3, an augmented triad (0 4 8) 4 and the whole-tone scale 2.
 * 12 means the set has no symmetry: only a full octave maps it onto itself.
 */
export function symmetryPeriod(pitchClasses: readonly number[]): number {
  const set = new Set(pitchClasses.map(mod12));
  for (let shift = 1; shift < 12; shift++) {
    if (12 % shift === 0 && [...set].every((pc) => set.has(mod12(pc + shift)))) return shift;
  }
  return 12;
}

/** The pitch classes of every tone in a chord, optional tones included. */
function chordPitchClasses(chord: Chord): number[] {
  return chord.tones.map((t) => pitchClass(t.note));
}

/** Whether the chord repeats itself inside the octave (diminished seventh, augmented triad …). */
export function isSymmetricChord(chord: Chord): boolean {
  return symmetryPeriod(chordPitchClasses(chord)) < 12;
}

/**
 * The roots that give a chord of the same quality on exactly the same keys, each spelled the usual
 * way for that root. The chord's own root comes first, then the others upward from it: C°7 gives
 * C, E♭, G♭ and A, because C°7, E♭°7, G♭°7 and A°7 are the same four keys. A chord with no
 * symmetry, or a free combination from the chord builder (no named quality), gives only its root.
 */
export function enharmonicRoots(chord: Chord): Note[] {
  const quality = chord.quality;
  const period = symmetryPeriod(chordPitchClasses(chord));
  if (!quality || period === 12) return [chord.root];
  const rootPc = pitchClass(chord.root);
  const roots: Note[] = [chord.root];
  for (let shift = period; shift < 12; shift += period) {
    roots.push(preferredRootSpelling(mod12(rootPc + shift), quality.id));
  }
  return roots;
}

/** The chords from `enharmonicRoots`: same quality and keys, on each equivalent root. */
export function enharmonicChords(chord: Chord): Chord[] {
  const quality = chord.quality;
  if (!quality) return [chord];
  const [, ...others] = enharmonicRoots(chord);
  return [chord, ...others.map((root) => buildChord(root, quality.id))];
}

/**
 * How many different keys a scale has before it starts over when transposed: 2 for the whole-tone
 * scale, 3 for the diminished scales, 12 for every ordinary scale.
 */
export function scaleTranspositions(scaleId: ScaleId): number {
  return symmetryPeriod(SCALES[scaleId].degrees.map((d) => d.semitones));
}

/**
 * The tonics that give the same scale on the same keys: C whole tone is also D, E, F♯, G♯ and B♭
 * whole tone. The scale's own tonic comes first, then the others upward from it. An ordinary
 * scale gives only its own tonic.
 */
export function enharmonicTonics(tonic: Note, scaleId: ScaleId): Note[] {
  const scale = SCALES[scaleId];
  const period = scaleTranspositions(scaleId);
  const tonics: Note[] = [tonic];
  if (period === 12) return tonics;
  const tonicPc = pitchClass(tonic);
  for (let shift = period; shift < 12; shift += period) {
    tonics.push(preferredTonicSpelling(mod12(tonicPc + shift), scale));
  }
  return tonics;
}

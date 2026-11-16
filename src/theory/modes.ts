import {
  type Interval,
  MINOR_SECOND,
  MINOR_SEVENTH,
  MINOR_SIXTH,
  MINOR_THIRD,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  PERFECT_UNISON,
  transpose,
} from "./intervals";
import { type Key, type KeySignature, key, keySignature } from "./keys";
import type { Note } from "./notes";
import { SCALES, type ScaleId, preferredTonicSpelling } from "./scales";

/**
 * The seven modes of the major scale, brightest first: each is the major scale
 * started on another degree, so each one lowers a note of the one before it
 * (lydian ♯4 → ionian → mixolydian ♭7 → dorian ♭3 → aeolian ♭6 → phrygian ♭2 → locrian ♭5).
 * Aeolian is the natural minor scale.
 */
export const MODE_IDS = [
  "lydian",
  "major",
  "mixolydian",
  "dorian",
  "naturalMinor",
  "phrygian",
  "locrian",
] as const satisfies readonly ScaleId[];

export type ModeId = (typeof MODE_IDS)[number];

/** How far up from a mode's tonic the major key with the same notes starts. */
const PARENT_OFFSET: Record<ModeId, Interval> = {
  lydian: PERFECT_FIFTH, // C lydian = G major
  major: PERFECT_UNISON, // C ionian = C major
  mixolydian: PERFECT_FOURTH, // C mixolydian = F major
  dorian: MINOR_SEVENTH, // C dorian = B♭ major
  naturalMinor: MINOR_THIRD, // C aeolian = E♭ major
  phrygian: MINOR_SIXTH, // C phrygian = A♭ major
  locrian: MINOR_SECOND, // C locrian = D♭ major
};

export interface ModeOnTonic {
  readonly mode: ModeId;
  /** The tonic, spelled the usual way for the mode. */
  readonly tonic: Note;
  /** The major key that has the same notes, so the same key signature. */
  readonly parent: Key;
  readonly signature: KeySignature;
}

/**
 * Which key signature `mode` on pitch class `pc` (0 = C … 11 = B) has: the one of the
 * major key with the same notes. C lydian → G major (one sharp), C mixolydian → F major
 * (one flat). The tonic is spelled as the scale picker does, so D♭ dorian, not C♯ dorian.
 */
export function modeKeySignature(pc: number, mode: ModeId): ModeOnTonic {
  const tonic = preferredTonicSpelling(pc, SCALES[mode]);
  const parent = key(transpose(tonic, PARENT_OFFSET[mode]), "major");
  return { mode, tonic, parent, signature: keySignature(parent) };
}

/**
 * Notation on a staff.
 *
 * A spelled note sits on one line or space of the staff, set by its letter and
 * octave alone: C♯4 and C♭4 share a place, and the accidental is written beside
 * the notehead. Places are counted in diatonic steps (one per letter, so seven
 * to the octave) where C0 = 0 and middle C (C4) = 28. Treble and bass clef then
 * form one ladder: the treble clef starts on E4 (30) and the bass clef on G2 (18).
 */

import { type Accidental, type Letter, type Note, letterIndex, note } from "./notes";
import { type SpelledScale, spellScale } from "./scales";
import { type Tonality, isMajorTonality } from "./tonality";

export type Clef = "treble" | "bass";

/** Diatonic step of middle C (C4). */
export const MIDDLE_C = 28;

/** Diatonic step of the bottom line of each clef: E4 for treble, G2 for bass. */
export const BOTTOM_LINE: Record<Clef, number> = { treble: 30, bass: 18 };

/** A staff has five lines, which are the steps from the bottom line up by two to eight. */
const LINE_SPAN = 8;

/** Octave of a spelled note that sounds as `midi` (B♯3 is MIDI 60, so it is in octave 3). */
export function noteOctave(n: Note, midi: number): number {
  return Math.floor((midi - n.accidental) / 12) - 1;
}

/** Diatonic step of a letter in an octave: C4 = 28, D4 = 29 … B4 = 34, C5 = 35. */
export function diatonicStep(letter: Letter, octave: number): number {
  return octave * 7 + letterIndex(letter);
}

/** Middle C and everything above it is written in the treble clef, the rest in the bass clef. */
export function clefFor(step: number): Clef {
  return step >= MIDDLE_C ? "treble" : "bass";
}

/** Place on the clef counted in steps above its bottom line: 0 = bottom line, 1 = first space … */
export function staffPosition(clef: Clef, step: number): number {
  return step - BOTTOM_LINE[clef];
}

/**
 * Diatonic steps of the ledger lines a note in `clef` needs: the short lines
 * through or below/above the notehead that continue the staff, nearest first.
 */
export function ledgerLines(clef: Clef, step: number): number[] {
  const bottom = BOTTOM_LINE[clef];
  const top = bottom + LINE_SPAN;
  const lines: number[] = [];
  for (let line = bottom - 2; line >= step; line -= 2) lines.push(line);
  for (let line = top + 2; line <= step; line += 2) lines.push(line);
  return lines;
}

export interface StaffTone {
  readonly note: Note;
  /** MIDI number the tone sounds at. */
  readonly midi: number;
  readonly isRoot?: boolean;
}

export interface StaffNote {
  readonly note: Note;
  readonly midi: number;
  readonly isRoot: boolean;
  readonly octave: number;
  /** Diatonic step: C4 = 28. */
  readonly step: number;
  readonly clef: Clef;
  /** Steps above the bottom line of the clef. */
  readonly position: number;
  /**
   * The accidental to write beside the notehead, or undefined when the key
   * signature or an earlier note already says it. 0 is a natural sign.
   */
  readonly sign: Accidental | undefined;
}

/**
 * Where each tone sits on the staff, in the order given. `signature` is the
 * key signature in force: a note it already alters gets no accidental, and a
 * note that goes against it gets one. An accidental holds for the rest of the
 * list for the same letter in the same octave, so a repeated altered note is
 * not marked twice.
 */
export function placeOnStaff(
  tones: readonly StaffTone[],
  signature: readonly Note[] = [],
): StaffNote[] {
  const inForce = new Map<string, Accidental>();
  const altered = (letter: Letter, octave: number): Accidental =>
    inForce.get(`${letter}${octave}`) ??
    signature.find((s) => s.letter === letter)?.accidental ??
    0;

  return tones.map((tone) => {
    const octave = noteOctave(tone.note, tone.midi);
    const step = diatonicStep(tone.note.letter, octave);
    const clef = clefFor(step);
    const current = altered(tone.note.letter, octave);
    const sign = tone.note.accidental === current ? undefined : tone.note.accidental;
    inForce.set(`${tone.note.letter}${octave}`, tone.note.accidental);
    return {
      note: tone.note,
      midi: tone.midi,
      isRoot: tone.isRoot === true,
      octave,
      step,
      clef,
      position: staffPosition(clef, step),
      sign,
    };
  });
}

/** Order in which sharps and flats are written in a key signature. */
const SHARP_ORDER: readonly Letter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: readonly Letter[] = ["B", "E", "A", "D", "G", "C", "F"];

/** Scales with a key signature: the seven-note ones built on the notes of a major key. */
const SIGNATURE_SCALES: ReadonlySet<string> = new Set([
  "major",
  "naturalMinor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
]);

/**
 * The key signature a scale is written with: its altered notes, sharps in the
 * order F C G D A E B and flats in the order B E A D G C F. Scales that are not
 * a mode of a major key (harmonic minor, blues, pentatonic …) have none and
 * write their accidentals beside the notes instead. So does a spelling that
 * would need a double sharp or flat.
 */
export function scaleSignature(scale: SpelledScale): Note[] {
  if (!SIGNATURE_SCALES.has(scale.scale.id)) return [];
  const altered = scale.tones.map((t) => t.note).filter((n) => n.accidental !== 0);
  const first = altered[0];
  if (!first) return [];
  if (!altered.every((n) => n.accidental === first.accidental && Math.abs(n.accidental) === 1)) {
    return [];
  }
  const order = first.accidental > 0 ? SHARP_ORDER : FLAT_ORDER;
  return order
    .filter((l) => altered.some((n) => n.letter === l))
    .map((l) => note(l, first.accidental));
}

/** Diatonic steps where the sharps of a key signature are written in the treble clef. */
const TREBLE_SHARPS: Record<Letter, number> = { F: 38, C: 35, G: 39, D: 36, A: 33, E: 37, B: 34 };
/** And the flats. */
const TREBLE_FLATS: Record<Letter, number> = { B: 34, E: 37, A: 33, D: 36, G: 32, C: 35, F: 31 };

/** Two octaves lower in the bass clef, except the last flat, F, which would fall below the staff. */
const BASS_SHIFT = 14;

/** The diatonic step where one accidental of a key signature is written in `clef`. */
export function signatureStep(clef: Clef, accidental: Note): number {
  const sharp = accidental.accidental > 0;
  const treble = (sharp ? TREBLE_SHARPS : TREBLE_FLATS)[accidental.letter];
  if (clef === "treble") return treble;
  return !sharp && accidental.letter === "F" ? treble - BASS_SHIFT + 7 : treble - BASS_SHIFT;
}

/** Columns for the accidentals of a chord, so that close ones do not overlap. */
export interface AccidentalColumn {
  readonly step: number;
  /** 0 is nearest the notehead. */
  readonly column: number;
}

/**
 * Give each accidental a column to the left of the chord. Working down from
 * the top, an accidental takes the first column whose last one is at least a
 * seventh (six steps) above it, so a stack of accidentals fans out leftwards.
 */
export function accidentalColumns(steps: readonly number[]): AccidentalColumn[] {
  const lastInColumn: number[] = [];
  return [...steps]
    .sort((a, b) => b - a)
    .map((step) => {
      let column = lastInColumn.findIndex((last) => last - step >= 6);
      if (column === -1) column = lastInColumn.length;
      lastInColumn[column] = step;
      return { step, column };
    });
}

/**
 * Which notes of a chord are drawn to the right of the stem line because the
 * note below them is a second away, so that the two noteheads do not overlap.
 * Returns the steps that move.
 */
export function displacedSteps(steps: readonly number[]): Set<number> {
  const moved = new Set<number>();
  const sorted = [...new Set(steps)].sort((a, b) => a - b);
  sorted.forEach((step, i) => {
    const below = sorted[i - 1];
    if (below !== undefined && step - below === 1 && !moved.has(below)) moved.add(step);
  });
  return moved;
}

/**
 * The key signature a progression in `t` is written with. Major, natural minor and the modes have
 * their own; any other tonality takes the signature of the major or minor key on its tonic with the
 * same third, so A harmonic minor is written in A minor with a sharp before each G.
 */
export function tonalitySignature(t: Tonality): Note[] {
  if (SIGNATURE_SCALES.has(t.scale)) return scaleSignature(spellScale(t.tonic, t.scale));
  return scaleSignature(spellScale(t.tonic, isMajorTonality(t.scale) ? "major" : "naturalMinor"));
}

/**
 * A progression on the staff, one chord to a bar. The key signature holds throughout, and an
 * accidental holds only to the bar line, so a note that goes against the signature is marked
 * again in each bar it comes back in.
 */
export function placeProgression(
  bars: readonly (readonly StaffTone[])[],
  signature: readonly Note[] = [],
): StaffNote[][] {
  return bars.map((tones) => placeOnStaff(tones, signature));
}

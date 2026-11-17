import { FIFTH_CENTS, OCTAVE_CENTS, type Temperament, foldIntoOctave } from "../theory/temperament";
import type { ScheduledNote } from "./playback";

/** Seconds between one fifth and the next. */
export const FIFTH_STEP = 0.5;
/** Seconds each fifth rings, a little over the step so that they run into each other. */
const FIFTH_RING = FIFTH_STEP * 1.5;
/** The last fifth has died away before the two tones sound together. */
const PAUSE_BEFORE_COMPARISON = FIFTH_RING;
/** How long the comparison rings, long enough to hear a slow beat. */
export const COMPARISON_LENGTH = 4;

/** At most this many tones sound at once: a ringing fifth and the next, or the comparison pair. */
export const FIFTH_CIRCLE_VOICES = 2;

/**
 * Twelve fifths stacked from `baseMidi`, then the start and the end together.
 *
 * Each fifth is folded back into the octave above the start so that the pitches stay in one
 * range, which does not change what they are: only whole octaves are left out. The notes have
 * fractional MIDI numbers because a pure fifth is 701.96 cents, not 700.
 *
 * After twelve pure fifths the end is 23.46 cents sharp of the start, so the last two tones,
 * which would be one note, beat against each other. In equal temperament the fifths are 700
 * cents, so the end is the start and the two tones are in unison.
 */
export function planFifthCircle(
  temperament: Temperament,
  baseMidi = 60,
  fifths = 12,
): ScheduledNote[] {
  const fifth = FIFTH_CENTS[temperament];
  const folded = (n: number) => foldIntoOctave(n * fifth) / 100;
  const notes: ScheduledNote[] = [];
  for (let n = 0; n <= fifths; n++) {
    notes.push({ midi: baseMidi + folded(n), start: n * FIFTH_STEP, duration: FIFTH_RING });
  }
  const comparison = fifths * FIFTH_STEP + PAUSE_BEFORE_COMPARISON;
  notes.push({ midi: baseMidi, start: comparison, duration: COMPARISON_LENGTH });
  notes.push({ midi: baseMidi + folded(fifths), start: comparison, duration: COMPARISON_LENGTH });
  return notes;
}

/**
 * How many times a second two tones `cents` apart beat against each other, when the lower one
 * sounds at `hz`: the difference of their frequencies.
 */
export function beatRate(hz: number, cents: number): number {
  return hz * (2 ** (cents / OCTAVE_CENTS) - 1);
}

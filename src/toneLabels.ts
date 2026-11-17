import { type HighlightTone, type Interval, formatNote } from "./theory";

/** What the keys and frets of an instrument say. */
export const TONE_DISPLAYS = ["names", "intervals", "steps", "none"] as const;
export type ToneDisplay = (typeof TONE_DISPLAYS)[number];

export const DEFAULT_TONE_DISPLAY: ToneDisplay = "names";

export const TONE_DISPLAY_LABELS: Readonly<Record<ToneDisplay, string>> = {
  names: "Names",
  intervals: "Intervals",
  steps: "Steps",
  none: "None",
};

export const isToneDisplay = (value: unknown): value is ToneDisplay =>
  (TONE_DISPLAYS as readonly unknown[]).includes(value);

/** Semitones of each letter step above the root in a major scale. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

const ACCIDENTALS: Readonly<Record<number, string>> = {
  [-3]: "♭𝄫",
  [-2]: "𝄫",
  [-1]: "♭",
  [0]: "",
  [1]: "♯",
  [2]: "𝄪",
};

/**
 * The name of an interval as a chord symbol writes it: 3, ♭3, 5, ♭5, ♯5, ♭7, 7,
 * ♭9, ♯11, ♭13. The number comes from the letter steps and the accidental from
 * how far the semitones are from the major scale, so a minor seventh is ♭7
 * and a diminished seventh is 𝄫7 (never ♯6).
 */
export function intervalLabel(interval: Interval): string {
  const reference = (MAJOR_SCALE[interval.steps % 7] ?? 0) + 12 * Math.floor(interval.steps / 7);
  const accidental = ACCIDENTALS[interval.semitones - reference] ?? "";
  return `${accidental}${interval.steps + 1}`;
}

/**
 * What to write on the key or fret of `tone`, or undefined for nothing.
 * Tones without an interval or step fall back to their name.
 */
export function toneLabel(display: ToneDisplay, tone: HighlightTone): string | undefined {
  switch (display) {
    case "none":
      return undefined;
    case "intervals":
      if (tone.isRoot) return "R";
      return tone.interval ? intervalLabel(tone.interval) : formatNote(tone.note);
    case "steps":
      return tone.step !== undefined ? String(tone.step) : formatNote(tone.note);
    case "names":
      return formatNote(tone.note);
  }
}

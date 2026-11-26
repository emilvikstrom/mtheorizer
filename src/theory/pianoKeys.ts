/**
 * Pressed piano keys as MIDI numbers, for "What chord is this?" and its link
 * (`#/identify?keys=60,64,67`).
 */

/** The lowest key of an 88-key piano (A0). */
export const PIANO_LOWEST = 21;
/** The highest key of an 88-key piano (C8). */
export const PIANO_HIGHEST = 108;
/** The most keys a link (and the finder) holds: two hands' worth, with room to spare. */
export const MAX_PRESSED_KEYS = 24;

const onPiano = (midi: number) =>
  Number.isInteger(midi) && midi >= PIANO_LOWEST && midi <= PIANO_HIGHEST;

/**
 * `midis` as a set of keys: on the piano, each once, lowest first, and at most
 * `MAX_PRESSED_KEYS` of them (the lowest ones).
 */
export function normalizeKeys(midis: readonly number[]): number[] {
  return [...new Set(midis.filter(onPiano))].sort((a, b) => a - b).slice(0, MAX_PRESSED_KEYS);
}

/** Press `midi`, or let go of it if it is pressed. A key past the limit, or off the piano, is ignored. */
export function toggleKey(keys: readonly number[], midi: number): number[] {
  if (keys.includes(midi)) return keys.filter((m) => m !== midi);
  if (!onPiano(midi) || keys.length >= MAX_PRESSED_KEYS) return normalizeKeys(keys);
  return normalizeKeys([...keys, midi]);
}

/** `60,64,67`. */
export function formatKeys(keys: readonly number[]): string {
  return normalizeKeys(keys).join(",");
}

/** Keys from link text. Anything that is not a key on the piano is dropped, so any text gives a valid set. */
export function parseKeys(text: string | null): number[] {
  if (!text) return [];
  return normalizeKeys(
    text
      .split(",")
      .filter((part) => /^\d{1,3}$/.test(part))
      .map(Number),
  );
}

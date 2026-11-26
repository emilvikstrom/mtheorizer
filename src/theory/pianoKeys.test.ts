import { describe, expect, it } from "vitest";
import {
  MAX_PRESSED_KEYS,
  PIANO_HIGHEST,
  PIANO_LOWEST,
  formatKeys,
  normalizeKeys,
  parseKeys,
  toggleKey,
} from "./pianoKeys";

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("piano keys in a link", () => {
  it("writes and reads a chord", () => {
    expect(formatKeys([67, 60, 64])).toBe("60,64,67");
    expect(parseKeys("60,64,67")).toEqual([60, 64, 67]);
  });

  it("round-trips every key of the piano", () => {
    for (const midi of range(PIANO_LOWEST, PIANO_HIGHEST)) {
      expect(parseKeys(formatKeys([midi]))).toEqual([midi]);
    }
  });

  it("round-trips sets of every size up to the limit", () => {
    for (let size = 1; size <= MAX_PRESSED_KEYS; size++) {
      // Spread over the whole keyboard, so both ends are covered.
      const keys = range(0, size - 1).map(
        (i) => PIANO_LOWEST + Math.round((i * (PIANO_HIGHEST - PIANO_LOWEST)) / MAX_PRESSED_KEYS),
      );
      expect(parseKeys(formatKeys(keys))).toEqual(keys);
    }
  });

  it("drops what is not a key on the piano", () => {
    expect(parseKeys(null)).toEqual([]);
    expect(parseKeys("")).toEqual([]);
    expect(parseKeys("20,21,108,109,1000,-3,6x,60.5,,abc")).toEqual([21, 108]);
  });

  it("keeps each key once, lowest first", () => {
    expect(parseKeys("67,60,67,64,60")).toEqual([60, 64, 67]);
  });

  it("keeps at most the limit, the lowest keys", () => {
    const many = range(40, 40 + MAX_PRESSED_KEYS + 5);
    expect(parseKeys(many.join(","))).toEqual(range(40, 40 + MAX_PRESSED_KEYS - 1));
    expect(normalizeKeys(many)).toHaveLength(MAX_PRESSED_KEYS);
  });
});

describe("toggleKey", () => {
  it("presses and lets go", () => {
    expect(toggleKey([], 64)).toEqual([64]);
    expect(toggleKey([64], 60)).toEqual([60, 64]);
    expect(toggleKey([60, 64], 60)).toEqual([64]);
  });

  it("ignores a key off the piano or past the limit", () => {
    expect(toggleKey([60], 120)).toEqual([60]);
    const full = range(40, 40 + MAX_PRESSED_KEYS - 1);
    expect(toggleKey(full, 90)).toEqual(full);
    // Letting go still works when full.
    expect(toggleKey(full, 40)).toEqual(range(41, 40 + MAX_PRESSED_KEYS - 1));
  });
});

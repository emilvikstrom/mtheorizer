import { describe, expect, it } from "vitest";
import { PYTHAGOREAN_COMMA_CENTS } from "../theory/temperament";
import {
  COMPARISON_LENGTH,
  FIFTH_CIRCLE_VOICES,
  FIFTH_STEP,
  beatRate,
  planFifthCircle,
} from "./fifthCircle";
import { midiToFrequency } from "./playback";

const cents = (a: number, b: number) => (a - b) * 100;

describe("planFifthCircle", () => {
  const pure = planFifthCircle("pure");
  const equal = planFifthCircle("equal");

  it("plays thirteen notes, one fifth after the other, and then two together", () => {
    expect(pure).toHaveLength(15);
    expect(equal).toHaveLength(15);
    const starts = pure.map((n) => n.start);
    expect(starts.slice(0, 13)).toEqual(Array.from({ length: 13 }, (_, i) => i * FIFTH_STEP));
    expect(starts[13]).toBe(starts[14]);
    expect(starts[13] ?? 0).toBeGreaterThan(12 * FIFTH_STEP);
  });

  it("never has more than the voices it asks the player to leave room for", () => {
    for (const plan of [pure, equal]) {
      for (const n of plan) {
        const sounding = plan.filter((m) => m.start <= n.start && n.start < m.start + m.duration);
        expect(sounding.length).toBeLessThanOrEqual(FIFTH_CIRCLE_VOICES);
      }
    }
  });

  it("starts on the base note and keeps every fifth in the octave above it", () => {
    expect(pure[0]?.midi).toBe(60);
    for (const plan of [pure, equal]) {
      for (const n of plan) {
        expect(n.midi).toBeGreaterThanOrEqual(60);
        expect(n.midi).toBeLessThan(72);
      }
    }
  });

  it("follows the circle of fifths in equal temperament, in whole semitones", () => {
    // C G D A E B F♯ C♯ G♯ D♯ A♯ E♯ B♯ folded into the octave above C4.
    expect(equal.slice(0, 13).map((n) => n.midi)).toEqual([
      60, 67, 62, 69, 64, 71, 66, 61, 68, 63, 70, 65, 60,
    ]);
  });

  it("steps by a pure fifth, 701.955 cents, before folding", () => {
    expect(cents(pure[1]?.midi ?? 0, 60)).toBeCloseTo(701.955, 3);
    // G to D is a pure fifth up, folded: 1403.91 − 1200 = 203.91 cents above C.
    expect(cents(pure[2]?.midi ?? 0, 60)).toBeCloseTo(203.91, 2);
  });

  it("ends 23.46 cents above the start after twelve pure fifths", () => {
    expect(cents(pure[12]?.midi ?? 0, 60)).toBeCloseTo(PYTHAGOREAN_COMMA_CENTS, 9);
  });

  it("closes the circle in equal temperament", () => {
    expect(equal[12]?.midi).toBe(60);
  });

  it("compares the start with the end: apart by the comma when pure, in unison when equal", () => {
    const [start, end] = [pure[13], pure[14]];
    expect(start?.midi).toBe(60);
    expect(cents(end?.midi ?? 0, start?.midi ?? 0)).toBeCloseTo(PYTHAGOREAN_COMMA_CENTS, 9);
    expect(start?.duration).toBe(COMPARISON_LENGTH);
    expect(equal[14]?.midi).toBe(equal[13]?.midi);
  });

  it("starts from another note", () => {
    const plan = planFifthCircle("equal", 48);
    expect(plan[0]?.midi).toBe(48);
    expect(plan[1]?.midi).toBe(55);
    expect(plan[12]?.midi).toBe(48);
  });

  it("can stack fewer fifths", () => {
    const plan = planFifthCircle("pure", 60, 4);
    expect(plan).toHaveLength(7);
    expect(cents(plan[4]?.midi ?? 0, 60)).toBeCloseTo(407.82, 2);
  });
});

describe("beatRate", () => {
  it("is zero when the tones are the same", () => {
    expect(beatRate(261.63, 0)).toBe(0);
  });

  it("is the difference in frequency", () => {
    const low = midiToFrequency(60);
    const high = midiToFrequency(60 + PYTHAGOREAN_COMMA_CENTS / 100);
    expect(beatRate(low, PYTHAGOREAN_COMMA_CENTS)).toBeCloseTo(high - low, 9);
  });

  it.each([
    [261.626, 3.58],
    [440, 6.02],
  ])("beats about %d times a second for the comma at %d Hz", (hz, rate) => {
    expect(beatRate(hz, PYTHAGOREAN_COMMA_CENTS)).toBeCloseTo(rate, 1);
  });
});

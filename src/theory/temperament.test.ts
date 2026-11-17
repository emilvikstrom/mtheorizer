import { describe, expect, it } from "vitest";
import {
  EQUAL_FIFTH_CENTS,
  OCTAVE_CENTS,
  PURE_FIFTH_CENTS,
  PURE_FIFTH_RATIO,
  PYTHAGOREAN_COMMA_CENTS,
  PYTHAGOREAN_COMMA_RATIO,
  centsToRatio,
  fifthChain,
  foldIntoOctave,
  frequencyAbove,
  ratioToCents,
  stackedCents,
} from "./temperament";

describe("cents and ratios", () => {
  it.each([
    [1, 0],
    [2, 1200],
    [0.5, -1200],
    [3 / 2, 701.955],
    [5 / 4, 386.314],
    [4 / 3, 498.045],
    [2 ** (1 / 12), 100],
  ])("ratio %d is %d cents", (ratio, cents) => {
    expect(ratioToCents(ratio)).toBeCloseTo(cents, 3);
  });

  it.each([0, 100, 386.314, 701.955, 1200, -700])("cents %d round-trips through a ratio", (c) => {
    expect(ratioToCents(centsToRatio(c))).toBeCloseTo(c, 9);
  });

  it("finds the frequency a number of cents above another", () => {
    expect(frequencyAbove(440, 0)).toBe(440);
    expect(frequencyAbove(440, 1200)).toBeCloseTo(880, 9);
    expect(frequencyAbove(440, 700)).toBeCloseTo(659.255, 3);
    expect(frequencyAbove(440, PURE_FIFTH_CENTS)).toBeCloseTo(660, 9);
  });

  it("folds cents into one octave", () => {
    expect(foldIntoOctave(0)).toBe(0);
    expect(foldIntoOctave(1200)).toBe(0);
    expect(foldIntoOctave(8400)).toBe(0);
    expect(foldIntoOctave(1300)).toBe(100);
    expect(foldIntoOctave(-100)).toBe(1100);
  });
});

describe("the fifth and the comma", () => {
  it("has a pure fifth of about 701.96 cents against 700 for the equal-tempered one", () => {
    expect(PURE_FIFTH_RATIO).toBe(1.5);
    expect(PURE_FIFTH_CENTS).toBeCloseTo(701.955, 3);
    expect(EQUAL_FIFTH_CENTS).toBe(700);
    expect(PURE_FIFTH_CENTS - EQUAL_FIFTH_CENTS).toBeCloseTo(1.955, 3);
  });

  it("has a Pythagorean comma of 531441/524288, about 23.46 cents", () => {
    expect(PYTHAGOREAN_COMMA_RATIO).toBeCloseTo(531441 / 524288, 12);
    expect(PYTHAGOREAN_COMMA_CENTS).toBeCloseTo(23.46, 2);
  });

  it("is what twelve pure fifths overshoot seven octaves by", () => {
    expect(stackedCents(12, "pure") - 7 * OCTAVE_CENTS).toBeCloseTo(PYTHAGOREAN_COMMA_CENTS, 9);
    expect(centsToRatio(stackedCents(12, "pure"))).toBeCloseTo(PURE_FIFTH_RATIO ** 12, 6);
    expect(PURE_FIFTH_RATIO ** 12 / 2 ** 7).toBeCloseTo(PYTHAGOREAN_COMMA_RATIO, 9);
  });

  it("makes twelve equal-tempered fifths exactly seven octaves", () => {
    expect(stackedCents(12, "equal")).toBe(7 * OCTAVE_CENTS);
  });
});

describe("the chain of fifths", () => {
  const chain = fifthChain();

  it("goes C G D A E B F♯ C♯ G♯ D♯ A♯ E♯ B♯", () => {
    expect(chain.map((s) => s.label)).toEqual([
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "F♯",
      "C♯",
      "G♯",
      "D♯",
      "A♯",
      "E♯",
      "B♯",
    ]);
    expect(chain.map((s) => s.count)).toEqual(Array.from({ length: 13 }, (_, i) => i));
  });

  it.each([
    [0, 0, 0],
    [1, 701.955, 700],
    [2, 203.91, 200],
    [3, 905.865, 900],
    [4, 407.82, 400],
    [5, 1109.775, 1100],
    [6, 611.73, 600],
    [7, 113.685, 100],
    [8, 815.64, 800],
    [9, 317.595, 300],
    [10, 1019.55, 1000],
    [11, 521.505, 500],
    [12, 23.46, 0],
  ])("step %i is %d cents above the start in pure tuning and %d in equal", (n, pure, equal) => {
    const step = chain[n];
    expect(step?.pureCents).toBeCloseTo(pure, 2);
    expect(step?.equalCents).toBe(equal);
  });

  it("drifts by 1.955 cents per fifth and ends 23.46 cents sharp of the start", () => {
    for (const step of chain) expect(step.drift).toBeCloseTo(step.count * 1.955, 2);
    const last = chain[12];
    expect(last?.drift).toBeCloseTo(PYTHAGOREAN_COMMA_CENTS, 9);
    expect(last?.pureCents).toBeCloseTo(PYTHAGOREAN_COMMA_CENTS, 9);
    expect(last?.equalCents).toBe(0);
  });

  it("keeps spelling the notes by fifths from any start", () => {
    const fromB = fifthChain(3, { letter: "B", accidental: -1 });
    expect(fromB.map((s) => s.label)).toEqual(["B♭", "F", "C", "G"]);
  });
});

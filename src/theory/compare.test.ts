import { describe, expect, it } from "vitest";
import { chordFromSpec } from "./chordNaming";
import { specOf } from "./chordSpec";
import { buildChord, chordOnPitchClass } from "./chords";
import { compareChords, formatCommonTone } from "./compare";
import { formatNote, note, pitchClass } from "./notes";

const common = (a: ReturnType<typeof buildChord>, b: ReturnType<typeof buildChord>) =>
  compareChords(a, b).common.map(formatCommonTone);

describe("compareChords on all 12 roots", () => {
  for (let pc = 0; pc < 12; pc++) {
    const major = chordOnPitchClass(pc, "major");
    const minor = chordOnPitchClass(pc, "minor");

    it(`${major.symbol} against ${minor.symbol} shares the root and the fifth`, () => {
      const result = compareChords(major, minor);
      expect(result.common.map((t) => t.pitchClass)).toEqual([pc, (pc + 7) % 12]);
      // D♭ major and C♯ minor spell their fifth differently (A♭, G♯), and say so.
      for (const tone of result.common) {
        expect(tone.sameSpelling).toBe(formatNote(tone.first) === formatNote(tone.second));
      }
    });

    it(`${major.symbol} against the major a fifth up shares one tone`, () => {
      const result = compareChords(major, chordOnPitchClass((pc + 7) % 12, "major"));
      expect(result.common.map((t) => t.pitchClass)).toEqual([(pc + 7) % 12]);
    });

    it(`${major.symbol} against its relative minor shares two tones`, () => {
      expect(compareChords(major, chordOnPitchClass((pc + 9) % 12, "minor")).common).toHaveLength(
        2,
      );
    });

    it(`${major.symbol} against itself shares every tone`, () => {
      const result = compareChords(major, major);
      expect(result.common).toHaveLength(3);
      expect(result.sharedPitchClasses.size).toBe(3);
    });
  }
});

describe("compareChords", () => {
  it("C and Am share C and E", () => {
    expect(common(buildChord(note("C"), "major"), buildChord(note("A"), "minor"))).toEqual([
      "C",
      "E",
    ]);
  });

  it("C and F share only C", () => {
    expect(common(buildChord(note("C"), "major"), buildChord(note("F"), "major"))).toEqual(["C"]);
  });

  it("finds nothing in common between C and D♭ major", () => {
    const result = compareChords(
      buildChord(note("C"), "major"),
      buildChord(note("D", -1), "major"),
    );
    expect(result.common).toEqual([]);
    expect(result.sharedPitchClasses.size).toBe(0);
  });

  it("tells E♭ and D♯ apart but treats them as the same key", () => {
    // Cm has E♭; B major (B–D♯–F♯) has D♯.
    const result = compareChords(buildChord(note("C"), "minor"), buildChord(note("B"), "major"));
    const tone = result.common.find((t) => t.pitchClass === 3);
    expect(tone?.sameSpelling).toBe(false);
    expect(tone?.first).toEqual(note("E", -1));
    expect(tone?.second).toEqual(note("D", 1));
    expect(tone && formatCommonTone(tone)).toBe("E♭ / D♯");
  });

  it("names a shared tone once when both chords spell it alike", () => {
    const result = compareChords(
      buildChord(note("E", -1), "major"),
      buildChord(note("C"), "minor"),
    );
    expect(result.common.map(formatCommonTone)).toEqual(["E♭", "G"]);
  });

  it("works with built chords such as Cmaj7 against Em7", () => {
    const first = chordFromSpec(note("C"), { base: "major", qualities: ["maj7"] });
    const second = chordFromSpec(note("E"), { base: "minor", qualities: ["7"] });
    expect(compareChords(first, second).common.map((t) => pitchClass(t.first))).toEqual([4, 7, 11]);
  });

  it("keeps the order of the first chord", () => {
    const first = chordFromSpec(note("G"), specOf("dominant7"));
    const second = chordFromSpec(note("B"), specOf("diminished"));
    expect(compareChords(first, second).common.map(formatCommonTone)).toEqual(["B", "D", "F"]);
  });
});

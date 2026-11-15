import { describe, expect, it } from "vitest";
import {
  type Note,
  commonSpellings,
  formatNote,
  formatNoteAscii,
  letterAt,
  mod12,
  note,
  parseNote,
  pitchClass,
  pitchClassLabel,
  spellingsOf,
} from "./notes";

const names = (notes: Note[]) => notes.map(formatNoteAscii);

describe("notes", () => {
  it("mod12 wraps negative numbers", () => {
    expect(mod12(-1)).toBe(11);
    expect(mod12(12)).toBe(0);
    expect(mod12(25)).toBe(1);
  });

  it("derives pitch classes from spelling", () => {
    expect(pitchClass(parseNote("C"))).toBe(0);
    expect(pitchClass(parseNote("C#"))).toBe(1);
    expect(pitchClass(parseNote("Db"))).toBe(1);
    expect(pitchClass(parseNote("B#"))).toBe(0);
    expect(pitchClass(parseNote("Cb"))).toBe(11);
    expect(pitchClass(parseNote("Fbb"))).toBe(3);
    expect(pitchClass(parseNote("B"))).toBe(11);
  });

  it("parses ASCII and Unicode names", () => {
    expect(parseNote("Eb")).toEqual(note("E", -1));
    expect(parseNote("E♭")).toEqual(note("E", -1));
    expect(parseNote("f#")).toEqual(note("F", 1));
    expect(parseNote("F♯♯")).toEqual(note("F", 2));
    expect(() => parseNote("H")).toThrow();
    expect(() => parseNote("C#b")).toThrow();
  });

  it("formats with music symbols and ASCII", () => {
    expect(formatNote(note("E", -1))).toBe("E♭");
    expect(formatNote(note("F", 1))).toBe("F♯");
    expect(formatNote(note("F", 2))).toBe("F𝄪");
    expect(formatNote(note("B", -2))).toBe("B𝄫");
    expect(formatNote(note("C"))).toBe("C");
    expect(formatNoteAscii(note("B", -2))).toBe("Bbb");
    expect(formatNoteAscii(note("C", 1))).toBe("C#");
  });

  it("moves letters around the octave", () => {
    expect(letterAt("A", 2)).toBe("C");
    expect(letterAt("B", 1)).toBe("C");
    expect(letterAt("C", -1)).toBe("B");
  });

  it("lists spellings with at most one accidental", () => {
    expect(names(spellingsOf(1))).toEqual(["C#", "Db"]);
    expect(names(spellingsOf(0))).toEqual(["C", "B#"]);
    expect(names(spellingsOf(4))).toEqual(["E", "Fb"]);
  });

  it("labels the 12 pitch classes the everyday way", () => {
    const labels = Array.from({ length: 12 }, (_, pc) => pitchClassLabel(pc));
    expect(labels).toEqual([
      "C",
      "C♯/D♭",
      "D",
      "D♯/E♭",
      "E",
      "F",
      "F♯/G♭",
      "G",
      "G♯/A♭",
      "A",
      "A♯/B♭",
      "B",
    ]);
    expect(names(commonSpellings(5))).toEqual(["F"]);
  });
});

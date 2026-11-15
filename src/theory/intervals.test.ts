import { describe, expect, it } from "vitest";
import {
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_THIRD,
  MINOR_THIRD,
  PERFECT_FIFTH,
  PERFECT_UNISON,
  transpose,
} from "./intervals";
import { formatNoteAscii, parseNote } from "./notes";

const up = (from: string, by: Parameters<typeof transpose>[1]) =>
  formatNoteAscii(transpose(parseNote(from), by));

describe("transpose", () => {
  it("keeps the unison", () => {
    expect(up("Eb", PERFECT_UNISON)).toBe("Eb");
  });

  it("spells thirds by letter, not by key", () => {
    expect(up("C", MAJOR_THIRD)).toBe("E");
    expect(up("Eb", MAJOR_THIRD)).toBe("G");
    expect(up("C#", MAJOR_THIRD)).toBe("E#");
    expect(up("Db", MINOR_THIRD)).toBe("Fb");
    expect(up("B", MINOR_THIRD)).toBe("D");
  });

  it("wraps around the octave", () => {
    expect(up("A", PERFECT_FIFTH)).toBe("E");
    expect(up("B", PERFECT_FIFTH)).toBe("F#");
    expect(up("Bb", PERFECT_FIFTH)).toBe("F");
    expect(up("C", MAJOR_SEVENTH)).toBe("B");
  });

  it("produces double accidentals when the theory calls for them", () => {
    expect(up("G#", MAJOR_THIRD)).toBe("B#");
    expect(up("B#", MAJOR_SECOND)).toBe("C##");
    expect(up("Fb", MINOR_THIRD)).toBe("Abb");
  });
});

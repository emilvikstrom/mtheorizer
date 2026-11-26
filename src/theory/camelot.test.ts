import { describe, expect, it } from "vitest";
import {
  camelotAt,
  camelotCode,
  camelotCompatible,
  compatibleKeys,
  keyForCamelot,
  keysForCamelot,
} from "./camelot";
import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  formatKey,
  key,
  keysAt,
  relativeKey,
} from "./keys";
import { parseNote } from "./notes";

const k = (name: string, mode: KeyMode): Key => key(parseNote(name), mode);

/** The standard Camelot table, with the enharmonic spellings the circle uses. */
const MAJORS: [string, string][] = [
  ["B", "1B"],
  ["C♭", "1B"],
  ["F♯", "2B"],
  ["G♭", "2B"],
  ["D♭", "3B"],
  ["C♯", "3B"],
  ["A♭", "4B"],
  ["E♭", "5B"],
  ["B♭", "6B"],
  ["F", "7B"],
  ["C", "8B"],
  ["G", "9B"],
  ["D", "10B"],
  ["A", "11B"],
  ["E", "12B"],
];
const MINORS: [string, string][] = [
  ["G♯", "1A"],
  ["A♭", "1A"],
  ["D♯", "2A"],
  ["E♭", "2A"],
  ["B♭", "3A"],
  ["A♯", "3A"],
  ["F", "4A"],
  ["C", "5A"],
  ["G", "6A"],
  ["D", "7A"],
  ["A", "8A"],
  ["E", "9A"],
  ["B", "10A"],
  ["F♯", "11A"],
  ["C♯", "12A"],
];

function allKeys(): Key[] {
  const all: Key[] = [];
  for (let position = 0; position < 12; position++) {
    for (const mode of ["major", "minor"] as const) all.push(...keysAt(position, mode));
  }
  return all;
}

describe("camelotCode", () => {
  it.each(MAJORS)("%s major is %s", (tonic, label) => {
    expect(camelotCode(k(tonic, "major")).label).toBe(label);
  });

  it.each(MINORS)("%s minor is %s", (tonic, label) => {
    expect(camelotCode(k(tonic, "minor")).label).toBe(label);
  });

  it("numbers C major 8B and A minor 8A", () => {
    expect(camelotCode(k("C", "major"))).toEqual({ number: 8, letter: "B", label: "8B" });
    expect(camelotCode(k("A", "minor"))).toEqual({ number: 8, letter: "A", label: "8A" });
  });

  it("gives a key and its relative key the same number and the other letter", () => {
    for (const spellings of CIRCLE_OF_FIFTHS) {
      for (const tonic of spellings) {
        const major = key(tonic, "major");
        const minor = relativeKey(major);
        expect(camelotCode(minor).number).toBe(camelotCode(major).number);
        expect(camelotCode(major).letter).toBe("B");
        expect(camelotCode(minor).letter).toBe("A");
      }
    }
  });

  it("numbers the 12 circle positions 1 to 12 once each, per mode", () => {
    for (const mode of ["major", "minor"] as const) {
      const numbers = Array.from({ length: 12 }, (_, p) => camelotAt(p, mode).number).sort(
        (a, b) => a - b,
      );
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it("goes one number up for each fifth up, and wraps", () => {
    expect(camelotAt(1, "major").label).toBe("9B");
    expect(camelotAt(11, "major").label).toBe("7B");
    expect(camelotAt(5, "major").label).toBe("1B");
    expect(camelotAt(6, "minor").label).toBe("2A");
    expect(camelotAt(-1, "major").label).toBe("7B");
    expect(camelotAt(13, "minor").label).toBe("9A");
  });
});

describe("keysForCamelot", () => {
  it("finds every spelling in the table", () => {
    for (const [tonic, label] of MAJORS) {
      expect(keysForCamelot(label).map(formatKey)).toContain(formatKey(k(tonic, "major")));
    }
    for (const [tonic, label] of MINORS) {
      expect(keysForCamelot(label).map(formatKey)).toContain(formatKey(k(tonic, "minor")));
    }
  });

  it("lists enharmonic spellings together, most common first", () => {
    expect(keysForCamelot("8B").map(formatKey)).toEqual(["C major"]);
    expect(keysForCamelot("8A").map(formatKey)).toEqual(["A minor"]);
    expect(keysForCamelot("2B").map(formatKey)).toEqual(["F♯ major", "G♭ major"]);
    expect(keysForCamelot("2A").map(formatKey)).toEqual(["D♯ minor", "E♭ minor"]);
  });

  it("accepts lower case and surrounding spaces, and rejects nonsense", () => {
    expect(keysForCamelot(" 8b ").map(formatKey)).toEqual(["C major"]);
    for (const bad of ["", "0A", "13B", "8C", "B8", "8"]) expect(keysForCamelot(bad)).toEqual([]);
  });

  it("round-trips all 24 positions", () => {
    for (let position = 0; position < 12; position++) {
      for (const mode of ["major", "minor"] as const) {
        const code = camelotAt(position, mode);
        for (const found of keysForCamelot(code.label)) {
          expect(camelotCode(found).label).toBe(code.label);
        }
        expect(keysForCamelot(code.label).map(formatKey)).toEqual(
          keysAt(position, mode).map(formatKey),
        );
      }
    }
  });
});

describe("compatibleKeys", () => {
  it("gives 8B (C major): 8B, 8A, 9B and 7B", () => {
    const found = compatibleKeys(k("C", "major"));
    expect(found.map(({ relation, code }) => [relation, code.label])).toEqual([
      ["same", "8B"],
      ["relative", "8A"],
      ["up a fifth", "9B"],
      ["down a fifth", "7B"],
    ]);
    expect(found.map(({ keys }) => keys.map(formatKey))).toEqual([
      ["C major"],
      ["A minor"],
      ["G major"],
      ["F major"],
    ]);
  });

  it("gives 8A (A minor): 8A, 8B, 9A and 7A", () => {
    expect(compatibleKeys(k("A", "minor")).map(({ code }) => code.label)).toEqual([
      "8A",
      "8B",
      "9A",
      "7A",
    ]);
  });

  it("wraps around the wheel: 12B neighbours 1B, 1A neighbours 12A", () => {
    expect(compatibleKeys(k("E", "major")).map(({ code }) => code.label)).toEqual([
      "12B",
      "12A",
      "1B",
      "11B",
    ]);
    expect(compatibleKeys(k("G♯", "minor")).map(({ code }) => code.label)).toEqual([
      "1A",
      "1B",
      "2A",
      "12A",
    ]);
  });

  it("gives four distinct, symmetric neighbours for every key in every spelling", () => {
    for (const a of allKeys()) {
      const neighbours = compatibleKeys(a);
      expect(neighbours).toHaveLength(4);
      expect(new Set(neighbours.map(({ code }) => code.label)).size).toBe(4);
      for (const { keys } of neighbours) {
        for (const b of keys) expect(camelotCompatible(b, a)).toBe(true);
      }
    }
  });

  it("does not count other keys as compatible", () => {
    expect(camelotCompatible(k("C", "major"), k("D", "major"))).toBe(false);
    expect(camelotCompatible(k("C", "major"), k("C", "minor"))).toBe(false);
    expect(camelotCompatible(k("C", "major"), k("F♯", "major"))).toBe(false);
  });
});

describe("keyForCamelot", () => {
  it("jumps to the key of every code in the table", () => {
    for (const [, label] of [...MAJORS, ...MINORS]) {
      const found = keyForCamelot(label);
      expect(found && camelotCode(found).label).toBe(label);
    }
    expect(keyForCamelot("8B") && formatKey(keyForCamelot("8B")!)).toBe("C major");
    expect(keyForCamelot("8a") && formatKey(keyForCamelot("8a")!)).toBe("A minor");
  });

  it("round-trips all 24 keys, in every spelling the circle offers", () => {
    for (let position = 0; position < CIRCLE_OF_FIFTHS.length; position++) {
      for (const mode of ["major", "minor"] as const) {
        for (const spelled of keysAt(position, mode)) {
          const code = camelotCode(spelled).label;
          // From anywhere else, the most common spelling …
          expect(formatKey(keyForCamelot(code)!)).toBe(formatKey(keysAt(position, mode)[0]!));
          // … and from the key itself, that very spelling.
          expect(formatKey(keyForCamelot(code, spelled)!)).toBe(formatKey(spelled));
        }
      }
    }
  });

  it("keeps the current spelling only when it has the code", () => {
    const gFlat = k("G♭", "major");
    expect(formatKey(keyForCamelot("2B", gFlat)!)).toBe("G♭ major");
    expect(formatKey(keyForCamelot("3B", gFlat)!)).toBe("D♭ major");
    expect(formatKey(keyForCamelot("2A", gFlat)!)).toBe("D♯ minor");
  });

  it("gives nothing for text that is no code", () => {
    for (const bad of ["", "0A", "13B", "8C", "B8", "8", "C major"]) {
      expect(keyForCamelot(bad)).toBeUndefined();
    }
  });
});

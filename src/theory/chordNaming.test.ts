import { describe, expect, it } from "vitest";
import { chordNameFor, chordSymbolFor, chordSymbolSuffix, identifyQuality } from "./chordNaming";
import {
  CHORD_BASES,
  type ChordBase,
  type ChordModifier,
  type ChordSpec,
  availableQualities,
  specOf,
  withQuality,
} from "./chordSpec";
import { CHORD_QUALITIES, CHORD_QUALITY_IDS, buildChord, chordSymbol } from "./chords";
import { formatNote, note, parseNote } from "./notes";

const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].map(parseNote);
const C = note("C", 0);

const spec = (base: ChordBase, ...qualities: ChordModifier[]): ChordSpec => ({ base, qualities });

/** Every spec reachable from a base chord by adding available modifiers one at a time. */
function reachableSpecs(): ChordSpec[] {
  const seen = new Map<string, ChordSpec>();
  const queue: ChordSpec[] = CHORD_BASES.map((base) => spec(base));
  for (let next = queue.pop(); next; next = queue.pop()) {
    const key = `${next.base}:${next.qualities.join(",")}`;
    if (seen.has(key)) continue;
    seen.set(key, next);
    for (const m of availableQualities(next)) queue.push(withQuality(next, m));
  }
  return [...seen.values()];
}

describe("named chords go through the spec with their current symbol and name", () => {
  it.each(CHORD_QUALITY_IDS)("%s", (id) => {
    for (const root of ROOTS) {
      expect(chordSymbolFor(root, specOf(id))).toBe(chordSymbol(root, id));
      expect(`${formatNote(root)} ${chordNameFor(specOf(id))}`).toBe(buildChord(root, id).name);
    }
    expect(chordNameFor(specOf(id))).toBe(CHORD_QUALITIES[id].name);
    expect(chordSymbolSuffix(specOf(id))).toBe(CHORD_QUALITIES[id].symbol);
  });
});

describe("identifyQuality", () => {
  it.each(CHORD_QUALITY_IDS)("finds %s from its spec", (id) => {
    expect(identifyQuality(specOf(id))).toBe(id);
  });

  it("normalizes before looking up", () => {
    expect(identifyQuality(spec("minor", "flat5"))).toBe("minor");
    expect(identifyQuality(spec("major", "7", "9", "11"))).toBe("dominant11");
  });

  it("gives nothing for free combinations", () => {
    expect(identifyQuality(spec("major", "7", "flat5", "flat9"))).toBeUndefined();
    expect(identifyQuality(spec("minor", "7", "13", "flat9"))).toBeUndefined();
    expect(identifyQuality(spec("diminished", "dim7", "9"))).toBeUndefined();
  });

  it("finds a named type for exactly the named specs among the reachable ones", () => {
    const named = reachableSpecs().filter((s) => identifyQuality(s) !== undefined);
    expect(named).toHaveLength(CHORD_QUALITY_IDS.length);
  });
});

describe("naming rules", () => {
  // [description, spec, symbol on C, name]
  const cases: [string, ChordSpec, string, string][] = [
    ["flat five on a triad is parenthesized", spec("major", "flat5"), "C(♭5)", "major flat five"],
    ["sixth with flat five", spec("major", "6", "flat5"), "C6♭5", "major sixth flat five"],
    ["six-nine", spec("major", "6", "9"), "C6/9", "six-nine"],
    [
      "free alterations on a seventh",
      spec("major", "7", "flat5", "flat9"),
      "C7♭5♭9",
      "dominant seventh flat five flat nine",
    ],
    [
      "sharp nine and flat thirteen",
      spec("major", "7", "sharp9", "flat13"),
      "C7♯9♭13",
      "dominant seventh sharp nine flat thirteen",
    ],
    [
      "alterations after an extension are parenthesized",
      spec("major", "7", "13", "flat9"),
      "C13(♭9)",
      "dominant thirteenth flat nine",
    ],
    [
      "flat five after a ninth",
      spec("major", "7", "9", "flat5"),
      "C9(♭5)",
      "dominant ninth flat five",
    ],
    [
      "sharp eleven on a thirteenth",
      spec("major", "7", "13", "sharp11"),
      "C13(♯11)",
      "dominant thirteenth sharp eleven",
    ],
    ["minor thirteenth", spec("minor", "7", "13"), "Cm13", "minor thirteenth"],
    [
      "minor with flat thirteen",
      spec("minor", "7", "flat13"),
      "Cm7♭13",
      "minor seventh flat thirteen",
    ],
    ["minor major eleventh", spec("minor", "maj7", "11"), "Cm(maj11)", "minor major eleventh"],
    ["major thirteenth", spec("major", "maj7", "13"), "Cmaj13", "major thirteenth"],
    ["half-diminished ninth", spec("diminished", "7", "9"), "Cm9(♭5)", "half-diminished ninth"],
    ["diminished ninth", spec("diminished", "dim7", "9"), "C°9", "diminished ninth"],
    ["diminished eleventh", spec("diminished", "dim7", "11"), "C°11", "diminished eleventh"],
    ["augmented ninth", spec("augmented", "7", "9"), "C9(♯5)", "dominant ninth sharp five"],
    [
      "augmented with flat nine",
      spec("augmented", "7", "flat9"),
      "C7♯5♭9",
      "dominant seventh sharp five flat nine",
    ],
    [
      "augmented major ninth",
      spec("augmented", "maj7", "9"),
      "Cmaj9(♯5)",
      "major ninth sharp five",
    ],
    [
      "suspended second with a seventh",
      spec("sus2", "7"),
      "C7sus2",
      "dominant seventh suspended second",
    ],
    [
      "suspended fourth with major seventh",
      spec("sus4", "maj7"),
      "Cmaj7sus4",
      "major seventh suspended fourth",
    ],
    [
      "suspended fourth with flat nine",
      spec("sus4", "7", "flat9"),
      "C7sus4♭9",
      "dominant seventh suspended fourth flat nine",
    ],
    [
      "suspended fourth with an added ninth",
      spec("sus4", "add9"),
      "Csus4(add9)",
      "suspended fourth added ninth",
    ],
    ["added tone on a minor chord", spec("minor", "add2"), "Cm(add2)", "minor added second"],
    [
      "added tone with flat five",
      spec("major", "flat5", "add9"),
      "C(♭5,add9)",
      "major flat five added ninth",
    ],
    ["power chord", spec("power"), "C5", "power chord"],
  ];

  it.each(cases)("%s", (_description, s, symbol, name) => {
    expect(chordSymbolFor(C, s)).toBe(symbol);
    expect(chordNameFor(s)).toBe(name);
  });

  it("names a spec the same as its normalized form", () => {
    expect(chordSymbolFor(C, spec("minor", "flat5", "9"))).toBe("Cm");
    expect(chordSymbolFor(C, spec("major", "7", "9"))).toBe("C9");
    expect(chordNameFor(spec("major", "7", "9", "11"))).toBe("dominant eleventh");
  });

  it("spells the root with its accidentals", () => {
    expect(chordSymbolFor(note("E", -1), spec("minor", "7"))).toBe("E♭m7");
    expect(chordSymbolFor(note("F", 1), spec("major", "7", "sharp9"))).toBe("F♯7♯9");
  });
});

describe("every spec the builder allows", () => {
  const all = reachableSpecs();

  it("has a symbol and a name", () => {
    expect(all.length).toBeGreaterThan(CHORD_QUALITY_IDS.length);
    for (const s of all) {
      expect(chordNameFor(s)).toMatch(/^[a-z][a-z -]*[a-z]$/);
      for (const root of ROOTS) {
        expect(chordSymbolFor(root, s).startsWith(formatNote(root))).toBe(true);
      }
    }
  });

  it("has a symbol and a name no other spec has", () => {
    const symbols = new Map<string, string>();
    const names = new Map<string, string>();
    for (const s of all) {
      const key = `${s.base}:${s.qualities.join(",")}`;
      const symbol = chordSymbolSuffix(s);
      const name = chordNameFor(s);
      expect(symbols.get(symbol), `symbol ${symbol} of ${key}`).toBeUndefined();
      expect(names.get(name), `name ${name} of ${key}`).toBeUndefined();
      symbols.set(symbol, key);
      names.set(name, key);
    }
  });
});

import { describe, expect, it } from "vitest";
import { chordSymbolFor, identifyQuality } from "./chordNaming";
import { PARSEABLE_SPECS, parseChordSymbol } from "./chordParse";
import { normalizeSpec, specOf } from "./chordSpec";
import { CHORD_QUALITY_IDS, buildChord } from "./chords";
import { formatNote, noteEquals, spellingsOf } from "./notes";
import { inversionCount, inversionSymbol } from "./voicing";

const ROOTS = Array.from({ length: 12 }, (_, pc) => spellingsOf(pc)).flat();

function parse(input: string) {
  const result = parseChordSymbol(input);
  if (!result.ok) throw new Error(result.error);
  return result.chord;
}

describe("parseChordSymbol round trip", () => {
  it.each(CHORD_QUALITY_IDS)("reads every symbol of %s on all roots back", (id) => {
    for (const root of ROOTS) {
      const symbol = chordSymbolFor(root, specOf(id));
      const chord = parse(symbol);
      expect(noteEquals(chord.root, root), symbol).toBe(true);
      expect(chord.spec, symbol).toEqual(normalizeSpec(specOf(id)));
      expect(chord.quality, symbol).toBe(id);
      expect(chord.bass).toBeNull();
      expect(chord.inversion).toBe(0);
    }
  });

  it("reads back every spec the builder can reach, on all spellings of all roots", () => {
    expect(PARSEABLE_SPECS.length).toBeGreaterThanOrEqual(CHORD_QUALITY_IDS.length);
    for (const spec of PARSEABLE_SPECS) {
      for (const root of ROOTS) {
        const symbol = chordSymbolFor(root, spec);
        const chord = parse(symbol);
        expect(noteEquals(chord.root, root), symbol).toBe(true);
        expect(chord.spec, symbol).toEqual(spec);
        expect(chord.quality, symbol).toBe(identifyQuality(spec));
      }
    }
  });

  it("reads ASCII symbols (# and b) as the music symbols", () => {
    for (const spec of PARSEABLE_SPECS) {
      for (const root of ROOTS) {
        const ascii = chordSymbolFor(root, spec).replace(/♯/g, "#").replace(/♭/g, "b");
        const chord = parse(ascii);
        expect(noteEquals(chord.root, root), ascii).toBe(true);
        expect(chord.spec, ascii).toEqual(spec);
      }
    }
  });
});

describe("parseChordSymbol variants", () => {
  const C = (suffix: string) => parse(`C${suffix}`);

  it.each([
    ["Cmaj7", "major7"],
    ["CM7", "major7"],
    ["C△7", "major7"],
    ["CΔ7", "major7"],
    ["Cmin7", "minor7"],
    ["C-7", "minor7"],
    ["Cm7", "minor7"],
    ["Cø", "halfDiminished7"],
    ["Cø7", "halfDiminished7"],
    ["Cm7b5", "halfDiminished7"],
    ["Cdim", "diminished"],
    ["Cdim7", "diminished7"],
    ["Co7", "diminished7"],
    ["C°", "diminished"],
    ["C+", "augmented"],
    ["Caug", "augmented"],
    ["C+7", "augmented7"],
    ["C7+5", "augmented7"],
    ["C7#5", "augmented7"],
    ["Cmaj", "major"],
    ["CM", "major"],
    ["C", "major"],
    ["Cmin", "minor"],
    ["C-", "minor"],
    ["Csus", "sus4"],
    ["Csus4", "sus4"],
    ["C7sus", "dominant7Sus4"],
    ["C69", "sixNine"],
    ["Cm69", "minorSixNine"],
    ["CmM7", "minorMajor7"],
    ["Cmmaj7", "minorMajor7"],
    ["Cm△7", "minorMajor7"],
    ["C-maj7", "minorMajor7"],
    ["C7b9", "dominant7Flat9"],
    ["C7(b9)", "dominant7Flat9"],
  ] as const)("reads %s", (symbol, id) => {
    expect(parse(symbol).quality).toBe(id);
  });

  it("reads 13(♭9) with or without parentheses", () => {
    expect(C("13(♭9)").spec).toEqual(C("13b9").spec);
    expect(C("13b9").quality).toBeUndefined();
  });

  it("ignores spaces and surrounding whitespace", () => {
    expect(parse("  F# m7 b5 ").spec).toEqual(parse("F#m7b5").spec);
  });

  it("accepts a lower-case root", () => {
    expect(formatNote(parse("bb7").root)).toBe("B♭");
    expect(formatNote(parse("a").root)).toBe("A");
  });

  it("keeps the spelling of the root", () => {
    expect(formatNote(parse("Gb").root)).toBe("G♭");
    expect(formatNote(parse("F#").root)).toBe("F♯");
    expect(formatNote(parse("Cb").root)).toBe("C♭");
    expect(formatNote(parse("E#m").root)).toBe("E♯");
    expect(formatNote(parse("Bbb").root)).toBe("B𝄫");
  });

  it("reads Bb as B flat, and a flat in the suffix after the root", () => {
    expect(formatNote(parse("Bb7").root)).toBe("B♭");
    expect(parse("Bb7b5").spec).toEqual(C("7b5").spec);
  });
});

describe("parseChordSymbol slash chords", () => {
  it("reads F#m7b5/C as F♯ half-diminished in second inversion", () => {
    const chord = parse("F#m7b5/C");
    expect(formatNote(chord.root)).toBe("F♯");
    expect(chord.quality).toBe("halfDiminished7");
    expect(chord.bass && formatNote(chord.bass)).toBe("C");
    expect(chord.inversion).toBe(2);
  });

  it.each([
    ["C", 0],
    ["C/C", 0],
    ["C/E", 1],
    ["C/G", 2],
    ["C7/B♭", 3],
    ["C7/Bb", 3],
    ["Cm/Eb", 1],
    ["Cm/D#", 1], // the same key as E♭
    ["Cmaj7/B", 3],
    ["C6/9/E", 1],
    ["C/D", null], // not a chord tone
    ["C9/D", null], // a ninth in the bass is not an inversion
    ["C13/A", null],
  ] as const)("%s has inversion %s", (symbol, inversion) => {
    expect(parse(symbol).inversion).toBe(inversion);
  });

  it("does not take the 9 of 6/9 for a bass", () => {
    const chord = parse("C6/9");
    expect(chord.quality).toBe("sixNine");
    expect(chord.bass).toBeNull();
  });

  it("reads back the slash chord that inversionSymbol writes, for every inversion", () => {
    for (const id of CHORD_QUALITY_IDS) {
      for (const root of ROOTS) {
        const chord = buildChord(root, id);
        for (let n = 0; n <= inversionCount(chord); n++) {
          const symbol = inversionSymbol(chord, n);
          const parsed = parse(symbol);
          expect(parsed.inversion, symbol).toBe(n);
          expect(parsed.quality, symbol).toBe(id);
        }
      }
    }
  });
});

describe("parseChordSymbol errors", () => {
  const error = (input: string) => {
    const result = parseChordSymbol(input);
    if (result.ok) throw new Error(`"${input}" should not parse`);
    return result.error;
  };

  it("asks for input when empty", () => {
    expect(error("")).toMatch(/Enter a chord symbol/);
    expect(error("   ")).toMatch(/Enter a chord symbol/);
  });

  it("explains that a symbol starts with a note name", () => {
    expect(error("H7")).toMatch(/does not start with a note name/);
    expect(error("7")).toMatch(/does not start with a note name/);
    expect(error("m7")).toMatch(/does not start with a note name/);
  });

  it("names the part it does not understand", () => {
    expect(error("Cxyz")).toMatch(/Unknown chord quality "xyz" after C/);
    expect(error("F#m7b5b5")).toMatch(/Unknown chord quality/);
  });

  it("rejects combinations the builder does not allow", () => {
    expect(error("C5maj7")).toMatch(/Unknown chord quality/);
    expect(error("Cm7b5b5")).toMatch(/Unknown chord quality/);
  });

  it("asks for a bass after a trailing slash", () => {
    expect(error("C/")).toMatch(/bass note after the slash/);
  });

  it("does not read a bass that is not a note", () => {
    expect(error("C/H")).toMatch(/Unknown chord quality "\/H"/);
  });
});

import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, buildChord, chordOnPitchClass } from "./chords";
import { identifyChords, matchInversion } from "./identify";
import { formatNote, pitchClass } from "./notes";

const symbols = (tones: number[], bass?: number) =>
  identifyChords(tones, bass === undefined ? {} : { bass }).map((m) => m.symbol);

describe("identifyChords", () => {
  it("gives equal alternatives for a diminished seventh chord, spelled with fewest accidentals", () => {
    const found = symbols([0, 3, 6, 9]);
    const dim7 = found.filter((s) => s.includes("°7"));
    expect(new Set(dim7)).toEqual(new Set(["C°7", "D♯°7", "F♯°7", "A°7"]));
    expect(found).not.toContain("E♭°7");
    expect(found.some((s) => s.includes("/"))).toBe(false);
  });

  it("makes slash chords of the other roots when the bass is C", () => {
    const found = symbols([0, 3, 6, 9], 0);
    expect(found[0]).toBe("C°7");
    expect(found).toEqual(expect.arrayContaining(["D♯°7/C", "F♯°7/C", "A°7/C"]));
  });

  it("finds both C6 and Am7 for C, E, G, A", () => {
    expect(symbols([0, 4, 7, 9])).toEqual(expect.arrayContaining(["C6", "Am7"]));
    const withBass = symbols([0, 4, 7, 9], 0);
    expect(withBass).toEqual(expect.arrayContaining(["C6", "Am7/C"]));
    expect(withBass.indexOf("C6")).toBeLessThan(withBass.indexOf("Am7/C"));
  });

  it("spells the bass as the chord does", () => {
    const [match] = identifyChords([3, 7, 10], { bass: 7 });
    expect(match?.symbol).toBe("E♭/G");
    expect(match?.bass && formatNote(match.bass)).toBe("G");
    expect(match?.inverted).toBe(true);
  });

  it("puts fewer omitted tones and simpler names first", () => {
    const triad = identifyChords([0, 4, 7]);
    expect(triad[0]?.symbol).toBe("C");
    expect(triad[0]?.omitted).toHaveLength(0);
    const seventh = identifyChords([0, 4, 10]);
    expect(seventh[0]?.symbol).toBe("C7");
    expect(seventh[0]?.omitted.map((t) => t.role)).toEqual(["fifth"]);
  });

  it("normalizes pitch classes and ignores duplicates", () => {
    expect(symbols([12, 16, 19, 0])).toEqual(symbols([0, 4, 7]));
    expect(symbols([-12, 4, 7])).toEqual(symbols([0, 4, 7]));
  });

  it("gives nothing for fewer than two different tones or an unknown shape", () => {
    expect(identifyChords([])).toEqual([]);
    expect(identifyChords([0])).toEqual([]);
    expect(identifyChords([0, 12])).toEqual([]);
    expect(identifyChords([0, 1, 2, 3, 4, 5])).toEqual([]);
  });

  it("rejects tones that are not whole pitch classes", () => {
    expect(() => identifyChords([0, 4.5])).toThrow(RangeError);
  });

  it("adds the bass to the tones when it is not among them", () => {
    expect(symbols([4, 7], 0)).toContain("C");
  });
});

describe("identifyChords on every chord quality and root", () => {
  const cases = CHORD_QUALITY_IDS.flatMap((id) =>
    Array.from({ length: 12 }, (_, pc) => [id, pc] as const),
  );

  const find = (matches: ReturnType<typeof identifyChords>, id: string, pc: number) =>
    matches.find((m) => m.chord.quality.id === id && pitchClass(m.chord.root) === pc);

  it.each(cases)("finds %s on pitch class %i from its tones", (id, pc) => {
    const chord = chordOnPitchClass(pc, id);
    const match = find(identifyChords(chord.tones.map((t) => pitchClass(t.note))), id, pc);
    expect(match?.symbol).toBe(chord.symbol);
    expect(match?.omitted).toEqual([]);
  });

  it.each(cases)("finds %s on pitch class %i without its optional tones", (id, pc) => {
    const chord = chordOnPitchClass(pc, id);
    const kept = chord.tones.filter((t) => !t.optional);
    const match = find(identifyChords(kept.map((t) => pitchClass(t.note))), id, pc);
    expect(match?.symbol).toBe(chord.symbol);
    expect(match?.omitted.length).toBe(chord.tones.length - kept.length);
    expect(match?.omitted.every((t) => t.optional)).toBe(true);
  });

  it.each(cases)("finds every inversion of %s on pitch class %i as a slash chord", (id, pc) => {
    const chord = chordOnPitchClass(pc, id);
    const tones = chord.tones.map((t) => pitchClass(t.note));
    for (const tone of chord.tones.slice(1)) {
      const match = find(identifyChords(tones, { bass: pitchClass(tone.note) }), id, pc);
      expect(match?.symbol).toBe(`${chord.symbol}/${formatNote(tone.note)}`);
      expect(match?.inverted).toBe(true);
    }
    const root = find(identifyChords(tones, { bass: pc }), id, pc);
    expect(root?.symbol).toBe(chord.symbol);
    expect(root?.inverted).toBe(false);
  });

  it.each(cases)("only returns chords that cover the input for %s on %i", (id, pc) => {
    const chord = chordOnPitchClass(pc, id);
    const tones = chord.tones.map((t) => pitchClass(t.note));
    for (const m of identifyChords(tones)) {
      const own = new Set(
        buildChord(m.chord.root, m.chord.quality.id).tones.map((t) => pitchClass(t.note)),
      );
      for (const t of tones) expect(own.has(t)).toBe(true);
      expect(m.omitted.every((t) => t.optional)).toBe(true);
    }
  });
});

describe("matchInversion", () => {
  const find = (tones: number[], bass: number | undefined, symbol: string) => {
    const found = identifyChords(tones, bass === undefined ? {} : { bass }).find(
      (m) => m.symbol === symbol,
    );
    if (!found) throw new Error(`${symbol} not found`);
    return found;
  };

  it("is 0 in root position and without a bass", () => {
    expect(matchInversion(find([0, 4, 7], 0, "C"))).toBe(0);
    expect(matchInversion(find([0, 4, 7], undefined, "C"))).toBe(0);
  });

  it("counts the bass tone from the low end, as inversionSymbol does", () => {
    expect(matchInversion(find([0, 4, 7], 4, "C/E"))).toBe(1);
    expect(matchInversion(find([0, 4, 7], 7, "C/G"))).toBe(2);
    expect(matchInversion(find([0, 4, 7, 10], 10, "C7/B♭"))).toBe(3);
  });

  it("is 0 for a bass the keyboard cannot show as an inversion", () => {
    // D is the ninth of C9: it stays where it is.
    const ninth = identifyChords([0, 2, 4, 7, 10], { bass: 2 }).find((m) => m.symbol === "C9/D");
    expect(ninth).toBeDefined();
    if (ninth) expect(matchInversion(ninth)).toBe(0);
  });
});

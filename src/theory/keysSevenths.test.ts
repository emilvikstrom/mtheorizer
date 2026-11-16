import { describe, expect, it } from "vitest";
import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  diatonicBlock,
  diatonicSevenths,
  key,
  relativeKey,
  ringChords,
} from "./keys";
import { formatNoteAscii, parseNote } from "./notes";

const k = (tonic: string, mode: KeyMode = "major") => key(parseNote(tonic), mode);

describe("seventh chords on the rings", () => {
  const MAJOR_TONICS = CIRCLE_OF_FIFTHS.flat();
  const KEYS = MAJOR_TONICS.flatMap((t) => [key(t, "major"), relativeKey(key(t, "major"))]);

  const MAJOR_SEVENTHS = {
    roman: ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"],
    quality: ["major7", "minor7", "minor7", "major7", "dominant7", "minor7", "halfDiminished7"],
  };
  const MINOR_SEVENTHS = {
    roman: ["i7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"],
    quality: ["minor7", "halfDiminished7", "major7", "minor7", "minor7", "major7", "dominant7"],
  };

  it("numbers and qualifies the diatonic sevenths in all 24 keys", () => {
    expect(KEYS).toHaveLength(30); // 15 spellings of major keys and their relative minors
    for (const x of KEYS) {
      const expected = x.mode === "major" ? MAJOR_SEVENTHS : MINOR_SEVENTHS;
      const sevenths = diatonicSevenths(x);
      expect(sevenths.map((s) => s.roman)).toEqual(expected.roman);
      expect(sevenths.map((s) => s.quality)).toEqual(expected.quality);
    }
  });

  it("spells the sevenths of C major, A minor and D♭ major", () => {
    const symbols = (tonic: string, mode: KeyMode) =>
      diatonicSevenths(k(tonic, mode)).map((s) => s.symbol);
    expect(symbols("C", "major")).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7♭5"]);
    expect(symbols("A", "minor")).toEqual(["Am7", "Bm7♭5", "Cmaj7", "Dm7", "Em7", "Fmaj7", "G7"]);
    expect(symbols("Db", "major")).toEqual([
      "D♭maj7",
      "E♭m7",
      "Fm7",
      "G♭maj7",
      "A♭7",
      "B♭m7",
      "Cm7♭5",
    ]);
    const spelled = diatonicSevenths(k("Db")).map((s) =>
      s.notes.map((n) => formatNoteAscii(n)).join(" "),
    );
    expect(spelled).toEqual([
      "Db F Ab C",
      "Eb Gb Bb Db",
      "F Ab C Eb",
      "Gb Bb Db F",
      "Ab C Eb Gb",
      "Bb Db F Ab",
      "C Eb Gb Bb",
    ]);
  });

  it("gives every ring position its seventh chord, on the same roots as the triads", () => {
    for (let position = 0; position < 12; position++) {
      const rings = ringChords(position, "sevenths");
      const triads = ringChords(position);
      for (const c of rings.major) expect(c.quality).toBe("major7");
      for (const c of rings.minor) expect(c.quality).toBe("minor7");
      for (const c of rings.diminished) expect(c.quality).toBe("halfDiminished7");
      for (const ring of ["major", "minor", "diminished"] as const) {
        expect(rings[ring].map((c) => c.root)).toEqual(triads[ring].map((c) => c.root));
        for (const c of rings[ring]) expect(c.notes).toHaveLength(4);
      }
    }
  });

  it("writes the seventh chords of the circle", () => {
    const at = (position: number) => {
      const r = ringChords(position, "sevenths");
      return [r.major, r.minor, r.diminished].map((ring) => ring.map((c) => c.symbol));
    };
    expect(at(0)).toEqual([["Cmaj7"], ["Am7"], ["Bm7♭5"]]);
    expect(at(5)).toEqual([
      ["Bmaj7", "C♭maj7"],
      ["G♯m7", "A♭m7"],
      ["A♯m7♭5", "B♭m7♭5"],
    ]);
  });

  it("keeps triads as the default", () => {
    for (let position = 0; position < 12; position++) {
      expect(ringChords(position)).toEqual(ringChords(position, "triads"));
    }
    for (const x of KEYS) expect(diatonicBlock(x)).toEqual(diatonicBlock(x, "triads"));
  });

  it("places the same seven roots as the triads, with V7 on the major ring", () => {
    for (const x of KEYS) {
      const triads = diatonicBlock(x).chords;
      const sevenths = diatonicBlock(x, "sevenths").chords;
      expect(sevenths.map((c) => `${c.chord.ring}${c.chord.position}`)).toEqual(
        triads.map((c) => `${c.chord.ring}${c.chord.position}`),
      );
      expect(sevenths.map((c) => c.chord.root)).toEqual(triads.map((c) => c.chord.root));
      // The function follows along.
      expect(sevenths.map((c) => c.function)).toEqual(triads.map((c) => c.function));
      const expected = x.mode === "major" ? MAJOR_SEVENTHS : MINOR_SEVENTHS;
      expect(sevenths.map((c) => c.roman)).toEqual(expected.roman);
      expect(sevenths.map((c) => c.chord.quality)).toEqual(expected.quality);
    }
  });

  it("has the same seven chords in a major key and its relative minor", () => {
    for (const t of MAJOR_TONICS) {
      const major = key(t, "major");
      const byChord = (x: Key) =>
        diatonicBlock(x, "sevenths")
          .chords.map((c) => `${c.chord.symbol}@${c.chord.ring}${c.chord.position}`)
          .sort();
      expect(byChord(relativeKey(major))).toEqual(byChord(major));
    }
  });

  it("marks V7 and vii°7 of harmonic minor outside the block", () => {
    const block = diatonicBlock(k("A", "minor"), "sevenths");
    expect(block.harmonicMinor?.dominant.symbol).toBe("E7");
    expect(block.harmonicMinor?.dominant.position).toBe(4);
    expect(block.harmonicMinor?.leadingTone.symbol).toBe("G♯°7");
    expect(block.harmonicMinor?.leadingTone.position).toBe(3);
    for (const x of KEYS.filter((y) => y.mode === "minor")) {
      const triads = diatonicBlock(x);
      const sevenths = diatonicBlock(x, "sevenths");
      expect(sevenths.harmonicMinor?.dominant.position).toBe(
        triads.harmonicMinor?.dominant.position,
      );
      expect(sevenths.harmonicMinor?.leadingTone.position).toBe(
        triads.harmonicMinor?.leadingTone.position,
      );
      expect(sevenths.harmonicMinor?.dominant.quality).toBe("dominant7");
      expect(sevenths.harmonicMinor?.leadingTone.quality).toBe("diminished7");
    }
  });
});

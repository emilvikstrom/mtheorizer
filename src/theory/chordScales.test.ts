import { describe, expect, it } from "vitest";
import {
  CHORD_SCALES,
  chordsInScale,
  scaleChordSymbol,
  scaleFitsChord,
  scalesForChord,
} from "./chordScales";
import { chordFromSpec } from "./chordNaming";
import { CHORD_QUALITY_IDS, type ChordQualityId, buildChord, chordOnPitchClass } from "./chords";
import { type ChordSpec } from "./chordSpec";
import { formatNote, note, pitchClass } from "./notes";
import { SCALES, type ScaleId, scaleOnPitchClass } from "./scales";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

describe("which scales fit over a chord", () => {
  // The examples of the backlog, on every root: the answer does not depend on the root.
  const EXAMPLES: ReadonlyArray<readonly [ChordQualityId, readonly ScaleId[]]> = [
    ["major7", ["major", "lydian"]],
    ["dominant7", ["mixolydian", "lydianDominant", "altered"]],
    ["minor7", ["dorian", "naturalMinor"]],
    ["halfDiminished7", ["locrian", "locrianNatural2"]],
  ];

  describe.each(EXAMPLES)("%s", (id, expected) => {
    it.each(PITCH_CLASSES)("on pitch class %i fits %j", (pc) => {
      expect(scalesForChord(chordOnPitchClass(pc, id))).toEqual(expected);
    });
  });

  it("only lists scales that contain every required tone of the chord", () => {
    for (const id of CHORD_QUALITY_IDS) {
      const chord = buildChord(note("C"), id);
      for (const scaleId of CHORD_SCALES[id] ?? []) {
        expect(scaleFitsChord(chord, scaleId), `${chord.symbol} in C ${scaleId}`).toBe(true);
      }
    }
  });

  it("lists scales that exist, once each", () => {
    for (const [id, scales] of Object.entries(CHORD_SCALES)) {
      expect(new Set(scales).size, id).toBe(scales.length);
      for (const scaleId of scales) expect(SCALES[scaleId], `${id}: ${scaleId}`).toBeDefined();
    }
  });

  it("names the altered scale over the altered dominants", () => {
    for (const id of [
      "dominant7Flat9",
      "dominant7Sharp9",
      "dominant7Sharp5Sharp9",
      "dominant7Flat13",
    ] as const) {
      expect(scalesForChord(buildChord(note("G"), id))).toContain("altered");
    }
  });

  it("falls back to the scales that contain the tones for a free chord", () => {
    const spec: ChordSpec = { base: "major", qualities: ["7", "flat5", "flat9"] };
    const chord = chordFromSpec(note("C"), spec);
    expect(chord.quality).toBeUndefined();
    // C E G♭ B♭ D♭: only the altered scale (and no other seven-note scale) has all of them.
    expect(scalesForChord(chord)).toEqual(["altered"]);
  });

  it("falls back for a quality that has no entry", () => {
    const chord = buildChord(note("C"), "sus4");
    expect(CHORD_SCALES.sus4).toBeUndefined();
    const fits = scalesForChord(chord);
    expect(fits).toContain("major");
    expect(fits).toContain("mixolydian");
    for (const id of fits) expect(scaleFitsChord(chord, id)).toBe(true);
  });

  it("does not require the optional tones", () => {
    // The fifth of C7♭5 is required, but the fifth of C13 is optional: a scale that lacks it fits.
    const chord = buildChord(note("C"), "dominant13");
    expect(chord.tones.some((t) => t.optional)).toBe(true);
    expect(scaleFitsChord(chord, "mixolydian")).toBe(true);
  });
});

describe("the chords in a scale", () => {
  const symbols = (pc: number, scaleId: ScaleId, kind: "triad" | "seventh") =>
    chordsInScale(scaleOnPitchClass(pc, scaleId)).map((c) => {
      const id = c[kind];
      return id ? scaleChordSymbol(c.root, id) : "?";
    });

  it("gives the triads and sevenths of C major", () => {
    expect(symbols(0, "major", "triad")).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
    expect(symbols(0, "major", "seventh")).toEqual([
      "Cmaj7",
      "Dm7",
      "Em7",
      "Fmaj7",
      "G7",
      "Am7",
      "Bm7♭5",
    ]);
  });

  it("gives the chords of A minor, natural and harmonic", () => {
    expect(symbols(9, "naturalMinor", "triad")).toEqual(["Am", "B°", "C", "Dm", "Em", "F", "G"]);
    expect(symbols(9, "harmonicMinor", "triad")).toEqual(["Am", "B°", "C+", "Dm", "E", "F", "G♯°"]);
    expect(symbols(9, "harmonicMinor", "seventh")).toEqual([
      "Am(maj7)",
      "Bm7♭5",
      "Cmaj7♯5",
      "Dm7",
      "E7",
      "Fmaj7",
      "G♯°7",
    ]);
  });

  it("gives the dominant chord of the lydian dominant and altered scales", () => {
    expect(symbols(0, "lydianDominant", "seventh")[0]).toBe("C7");
    expect(symbols(0, "altered", "seventh")[2]).toBe("E♭m7");
  });

  it("numbers the degrees and spells the roots as the scale does", () => {
    const scale = scaleOnPitchClass(3, "major");
    const chords = chordsInScale(scale);
    expect(chords.map((c) => c.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(chords.map((c) => formatNote(c.root))).toEqual(
      scale.tones.map((t) => formatNote(t.note)),
    );
  });

  it("builds only chords whose tones all lie in the scale", () => {
    for (const scaleId of Object.keys(SCALES) as ScaleId[]) {
      for (const pc of PITCH_CLASSES) {
        const scale = scaleOnPitchClass(pc, scaleId);
        const inScale = new Set(scale.tones.map((t) => pitchClass(t.note)));
        for (const c of chordsInScale(scale)) {
          for (const id of [c.triad, c.seventh]) {
            if (!id) continue;
            for (const t of buildChord(c.root, id).tones) {
              expect(inScale.has(pitchClass(t.note)), `${scaleId} on ${pc}: ${id}`).toBe(true);
            }
          }
        }
      }
    }
  });

  // Hungarian minor and double harmonic have augmented seconds, so some degrees stack into
  // chords with no name (D F A♯ in C Hungarian minor). The table shows those as blanks.
  const UNNAMED: readonly ScaleId[] = ["hungarianMinor", "doubleHarmonic"];

  it("names a triad and a seventh on every degree of the seven-note modes", () => {
    // Every mode of major, melodic and harmonic minor stacks into named triads, so nothing is blank.
    for (const scaleId of Object.keys(SCALES) as ScaleId[]) {
      const scale = scaleOnPitchClass(0, scaleId);
      if (scale.tones.length !== 7 || UNNAMED.includes(scaleId)) continue;
      for (const c of chordsInScale(scale)) {
        expect(c.triad, `${scaleId} degree ${c.degree} triad`).toBeDefined();
        expect(c.seventh, `${scaleId} degree ${c.degree} seventh`).toBeDefined();
      }
    }
  });

  it("leaves a degree blank when its stacked thirds have no name", () => {
    const hungarian = chordsInScale(scaleOnPitchClass(0, "hungarianMinor"));
    expect(hungarian[0]?.triad).toBe("minor");
    expect(hungarian[1]?.triad).toBeUndefined();
  });

  it("is empty for scales that do not have seven tones", () => {
    expect(chordsInScale(scaleOnPitchClass(0, "majorPentatonic"))).toEqual([]);
    expect(chordsInScale(scaleOnPitchClass(9, "minorBlues"))).toEqual([]);
  });
});

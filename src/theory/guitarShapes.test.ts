import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, type ChordQualityId, chordOnPitchClass } from "./chords";
import { chordShapes, formatShape, lastFret, scalePositions } from "./guitarShapes";
import { TUNING_IDS, TUNINGS } from "./fretboard";
import { pitchClass } from "./notes";
import { type ScaleId, scaleOnPitchClass } from "./scales";
import { chordHighlights, scaleHighlights } from "./voicing";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);
const SCALE_IDS: ScaleId[] = ["major", "naturalMinor"];

const shapesOf = (pc: number, quality: ChordQualityId) =>
  chordShapes(chordHighlights(chordOnPitchClass(pc, quality)));
const formatted = (pc: number, quality: ChordQualityId) =>
  shapesOf(pc, quality).map((s) => formatShape(s));

describe("chordShapes", () => {
  it("finds the CAGED shapes of C major, lowest first", () => {
    expect(formatted(0, "major")).toEqual([
      "x 3 2 0 1 0",
      "x 3 5 5 5 3",
      "8 7 5 5 5 8",
      "8 10 10 9 8 8",
      "x x 10 12 13 12",
      "x 15 14 12 13 12",
    ]);
    expect(shapesOf(0, "major").map((s) => s.firstFret)).toEqual([1, 3, 5, 8, 10, 12]);
  });

  it.each([
    [7, "major", "3 2 0 0 0 3"],
    [9, "major", "x 0 2 2 2 0"],
    [2, "major", "x x 0 2 3 2"],
    [4, "major", "0 2 2 1 0 0"],
    [9, "minor", "x 0 2 2 1 0"],
    [4, "minor", "0 2 2 0 0 0"],
    [2, "minor", "x x 0 2 3 1"],
  ] as const)("starts pitch class %i %s with the open chord %s", (pc, quality, shape) => {
    expect(formatted(pc, quality)[0]).toBe(shape);
  });

  it("uses a barre when there is no open chord", () => {
    const [f] = shapesOf(5, "major");
    expect(f && formatShape(f)).toBe("1 3 3 2 1 1");
    expect(f?.fingers).toBe(4);
    expect(formatted(11, "minor")[0]).toBe("x 2 4 4 3 2");
  });

  it("marks muted strings and spells the notes as in the chord", () => {
    const [eFlatMinor] = shapesOf(3, "minor");
    expect(eFlatMinor?.muted).toEqual([5, 6]);
    expect(
      eFlatMinor?.positions.map(
        (p) => `${p.string}/${p.fret}:${p.note.letter}${p.note.accidental}`,
      ),
    ).toEqual(["1/2:G-1", "2/4:E-1", "3/3:B-1", "4/1:E-1"]);
  });

  it.each([
    [0, "dominant7", "x 3 2 3 1 0"],
    [0, "major7", "x 3 2 0 0 0"],
    [9, "minor7", "x 0 2 0 1 0"],
    [7, "dominant7", "3 2 0 0 0 1"],
    [2, "sus4", "x x 0 2 3 3"],
    [0, "diminished7", "x 3 1 2 1 2"],
  ] as const)("starts pitch class %i %s with the shape %s", (pc, quality, shape) => {
    expect(formatted(pc, quality)[0]).toBe(shape);
  });

  it("may leave out the fifth of a seventh chord, as the open C7 does", () => {
    const [c7] = shapesOf(0, "dominant7");
    expect(c7?.positions.map((p) => p.role)).toEqual(["third", "root", "seventh", "third", "root"]);
  });

  it("prefers shapes with more of the chord tones", () => {
    // C13 on five strings: root, fifth, seventh, third and thirteenth; only the optional ninth is left out.
    expect(formatted(0, "dominant13")[0]).toBe("x 3 5 3 5 5");
  });

  describe.each(CHORD_QUALITY_IDS)("every %s chord", (quality) => {
    it.each(PITCH_CLASSES)("on pitch class %i has playable root-position shapes", (pc) => {
      const chord = chordOnPitchClass(pc, quality);
      const shapes = chordShapes(chordHighlights(chord));
      expect(shapes.length).toBeGreaterThanOrEqual(
        quality === "major" || quality === "minor" ? 3 : 1,
      );
      expect(new Set(shapes.map((s) => formatShape(s))).size).toBe(shapes.length);
      expect(shapes.map((s) => s.firstFret)).toEqual(
        [...shapes.map((s) => s.firstFret)].sort((a, b) => a - b),
      );

      for (const shape of shapes) {
        const strings = shape.positions.map((p) => p.string);
        // Strings 1 up to the bass are all played, once each; the rest are muted.
        expect(strings).toEqual(Array.from({ length: strings.length }, (_, i) => i + 1));
        expect(strings.length).toBeGreaterThanOrEqual(4);
        expect(shape.muted).toEqual(
          Array.from({ length: 6 - strings.length }, (_, i) => strings.length + i + 1),
        );

        const bass = shape.positions[shape.positions.length - 1];
        expect(bass?.isRoot).toBe(true);
        // Every tone that may not be left out sounds, and nothing outside the chord does.
        const sounding = new Set(shape.positions.map((p) => pitchClass(p.note)));
        for (const tone of chord.tones) {
          if (!tone.optional) expect(sounding).toContain(pitchClass(tone.note));
        }
        const inChord = new Set(chord.tones.map((t) => pitchClass(t.note)));
        for (const pc of sounding) expect(inChord).toContain(pc);
        for (const p of shape.positions) {
          expect(p.midi % 12).toBe(pitchClass(p.note));
          if (p.fret === 0) expect(shape.firstFret).toBe(1);
          else expect(p.fret).toBeGreaterThanOrEqual(shape.firstFret);
          expect(p.fret).toBeLessThanOrEqual(lastFret(shape));
        }
        expect(shape.fingers).toBeLessThanOrEqual(4);
      }
    });
  });
});

describe("scalePositions", () => {
  it("starts a position on each scale tone of the low E string", () => {
    const views = scalePositions(scaleHighlights(scaleOnPitchClass(0, "major")));
    expect(views.map((v) => v.firstFret)).toEqual([1, 3, 5, 7, 8, 10, 12]);
    // The first position includes the open strings, all of them natural notes in C major.
    expect(views[0]?.positions.filter((p) => p.fret === 0).map((p) => p.string)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  describe.each(SCALE_IDS)("every %s scale", (scaleId) => {
    it.each(PITCH_CLASSES)("on pitch class %i has the whole scale in each position", (pc) => {
      const scale = scaleOnPitchClass(pc, scaleId);
      for (const view of scalePositions(scaleHighlights(scale))) {
        expect(view.muted).toEqual([]);
        expect(new Set(view.positions.map((p) => pitchClass(p.note))).size).toBe(7);
        for (const p of view.positions) {
          expect(
            p.fret === 0
              ? view.firstFret === 1
              : p.fret >= view.firstFret && p.fret <= lastFret(view),
          ).toBe(true);
        }
      }
    });
  });
});

describe("other tunings", () => {
  it("finds the open D major shape in Drop D", () => {
    const tones = chordHighlights(chordOnPitchClass(2, "major"));
    expect(formatShape(chordShapes(tones, TUNINGS.dropD.strings)[0]!)).toBe("0 0 0 2 3 2");
  });

  it("finds the open strings of DADGAD as D suspended fourth", () => {
    const tones = chordHighlights(chordOnPitchClass(2, "sus4"));
    expect(formatShape(chordShapes(tones, TUNINGS.dadgad.strings)[0]!)).toBe("0 0 0 0 0 0");
  });

  describe.each(TUNING_IDS)("%s", (id) => {
    const strings = TUNINGS[id].strings;
    it.each(PITCH_CLASSES)(
      "gives every chord of pitch class %i a shape that sounds its tones",
      (pc) => {
        for (const quality of CHORD_QUALITY_IDS) {
          const tones = chordHighlights(chordOnPitchClass(pc, quality));
          const required = tones.filter((t) => !t.optional).map((t) => pitchClass(t.note));
          for (const shape of chordShapes(tones, strings)) {
            const sounded = new Set(shape.positions.map((p) => pitchClass(p.note)));
            expect(required.every((r) => sounded.has(r))).toBe(true);
          }
        }
      },
    );

    it.each(PITCH_CLASSES)("covers the whole scale of pitch class %i along the neck", (pc) => {
      for (const scaleId of SCALE_IDS) {
        const tones = scaleHighlights(scaleOnPitchClass(pc, scaleId));
        const views = scalePositions(tones, strings);
        expect(views.length).toBeGreaterThan(0);
        const shown = new Set(views.flatMap((v) => v.positions.map((p) => pitchClass(p.note))));
        expect(shown.size).toBe(tones.length);
      }
    });
  });
});

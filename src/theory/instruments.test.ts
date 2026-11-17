import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, type ChordQualityId, chordOnPitchClass } from "./chords";
import {
  STRING_INSTRUMENT_IDS,
  TUNINGS,
  fretboardPositions,
  openStringMidi,
  tuningFor,
} from "./fretboard";
import { chordShapes, formatShape, lowestString, scalePositions } from "./guitarShapes";
import { formatNote, pitchClass } from "./notes";
import { SCALES, type ScaleId, scaleOnPitchClass } from "./scales";
import { chordHighlights, scaleHighlights } from "./voicing";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);
const SCALE_IDS = Object.keys(SCALES) as ScaleId[];
const INSTRUMENT_TUNINGS = ["ukulele", "mandolin", "bass", "bass5"] as const;

const grips = (id: (typeof INSTRUMENT_TUNINGS)[number], pc: number, quality: ChordQualityId) => {
  const tuning = TUNINGS[id];
  return chordShapes(chordHighlights(chordOnPitchClass(pc, quality)), tuning.strings, {
    rootInBass: tuning.rootInBass,
  }).map((s) => formatShape(s, tuning.strings.length));
};

describe("string instruments", () => {
  it("tunes the ukulele G4 C4 E4 A4 with the high G on string 4", () => {
    expect(TUNINGS.ukulele.strings.map(openStringMidi)).toEqual([69, 64, 60, 67]);
  });

  it("tunes the mandolin E5 A4 D4 G3", () => {
    expect(TUNINGS.mandolin.strings.map(openStringMidi)).toEqual([76, 69, 62, 55]);
  });

  it("tunes the bass an octave below the guitar's top four strings, and the fifth string to a low B", () => {
    expect(TUNINGS.bass.strings.map(openStringMidi)).toEqual([43, 38, 33, 28]);
    expect(TUNINGS.bass5.strings.map(openStringMidi)).toEqual([43, 38, 33, 28, 23]);
  });

  it("gives every instrument its own tuning, and only the guitar a choice", () => {
    expect(tuningFor("ukulele", "dropD").id).toBe("ukulele");
    expect(tuningFor("bass5").strings).toHaveLength(5);
    expect(tuningFor("guitar").id).toBe("standard");
    expect(tuningFor("guitar", "dadgad").id).toBe("dadgad");
    for (const id of STRING_INSTRUMENT_IDS) expect(tuningFor(id).instrument).toBe(id);
  });

  it("spells notes on the ukulele's strings as in the chord", () => {
    const positions = fretboardPositions(chordOnPitchClass(3, "minor"), TUNINGS.ukulele.strings);
    // On string 1 (the A string): B♭ at fret 1, E♭ at fret 6, G♭ at fret 9.
    const onFirst = positions
      .filter((p) => p.string === 1)
      .map((p) => `${p.fret}:${formatNote(p.note)}:${p.role}`);
    expect(onFirst).toEqual(["1:B♭:fifth", "6:E♭:root", "9:G♭:third"]);
  });

  it("finds the familiar ukulele chords, written from the G string to the A string", () => {
    expect(grips("ukulele", 0, "major")[0]).toBe("0 0 0 3");
    expect(grips("ukulele", 9, "minor")[0]).toBe("2 0 0 0");
    expect(grips("ukulele", 7, "major")[0]).toBe("0 2 3 2");
    expect(grips("ukulele", 5, "major")[0]).toBe("2 0 1 0");
    expect(grips("ukulele", 7, "dominant7")[0]).toBe("0 2 1 2");
    expect(grips("ukulele", 0, "dominant7")[0]).toBe("0 0 0 1");
  });

  it("lets a ukulele grip start on a tone other than the root", () => {
    // Am is 2000: the C string is the lowest sounding, and it holds the minor third.
    const [am] = chordShapes(
      chordHighlights(chordOnPitchClass(9, "minor")),
      TUNINGS.ukulele.strings,
      {
        rootInBass: false,
      },
    );
    const lowest = am?.positions.reduce((a, b) => (a.midi < b.midi ? a : b));
    expect(lowest?.role).toBe("third");
  });

  it("finds the familiar mandolin chords, written from the G string to the E string", () => {
    expect(grips("mandolin", 0, "major")[0]).toBe("0 2 3 0");
    expect(grips("mandolin", 7, "major")[0]).toBe("0 0 2 3");
    expect(grips("mandolin", 4, "minor")[0]).toBe("0 2 2 0");
    expect(grips("mandolin", 7, "dominant7")[0]).toBe("0 0 2 1");
  });

  it("puts the root on the lowest string of a four-string bass", () => {
    expect(grips("bass", 0, "major")[0]).toBe("8 7 5 5");
    expect(grips("bass", 4, "minor")[0]).toBe("0 2 2 0");
    expect(grips("bass", 7, "major")[0]).toBe("3 2 0 0");
  });

  it("uses the low B of a five-string bass for the root, and leaves it out when it is not needed", () => {
    expect(grips("bass5", 0, "major")[0]).toBe("1 0 3 2 0");
    expect(grips("bass5", 9, "minor")[0]).toBe("x 5 3 2 2");
  });

  it("finds the lowest string by pitch, not by number", () => {
    expect(lowestString(TUNINGS.standard.strings)).toBe(6);
    expect(lowestString(TUNINGS.bass5.strings)).toBe(5);
    // Ukulele string 3 is the C; string 4 is the high G above it.
    expect(lowestString(TUNINGS.ukulele.strings)).toBe(3);
  });

  describe.each(INSTRUMENT_TUNINGS)("%s", (id) => {
    const tuning = TUNINGS[id];
    const count = tuning.strings.length;
    const lowest = lowestString(tuning.strings);

    it.each(PITCH_CLASSES)("gives chords of pitch class %i grips that fit the instrument", (pc) => {
      for (const quality of CHORD_QUALITY_IDS) {
        const chord = chordOnPitchClass(pc, quality);
        const tones = chordHighlights(chord);
        const required = tones.filter((t) => !t.optional).map((t) => pitchClass(t.note));
        const inChord = new Set(chord.tones.map((t) => pitchClass(t.note)));
        const shapes = chordShapes(tones, tuning.strings, { rootInBass: tuning.rootInBass });
        for (const shape of shapes) {
          const sounded = new Set(shape.positions.map((p) => pitchClass(p.note)));
          expect(required.every((r) => sounded.has(r))).toBe(true);
          for (const p of shape.positions) {
            expect(inChord.has(pitchClass(p.note))).toBe(true);
            expect(p.string).toBeGreaterThanOrEqual(1);
            expect(p.string).toBeLessThanOrEqual(count);
            const open = tuning.strings[p.string - 1];
            expect(p.midi).toBe((open ? openStringMidi(open) : 0) + p.fret);
          }
          expect(shape.fingers).toBeLessThanOrEqual(4);
          if (!tuning.rootInBass) {
            // Every string is played.
            expect(shape.positions).toHaveLength(count);
          } else if (quality !== "power") {
            // The root is the lowest note sounded.
            const bass = shape.positions.reduce((a, b) => (a.midi < b.midi ? a : b));
            expect(bass.isRoot).toBe(true);
          }
        }
      }
    });

    it.each(PITCH_CLASSES)("covers the whole scale of pitch class %i along the neck", (pc) => {
      for (const scaleId of SCALE_IDS) {
        const tones = scaleHighlights(scaleOnPitchClass(pc, scaleId));
        const views = scalePositions(tones, tuning.strings);
        expect(views.length).toBeGreaterThan(0);
        const shown = new Set(views.flatMap((v) => v.positions.map((p) => pitchClass(p.note))));
        expect(shown.size).toBe(tones.length);
        // Positions after the first start on a scale tone of the lowest string.
        for (const view of views.slice(1)) {
          const starts = view.positions.some(
            (p) => p.string === lowest && p.fret === view.firstFret,
          );
          expect(starts).toBe(true);
        }
      }
    });
  });
});

import { describe, expect, it } from "vitest";
import { formatNote, formatNoteAscii, parseNote, pitchClass } from "./notes";
import {
  MAJOR_SCALE,
  NATURAL_MINOR_SCALE,
  buildScale,
  keySignatureAccidentals,
  SCALES,
  SCALE_GROUPS,
  type ScaleId,
  scaleLabel,
  scaleOnPitchClass,
  scaleToneLabel,
} from "./scales";

const scale = (tonic: string, s: typeof MAJOR_SCALE) =>
  buildScale(parseNote(tonic), s).map(formatNoteAscii).join(" ");

describe("scales", () => {
  it("builds major scales", () => {
    expect(scale("C", MAJOR_SCALE)).toBe("C D E F G A B");
    expect(scale("Eb", MAJOR_SCALE)).toBe("Eb F G Ab Bb C D");
    expect(scale("F#", MAJOR_SCALE)).toBe("F# G# A# B C# D# E#");
  });

  it("builds natural minor scales", () => {
    expect(scale("A", NATURAL_MINOR_SCALE)).toBe("A B C D E F G");
    expect(scale("C#", NATURAL_MINOR_SCALE)).toBe("C# D# E F# G# A B");
  });

  it("counts key signature accidentals", () => {
    expect(keySignatureAccidentals(parseNote("C"), MAJOR_SCALE)).toBe(0);
    expect(keySignatureAccidentals(parseNote("Db"), MAJOR_SCALE)).toBe(5);
    expect(keySignatureAccidentals(parseNote("C#"), MAJOR_SCALE)).toBe(7);
    expect(keySignatureAccidentals(parseNote("D#"), MAJOR_SCALE)).toBe(9);
    expect(keySignatureAccidentals(parseNote("Eb"), NATURAL_MINOR_SCALE)).toBe(6);
    expect(keySignatureAccidentals(parseNote("D#"), NATURAL_MINOR_SCALE)).toBe(6);
  });
});

describe("all 24 major and natural minor scales", () => {
  // Pitch class 0..11 → expected spelling, the way a musician would write it.
  const MAJOR = [
    "C D E F G A B",
    "Db Eb F Gb Ab Bb C",
    "D E F# G A B C#",
    "Eb F G Ab Bb C D",
    "E F# G# A B C# D#",
    "F G A Bb C D E",
    "F# G# A# B C# D# E#",
    "G A B C D E F#",
    "Ab Bb C Db Eb F G",
    "A B C# D E F# G#",
    "Bb C D Eb F G A",
    "B C# D# E F# G# A#",
  ];
  const NATURAL_MINOR = [
    "C D Eb F G Ab Bb",
    "C# D# E F# G# A B",
    "D E F G A Bb C",
    "Eb F Gb Ab Bb Cb Db",
    "E F# G A B C D",
    "F G Ab Bb C Db Eb",
    "F# G# A B C# D E",
    "G A Bb C D Eb F",
    "G# A# B C# D# E F#",
    "A B C D E F G",
    "Bb C Db Eb F Gb Ab",
    "B C# D E F# G A",
  ];

  const notesOf = (pc: number, id: "major" | "naturalMinor") =>
    scaleOnPitchClass(pc, id)
      .tones.map((t) => formatNoteAscii(t.note))
      .join(" ");

  it.each(MAJOR.map((expected, pc) => [pc, expected]))(
    "major on pitch class %i is %s",
    (pc, expected) => {
      expect(notesOf(pc as number, "major")).toBe(expected);
    },
  );

  it.each(NATURAL_MINOR.map((expected, pc) => [pc, expected]))(
    "natural minor on pitch class %i is %s",
    (pc, expected) => {
      expect(notesOf(pc as number, "naturalMinor")).toBe(expected);
    },
  );

  it("uses every letter exactly once", () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const id of ["major", "naturalMinor"] as const) {
        const letters = scaleOnPitchClass(pc, id).tones.map((t) => t.note.letter);
        expect(new Set(letters).size).toBe(7);
      }
    }
  });

  it("numbers the degrees and names the scale", () => {
    const scale = scaleOnPitchClass(3, "naturalMinor");
    expect(scale.name).toBe("E♭ natural minor scale");
    expect(scale.tones.map((t) => t.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scale.tones.map(scaleToneLabel)).toEqual([
      "Tonic",
      "Major second",
      "Minor third",
      "Perfect fourth",
      "Perfect fifth",
      "Minor sixth",
      "Minor seventh",
    ]);
  });
});

describe("scales and modes", () => {
  // Semitones above the tonic, written out independently of the interval data.
  const PATTERNS: Record<ScaleId, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    minorBlues: [0, 3, 5, 6, 7, 10],
    majorBlues: [0, 2, 3, 4, 7, 9],
  };
  const ids = Object.keys(SCALES) as ScaleId[];
  const pitchClasses = Array.from({ length: 12 }, (_, pc) => pc);

  it("lists every scale in exactly one group", () => {
    const listed = SCALE_GROUPS.flatMap((g) => g.scales);
    expect([...listed].sort()).toEqual([...ids].sort());
  });

  describe.each(ids)("%s", (id) => {
    it.each(pitchClasses)("on pitch class %i has the right pitches", (pc) => {
      const scale = scaleOnPitchClass(pc, id);
      expect(pitchClass(scale.tonic)).toBe(pc);
      expect(scale.tones.map((t) => (pitchClass(t.note) - pc + 12) % 12)).toEqual(PATTERNS[id]);
    });

    it.each(pitchClasses)("on pitch class %i uses each letter at most once", (pc) => {
      const scale = scaleOnPitchClass(pc, id);
      const letters = scale.tones.map((t) => t.note.letter);
      // The blues scales have both ♭3 and 3, or ♭5 and 5, on one letter.
      const distinct = id.endsWith("Blues") ? 5 : letters.length;
      expect(new Set(letters).size).toBe(distinct);
    });

    it.each(pitchClasses)(
      "on pitch class %i spells the tonic with at most one accidental",
      (pc) => {
        expect(Math.abs(scaleOnPitchClass(pc, id).tonic.accidental)).toBeLessThanOrEqual(1);
      },
    );
  });

  it("spells the modes the way a musician would", () => {
    const spell = (pc: number, id: ScaleId) =>
      scaleOnPitchClass(pc, id)
        .tones.map((t) => formatNoteAscii(t.note))
        .join(" ");
    expect(spell(2, "dorian")).toBe("D E F G A B C");
    expect(spell(4, "phrygian")).toBe("E F G A B C D");
    expect(spell(5, "lydian")).toBe("F G A B C D E");
    expect(spell(7, "mixolydian")).toBe("G A B C D E F");
    expect(spell(11, "locrian")).toBe("B C D E F G A");
    expect(spell(9, "harmonicMinor")).toBe("A B C D E F G#");
    expect(spell(9, "melodicMinor")).toBe("A B C D E F# G#");
    expect(spell(3, "harmonicMinor")).toBe("Eb F Gb Ab Bb Cb D");
    expect(spell(7, "dorian")).toBe("G A Bb C D E F");
    expect(spell(0, "majorPentatonic")).toBe("C D E G A");
    expect(spell(9, "minorPentatonic")).toBe("A C D E G");
    expect(spell(9, "minorBlues")).toBe("A C D Eb E G");
    expect(spell(0, "majorBlues")).toBe("C D Eb E G A");
  });

  it("spells a tonic on a black key with the fewest accidentals", () => {
    const tonic = (pc: number, id: ScaleId) => formatNote(scaleOnPitchClass(pc, id).tonic);
    expect(tonic(1, "dorian")).toBe("C♯");
    expect(tonic(3, "dorian")).toBe("E♭");
    expect(tonic(1, "mixolydian")).toBe("D♭");
    expect(tonic(8, "harmonicMinor")).toBe("A♭");
    expect(tonic(6, "majorPentatonic")).toBe("F♯");
  });

  it("names the scales for a picker", () => {
    expect(scaleLabel(SCALES.major)).toBe("Major (Ionian)");
    expect(scaleLabel(SCALES.naturalMinor)).toBe("Natural minor (Aeolian)");
    expect(scaleLabel(SCALES.dorian)).toBe("Dorian");
  });

  it("labels the blue note", () => {
    const labels = scaleOnPitchClass(0, "minorBlues").tones.map(scaleToneLabel);
    expect(labels).toEqual([
      "Tonic",
      "Minor third",
      "Perfect fourth",
      "Diminished fifth",
      "Perfect fifth",
      "Minor seventh",
    ]);
  });
});

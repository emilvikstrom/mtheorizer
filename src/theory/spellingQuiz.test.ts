import { describe, expect, it } from "vitest";
import { CHORD_QUALITIES, CHORD_QUALITY_IDS, buildChord } from "./chords";
import { type Note, formatNote, mod12, note, noteEquals, parseNote, pitchClass } from "./notes";
import { SCALES, buildScale } from "./scales";
import {
  ALL_SPELLING_GROUPS,
  type SpellingQuestion,
  allSpellings,
  expectedNotes,
  gradeSpelling,
  parseSpelledNotes,
  spellingDeck,
  spellingQuestions,
  spellingRoots,
  spellingTitle,
} from "./spellingQuiz";

const names = (notes: readonly Note[]) => notes.map(formatNote);

const chord = (root: string, qualityId: Parameters<typeof buildChord>[1]): SpellingQuestion => ({
  kind: "chord",
  group: CHORD_QUALITIES[qualityId].group,
  root: parseNote(root),
  qualityId,
});

describe("spellingRoots", () => {
  it("are the seven white keys, five sharps and five flats", () => {
    expect(spellingRoots().map(formatNote).sort()).toEqual(
      [
        "C",
        "C♯",
        "D♭",
        "D",
        "D♯",
        "E♭",
        "E",
        "F",
        "F♯",
        "G♭",
        "G",
        "G♯",
        "A♭",
        "A",
        "A♯",
        "B♭",
        "B",
      ].sort(),
    );
  });

  it("cover all 12 pitch classes", () => {
    expect(new Set(spellingRoots().map(pitchClass)).size).toBe(12);
  });
});

describe("spellingQuestions", () => {
  it("asks every quality on every root, and every scale on every root", () => {
    const all = spellingQuestions();
    for (const root of spellingRoots()) {
      for (const id of ["major", "minor", "major7", "minor7", "dominant7"] as const) {
        expect(
          all.some((q) => q.kind === "chord" && q.qualityId === id && noteEquals(q.root, root)),
        ).toBe(true);
      }
      expect(
        all.some((q) => q.kind === "scale" && q.scaleId === "dorian" && noteEquals(q.tonic, root)),
      ).toBe(true);
    }
  });

  it("only asks what can be answered: no tone needs more than two accidentals", () => {
    for (const q of spellingQuestions()) {
      const { required, optional } = expectedNotes(q);
      for (const n of [...required, ...optional])
        expect(Math.abs(n.accidental)).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the questions of the chosen groups only", () => {
    const triads = spellingQuestions(["triads"]);
    expect(triads.length).toBeGreaterThan(0);
    expect(triads.every((q) => q.kind === "chord" && q.group === "triads")).toBe(true);
    const scales = spellingQuestions(["scales"]);
    expect(scales.every((q) => q.kind === "scale")).toBe(true);
    expect(new Set(spellingQuestions().map((q) => q.group))).toEqual(new Set(ALL_SPELLING_GROUPS));
  });

  it("asks every quality at least on the white keys", () => {
    for (const id of CHORD_QUALITY_IDS) {
      expect(
        spellingQuestions().some(
          (q) => q.kind === "chord" && q.qualityId === id && noteEquals(q.root, note("C")),
        ),
      ).toBe(true);
    }
  });
});

describe("spellingTitle", () => {
  it.each([
    [chord("Eb", "minor7"), "E♭m7"],
    [chord("F#", "major"), "F♯"],
    [chord("Bb", "dominant7"), "B♭7"],
    [
      { kind: "scale", group: "scales", tonic: note("D"), scaleId: "dorian" } as const,
      "D Dorian scale",
    ],
  ] as const)("%j is asked as %s", (q, text) => {
    expect(spellingTitle(q)).toBe(text);
  });
});

describe("gradeSpelling", () => {
  const eFlatMinor7 = chord("Eb", "minor7");

  it("accepts the right spelling in any order", () => {
    expect(gradeSpelling(eFlatMinor7, ["Db", "Bb", "Gb", "Eb"].map(parseNote)).right).toBe(true);
    expect(gradeSpelling(eFlatMinor7, ["Gb", "Eb", "Db", "Bb", "Eb"].map(parseNote)).right).toBe(
      true,
    );
  });

  it("counts the right pitch class with the wrong spelling as wrong", () => {
    const grade = gradeSpelling(eFlatMinor7, ["D#", "G♭", "B♭", "D♭"].map(parseNote));
    expect(grade.right).toBe(false);
    expect(names(grade.wrong)).toEqual(["D♯"]);
    expect(names(grade.missing)).toEqual(["E♭"]);
  });

  it("names the tones that are missing and those that do not belong", () => {
    const grade = gradeSpelling(eFlatMinor7, ["Eb", "Gb", "Bb", "C"].map(parseNote));
    expect(names(grade.missing)).toEqual(["D♭"]);
    expect(names(grade.wrong)).toEqual(["C"]);
  });

  it("lets a chord leave out its optional tones, but not its other tones", () => {
    const withoutFifth = ["Eb", "Gb", "Db"].map(parseNote);
    expect(gradeSpelling(eFlatMinor7, withoutFifth).right).toBe(true);
    expect(gradeSpelling(eFlatMinor7, ["Eb", "Bb", "Db"].map(parseNote)).right).toBe(false);
  });

  it("accepts a scale only when it is complete", () => {
    const q: SpellingQuestion = {
      kind: "scale",
      group: "scales",
      tonic: note("F", 1),
      scaleId: "major",
    };
    const scale = buildScale(note("F", 1), SCALES.major);
    expect(gradeSpelling(q, scale).right).toBe(true);
    expect(gradeSpelling(q, scale.slice(1)).right).toBe(false);
    // G♭ major sounds the same but is another spelling.
    expect(gradeSpelling(q, buildScale(note("G", -1), SCALES.major)).right).toBe(false);
  });

  it("is right for the notes of every question and wrong when any tone is respelled", () => {
    for (const q of spellingQuestions()) {
      const { required } = expectedNotes(q);
      expect(gradeSpelling(q, required).right).toBe(true);
      const [first] = required;
      if (!first) continue;
      const other = allSpellings(pitchClass(first)).find((n) => !noteEquals(n, first));
      if (!other) continue;
      const respelled = [other, ...required.slice(1)];
      expect(gradeSpelling(q, respelled).right).toBe(false);
    }
  });
});

describe("expectedNotes", () => {
  it.each([
    [chord("Eb", "minor7"), ["E♭", "G♭", "D♭"], ["B♭"]],
    [chord("C", "major"), ["C", "E", "G"], []],
    [chord("D#", "augmented"), ["D♯", "F𝄪", "A𝄪"], []],
  ] as const)("%j needs %j and may leave out %j", (q, required, optional) => {
    const expected = expectedNotes(q);
    expect(names(expected.required).sort()).toEqual([...required].sort());
    expect(names(expected.optional)).toEqual([...optional]);
  });
});

describe("allSpellings", () => {
  it.each(Array.from({ length: 12 }, (_, pc) => pc))("lists spellings of pitch class %i", (pc) => {
    const spellings = allSpellings(pc);
    // Every key has at least a sharp and a flat name, or a natural one with two others.
    expect(spellings.length).toBeGreaterThanOrEqual(2);
    for (const n of spellings) {
      expect(mod12(pitchClass(n))).toBe(pc);
      expect(Math.abs(n.accidental)).toBeLessThanOrEqual(2);
    }
    // Naturals first, then one sharp, one flat, and the double accidentals.
    expect(spellings.map((n) => Math.abs(n.accidental))).toEqual(
      [...spellings.map((n) => Math.abs(n.accidental))].sort((a, b) => a - b),
    );
  });

  it("gives the white keys their other names", () => {
    expect(allSpellings(4).map(formatNote)).toEqual(["E", "F♭", "D𝄪"]);
    expect(allSpellings(11).map(formatNote)).toEqual(["B", "C♭", "A𝄪"]);
    expect(allSpellings(1).map(formatNote)).toEqual(["C♯", "D♭", "B𝄪"]);
  });
});

describe("parseSpelledNotes", () => {
  it.each([
    ["Eb G Bb", ["E♭", "G", "B♭"]],
    ["E♭, G, B♭", ["E♭", "G", "B♭"]],
    ["f# a# c#", ["F♯", "A♯", "C♯"]],
    ["F𝄪 B𝄫", ["F𝄪", "B𝄫"]],
    ["Bb;Bbb", ["B♭", "B𝄫"]],
  ])("reads %s", (text, expected) => {
    expect(parseSpelledNotes(text)?.map(formatNote)).toEqual(expected);
  });

  it.each(["", "  ", "H", "Eb x", "E-flat"])("rejects %j", (text) => {
    expect(parseSpelledNotes(text)).toBeUndefined();
  });
});

describe("spellingDeck", () => {
  it("is the same for the same seed and different for another", () => {
    const key = (seed: number) => spellingDeck(seed).slice(0, 20).map(spellingTitle);
    expect(key(7)).toEqual(key(7));
    expect(key(7)).not.toEqual(key(8));
  });

  it("holds every question once", () => {
    expect(spellingDeck(3).map(spellingTitle).sort()).toEqual(
      spellingQuestions().map(spellingTitle).sort(),
    );
  });

  it("holds only the chosen groups", () => {
    expect(spellingDeck(3, ["scales"]).every((q) => q.kind === "scale")).toBe(true);
  });
});

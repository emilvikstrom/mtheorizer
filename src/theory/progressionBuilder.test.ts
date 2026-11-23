import { describe, expect, it } from "vitest";
import {
  type BuilderChord,
  MAX_BUILDER_CHORDS,
  addBuilderChord,
  builderChord,
  builderChords,
  commonSpellings,
  formatBuilderChords,
  key,
  moveBuilderChord,
  note,
  parseBuilderChords,
  pitchClass,
  removeBuilderChord,
  keysAt,
  circlePosition,
  formatNote,
  keyTonality,
  PROGRESSIONS,
  PROGRESSION_IDS,
  builderStepsFor,
  progressionChords,
  tonality,
  TONALITY_IDS,
  tonalitySpellings,
} from "./index";

const triad = (degree: number): BuilderChord => ({ degree, size: "triad" });
const seventh = (degree: number): BuilderChord => ({ degree, size: "seventh" });

/** Every key of the circle in both modes (all spellings), as the builder offers them. */
const KEYS = (["major", "minor"] as const).flatMap((mode) =>
  Array.from({ length: 12 }, (_, pc) => pc).flatMap((pc) =>
    commonSpellings(pc)
      .map((tonic) => key(tonic, mode))
      .filter((k) =>
        keysAt(circlePosition(k), mode).some((c) => formatNote(c.tonic) === formatNote(k.tonic)),
      )
      .map((k) => ({ ...keyTonality(k), mode })),
  ),
);

/** Every tonality on every readable tonic. */
const TONALITIES = TONALITY_IDS.flatMap((id) =>
  Array.from({ length: 12 }, (_, pc) =>
    tonalitySpellings(pc, id).map((n) => tonality(n, id)),
  ).flat(),
);

describe("builderChord", () => {
  it("spells I–V–vi–IV in A♭ major as A♭–E♭–Fm–D♭", () => {
    const k = tonality(note("A", -1), "major");
    const symbols = builderChords(k, [1, 5, 6, 4].map(triad)).map((c) => c.chord.symbol);
    expect(symbols).toEqual(["A♭", "E♭", "Fm", "D♭"]);
  });

  it("gives step numbers and sevenths", () => {
    const c = tonality(note("C"), "major");
    expect(builderChords(c, [2, 5, 1].map(seventh)).map((x) => x.step.roman)).toEqual([
      "ii7",
      "V7",
      "Imaj7",
    ]);
    expect(builderChord(c, seventh(5)).chord.symbol).toBe("G7");
    expect(builderChord(c, triad(7)).step.roman).toBe("vii°");
  });

  it.each(TONALITIES)("builds all seven triads and sevenths of $tonic.letter $scale", (k) => {
    for (let degree = 1; degree <= 7; degree++) {
      const t = builderChord(k, triad(degree));
      const s = builderChord(k, seventh(degree));
      // The chord is built on the scale degree and the seventh chord extends the triad.
      expect(formatNote(t.chord.root)).toBe(formatNote(s.chord.root));
      expect(t.chord.tones).toHaveLength(3);
      expect(s.chord.tones).toHaveLength(4);
      expect(t.chord.tones.map((x) => pitchClass(x.note))).toEqual(
        s.chord.tones.slice(0, 3).map((x) => pitchClass(x.note)),
      );
      expect(t.step.degree).toBe(degree);
    }
  });

  it("builds on the same degrees in every key", () => {
    for (const k of KEYS) {
      const romans = builderChords(k, [1, 2, 3, 4, 5, 6, 7].map(triad)).map((c) => c.step.roman);
      expect(romans).toEqual(
        k.mode === "major"
          ? ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
          : ["i", "ii°", "♭III", "iv", "v", "♭VI", "♭VII"],
      );
    }
  });

  it("builds from a mode: D dorian has a major IV", () => {
    const d = tonality(note("D"), "dorian");
    expect(builderChords(d, [1, 4, 7].map(triad)).map((c) => c.chord.symbol)).toEqual([
      "Dm",
      "G",
      "C",
    ]);
    expect(builderChords(d, [1, 4].map(seventh)).map((c) => c.step.roman)).toEqual(["i7", "IV7"]);
  });
});

describe("builderStepsFor", () => {
  it("turns a progression of the tonality's own chords into builder chords", () => {
    expect(builderStepsFor(PROGRESSIONS.pop)).toEqual([1, 5, 6, 4].map(triad));
    expect(builderStepsFor(PROGRESSIONS.twoFiveOne)).toEqual([2, 5, 1].map(seventh));
    expect(builderStepsFor(PROGRESSIONS.dorianVamp)).toEqual([1, 4].map(seventh));
    expect(builderStepsFor(PROGRESSIONS.blues)).toBeUndefined();
    expect(builderStepsFor(PROGRESSIONS.heroic)).toBeUndefined();
  });

  it.each(PROGRESSION_IDS.filter((id) => builderStepsFor(PROGRESSIONS[id])))(
    "%s: the builder gives the same chords on every tonic",
    (id) => {
      const progression = PROGRESSIONS[id];
      const steps = builderStepsFor(progression) ?? [];
      for (const t of TONALITIES.filter((x) => x.scale === progression.tonality)) {
        expect(builderChords(t, steps).map((c) => c.chord.symbol)).toEqual(
          progressionChords(progression, t).map((c) => c.chord.symbol),
        );
      }
    },
  );
});

describe("editing", () => {
  const list = [triad(1), triad(5), triad(6)];

  it("adds to the end and stops at the limit", () => {
    expect(addBuilderChord(list, triad(4))).toEqual([...list, triad(4)]);
    let full: readonly BuilderChord[] = [];
    for (let i = 0; i < MAX_BUILDER_CHORDS + 3; i++) full = addBuilderChord(full, triad(1));
    expect(full).toHaveLength(MAX_BUILDER_CHORDS);
  });

  it("removes by position and leaves the rest in order", () => {
    expect(removeBuilderChord(list, 1)).toEqual([triad(1), triad(6)]);
    expect(removeBuilderChord(list, 9)).toEqual(list);
  });

  it("moves a chord earlier or later and ignores moves off the ends", () => {
    expect(moveBuilderChord(list, 2, -1)).toEqual([triad(1), triad(6), triad(5)]);
    expect(moveBuilderChord(list, 0, 1)).toEqual([triad(5), triad(1), triad(6)]);
    expect(moveBuilderChord(list, 0, -1)).toEqual(list);
    expect(moveBuilderChord(list, 2, 1)).toEqual(list);
    expect(moveBuilderChord(list, 5, 1)).toEqual(list);
  });

  it("does not change the list it was given", () => {
    const copy = [...list];
    addBuilderChord(list, triad(2));
    removeBuilderChord(list, 0);
    moveBuilderChord(list, 0, 1);
    expect(list).toEqual(copy);
  });
});

describe("text form", () => {
  it("round-trips", () => {
    const list = [triad(1), seventh(5), triad(6), seventh(2)];
    expect(formatBuilderChords(list)).toBe("1,5s,6,2s");
    expect(parseBuilderChords("1,5s,6,2s")).toEqual(list);
    expect(parseBuilderChords("")).toEqual([]);
  });

  it("rejects anything that is not a list of chords", () => {
    for (const text of ["0", "8", "1,", ",1", "1,,2", "x", "1s7", "1 ,2", "11", "-1", "1S"]) {
      expect(parseBuilderChords(text), text).toBeUndefined();
    }
    expect(
      parseBuilderChords(
        Array(MAX_BUILDER_CHORDS + 1)
          .fill("1")
          .join(","),
      ),
    ).toBeUndefined();
    expect(parseBuilderChords(Array(MAX_BUILDER_CHORDS).fill("1").join(","))).toHaveLength(
      MAX_BUILDER_CHORDS,
    );
  });
});

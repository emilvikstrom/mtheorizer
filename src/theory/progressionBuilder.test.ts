import { describe, expect, it } from "vitest";
import {
  type BuilderChord,
  type BuilderSize,
  borrowedChords,
  borrowedDegrees,
  builderIdeas,
  builderSourceText,
  fitBuilderChords,
  fitsBuilder,
  isReadableTonic,
  secondaryDominants,
  secondaryTargets,
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
const borrowed = (degree: number, size: BuilderSize = "triad"): BuilderChord => ({
  degree,
  size,
  from: "borrowed",
});
const secondary = (degree: number): BuilderChord => ({
  degree,
  size: "seventh",
  from: "secondary",
});

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
  });

  it("borrows the ♭VI and ♭VII of a major key, and the minor iv7", () => {
    expect(builderStepsFor(PROGRESSIONS.heroic)).toEqual([
      triad(1),
      borrowed(6),
      borrowed(7),
      triad(1),
    ]);
    expect(builderStepsFor(PROGRESSIONS.backdoor)).toEqual([
      borrowed(4, "seventh"),
      borrowed(7, "seventh"),
      seventh(1),
    ]);
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

  it("writes borrowed chords with b and secondary dominants as v5/ and their target", () => {
    const list = [triad(1), borrowed(6), secondary(2), borrowed(7, "seventh"), seventh(5)];
    expect(formatBuilderChords(list)).toBe("1,b6,v5/2,b7s,5s");
    expect(parseBuilderChords("1,b6,v5/2,b7s,5s")).toEqual(list);
    for (let degree = 1; degree <= 7; degree++) {
      for (const item of [borrowed(degree), borrowed(degree, "seventh")]) {
        expect(parseBuilderChords(formatBuilderChords([item]))).toEqual([item]);
      }
      if (degree > 1) {
        expect(parseBuilderChords(formatBuilderChords([secondary(degree)]))).toEqual([
          secondary(degree),
        ]);
      }
    }
  });

  it("rejects anything that is not a list of chords", () => {
    for (const text of [
      "0",
      "8",
      "1,",
      ",1",
      "1,,2",
      "x",
      "1s7",
      "1 ,2",
      "11",
      "-1",
      "1S",
      "b",
      "b8",
      "bb6",
      "B6",
      "v5/1",
      "v5/8",
      "v4/2",
      "v5/2s",
      "v5",
      "v/2",
    ]) {
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

describe("borrowed chords and secondary dominants", () => {
  it("borrows ♭VI and ♭VII from C minor into C major", () => {
    const c = tonality(note("C"), "major");
    const chords = builderChords(c, [borrowed(6), borrowed(7), borrowed(4), borrowed(2)]);
    expect(chords.map((x) => x.chord.symbol)).toEqual(["A♭", "B♭", "Fm", "D°"]);
    expect(chords.map((x) => x.step.roman)).toEqual(["♭VI", "♭VII", "iv", "ii°"]);
    expect(chords[0]?.step.alter).toBe(-1);
    expect(builderChord(c, borrowed(7, "seventh")).chord.symbol).toBe("B♭7");
    expect(builderSourceText(c, borrowed(6))).toBe("borrowed from C minor");
  });

  it("borrows the major I, ii and IV from C major into C minor", () => {
    const c = tonality(note("C"), "naturalMinor");
    expect(borrowedDegrees(c)).toEqual([1, 2, 4]);
    const chords = builderChords(c, [borrowed(1), borrowed(2), borrowed(4)]);
    expect(chords.map((x) => x.chord.symbol)).toEqual(["C", "Dm", "F"]);
    // The root stays: only the third is raised.
    expect(chords[0]?.step.alter).toBeUndefined();
    expect(builderSourceText(c, borrowed(4))).toBe("borrowed from C major");
  });

  it("gives the secondary dominants of C major", () => {
    const c = tonality(note("C"), "major");
    expect(secondaryTargets(c)).toEqual([2, 3, 4, 5, 6]);
    const chords = builderChords(c, [2, 3, 4, 5, 6].map(secondary));
    expect(chords.map((x) => x.chord.symbol)).toEqual(["A7", "B7", "C7", "D7", "E7"]);
    expect(chords.map((x) => x.step.roman)).toEqual(["V7/ii", "V7/iii", "V7/IV", "V7/V", "V7/vi"]);
    expect(builderSourceText(c, secondary(5))).toBe("secondary dominant of G");
  });

  it.each(KEYS)(
    "matches the key panel's borrowed chords and secondary dominants in $tonic.letter $mode",
    (t) => {
      const k = key(t.tonic, t.mode);
      const borrowedHere = borrowedChords(k);
      expect(borrowedDegrees(t)).toEqual(borrowedHere.map((b) => b.degree));
      for (const b of borrowedHere) {
        const built = builderChord(t, borrowed(b.degree));
        expect(built.chord.symbol).toBe(b.symbol);
        expect(built.chord.tones.map((x) => formatNote(x.note))).toEqual(b.notes.map(formatNote));
        // The seventh chord extends the borrowed triad.
        const ext = builderChord(t, borrowed(b.degree, "seventh")).chord;
        expect(ext.tones.slice(0, 3).map((x) => formatNote(x.note))).toEqual(
          b.notes.map(formatNote),
        );
      }
      const dominants = secondaryDominants(k);
      expect(secondaryTargets(t)).toEqual(dominants.map((d) => d.target));
      for (const d of dominants) {
        const built = builderChord(t, secondary(d.target));
        expect(built.chord.symbol).toBe(d.symbol);
        expect(built.chord.tones.map((x) => formatNote(x.note))).toEqual(d.notes.map(formatNote));
        expect(built.step.quality).toBe("dominant7");
        expect(built.step.roman).toMatch(/^V7\//);
        // The chord it points at sits a fifth below.
        const target = builderChord(t, triad(d.target)).chord.root;
        expect((pitchClass(built.chord.root) - pitchClass(target) + 12) % 12).toBe(7);
      }
    },
  );

  it.each(TONALITIES)("secondary dominants point a fifth down in $tonic.letter $scale", (t) => {
    for (const target of secondaryTargets(t)) {
      const built = builderChord(t, secondary(target)).chord;
      const goal = builderChord(t, triad(target)).chord.root;
      expect((pitchClass(built.root) - pitchClass(goal) + 12) % 12).toBe(7);
      expect(formatNote(built.root)).not.toMatch(/𝄫|𝄪/);
    }
  });

  it("has no borrowed chords in a mode, and drops them when the tonality changes", () => {
    const d = tonality(note("D"), "dorian");
    expect(borrowedDegrees(d)).toEqual([]);
    expect(fitsBuilder(d, borrowed(6))).toBe(false);
    expect(() => builderChord(d, borrowed(6))).toThrow();
    // Dorian has a major IV and a minor v: both can be tonicised, the diminished vi° cannot.
    expect(secondaryTargets(d)).toEqual([2, 3, 4, 5, 7]);
    expect(fitBuilderChords(d, [triad(1), borrowed(6), secondary(4), secondary(6)])).toEqual([
      triad(1),
      secondary(4),
    ]);
    // Nothing points at the tonic.
    expect(fitsBuilder(tonality(note("C"), "major"), secondary(1))).toBe(false);
  });

  it("suggests the target after a secondary dominant and a way home after a borrowed chord", () => {
    const c = tonality(note("C"), "major");
    expect(builderIdeas(c, secondary(2))).toEqual([
      { degree: 2, reason: "fifthDown" },
      { degree: 1, reason: "home" },
    ]);
    // ♭VII (B♭) has no chord of C major a fifth below it, so only home.
    expect(builderIdeas(c, borrowed(7))).toEqual([{ degree: 1, reason: "home" }]);
    // ii° (D°) falls a fifth to G.
    expect(builderIdeas(c, borrowed(2))[0]).toEqual({ degree: 5, reason: "fifthDown" });
    // The major IV of C minor (F) falls a fifth to B♭.
    expect(builderIdeas(tonality(note("C"), "naturalMinor"), borrowed(4))[0]).toEqual({
      degree: 7,
      reason: "fifthDown",
    });
    // A diatonic chord is as before.
    expect(builderIdeas(c, triad(5))[0]).toEqual({ degree: 1, reason: "fifthDown" });
  });

  it("offers both C♯ major and D♭ major, as the ready-made progressions do", () => {
    expect(isReadableTonic(note("C", 1), "major")).toBe(true);
    expect(isReadableTonic(note("D", -1), "major")).toBe(true);
    const sharp = builderChords(tonality(note("C", 1), "major"), [triad(1), borrowed(6)]);
    const flat = builderChords(tonality(note("D", -1), "major"), [triad(1), borrowed(6)]);
    expect(sharp.map((x) => x.chord.symbol)).toEqual(["C♯", "A"]);
    expect(flat.map((x) => x.chord.symbol)).toEqual(["D♭", "B𝄫"]);
  });
});

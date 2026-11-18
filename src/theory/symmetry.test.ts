import { describe, expect, it } from "vitest";
import {
  CHORD_QUALITIES,
  CHORD_QUALITY_IDS,
  SCALES,
  type ChordQualityId,
  type Note,
  type ScaleId,
  buildChord,
  chordOnPitchClass,
  enharmonicChords,
  enharmonicRoots,
  enharmonicTonics,
  formatNoteAscii,
  isSymmetricChord,
  pitchClass,
  scaleOnPitchClass,
  scaleTranspositions,
  spellScale,
  symmetryPeriod,
} from ".";

const ROOTS = Array.from({ length: 12 }, (_, pc) => pc);
const C: Note = { letter: "C", accidental: 0 };
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const keysOf = (chord: { tones: readonly { note: Note }[] }) =>
  sorted(chord.tones.map((t) => pitchClass(t.note)));
const names = (notes: Note[]) => notes.map(formatNoteAscii);

describe("symmetryPeriod", () => {
  it.each([
    [[0, 3, 6, 9], 3],
    [[0, 4, 8], 4],
    [[0, 2, 4, 6, 8, 10], 2],
    [[0, 2, 3, 5, 6, 8, 9, 11], 3],
    [[0, 4, 7], 12],
    [[0, 2, 4, 5, 7, 9, 11], 12],
    [[0, 6], 6],
  ])("%j repeats after %i semitones", (pcs, period) => {
    expect(symmetryPeriod(pcs)).toBe(period);
  });

  it("does not depend on the transposition or the order", () => {
    expect(symmetryPeriod([5, 8, 11, 2])).toBe(3);
    expect(symmetryPeriod([9, 3, 0, 6])).toBe(3);
  });
});

describe("enharmonicRoots for chords", () => {
  it.each(ROOTS)("diminished seventh on pitch class %i: four roots, same keys", (pc) => {
    const chord = chordOnPitchClass(pc, "diminished7");
    const roots = enharmonicRoots(chord);
    expect(roots).toHaveLength(4);
    expect(roots[0]).toEqual(chord.root);
    expect(sorted(roots.map(pitchClass))).toEqual(sorted([0, 3, 6, 9].map((n) => (pc + n) % 12)));
    for (const root of roots) {
      expect(keysOf(buildChord(root, "diminished7"))).toEqual(keysOf(chord));
    }
  });

  it.each(ROOTS)("augmented triad on pitch class %i: three roots, same keys", (pc) => {
    const chord = chordOnPitchClass(pc, "augmented");
    const roots = enharmonicRoots(chord);
    expect(roots).toHaveLength(3);
    expect(roots[0]).toEqual(chord.root);
    for (const root of roots) {
      expect(keysOf(buildChord(root, "augmented"))).toEqual(keysOf(chord));
    }
  });

  it("lists C°7 with its three equivalents, each spelled with the fewest accidentals", () => {
    expect(names(enharmonicRoots(buildChord(C, "diminished7")))).toEqual(["C", "D#", "F#", "A"]);
  });

  it("lists C+ with E and A♭", () => {
    expect(names(enharmonicRoots(buildChord(C, "augmented")))).toEqual(["C", "E", "Ab"]);
  });

  it("spells the same keys differently: C°7 has B𝄫, A°7 has A", () => {
    const c = buildChord(C, "diminished7");
    const a = buildChord({ letter: "A", accidental: 0 }, "diminished7");
    expect(names(c.tones.map((t) => t.note))).toEqual(["C", "Eb", "Gb", "Bbb"]);
    expect(names(a.tones.map((t) => t.note))).toEqual(["A", "C", "Eb", "Gb"]);
  });

  it("returns the chords too, the first being the one asked for", () => {
    const chord = buildChord(C, "diminished7");
    const chords = enharmonicChords(chord);
    expect(chords[0]).toBe(chord);
    expect(chords.map((c) => c.symbol)).toEqual(["C°7", "D♯°7", "F♯°7", "A°7"]);
  });

  describe.each(CHORD_QUALITY_IDS)("%s", (id: ChordQualityId) => {
    it.each(ROOTS)("on pitch class %i has equivalents exactly when it is symmetric", (pc) => {
      const chord = chordOnPitchClass(pc, id);
      const roots = enharmonicRoots(chord);
      expect(roots.length > 1).toBe(isSymmetricChord(chord));
      expect(12 % roots.length).toBe(0);
      // Every equivalent root gives the same keys, and no other root does.
      const same = ROOTS.filter(
        (other) =>
          JSON.stringify(keysOf(chordOnPitchClass(other, id))) === JSON.stringify(keysOf(chord)),
      );
      expect(sorted(roots.map(pitchClass))).toEqual(same);
    });
  });

  it("the symmetric qualities are the ones whose tones repeat inside the octave", () => {
    const symmetric = CHORD_QUALITY_IDS.filter((id) => isSymmetricChord(chordOnPitchClass(0, id)));
    expect(symmetric).toEqual(
      CHORD_QUALITY_IDS.filter(
        (id) => symmetryPeriod(CHORD_QUALITIES[id].tones.map((t) => t.interval.semitones)) < 12,
      ),
    );
    expect(symmetric).toContain("diminished7");
    expect(symmetric).toContain("augmented");
  });
});

describe("symmetric scales", () => {
  const ids = Object.keys(SCALES) as ScaleId[];
  const pcsOf = (tonic: Note, id: ScaleId) =>
    sorted(spellScale(tonic, id).tones.map((t) => pitchClass(t.note)));

  it.each([
    ["wholeTone", 2],
    ["diminishedWholeHalf", 3],
    ["diminishedHalfWhole", 3],
    ["major", 12],
    ["altered", 12],
    ["minorBlues", 12],
  ] as const)("%s has %i different transpositions", (id, count) => {
    expect(scaleTranspositions(id)).toBe(count);
  });

  it("finds no symmetry in the other scales", () => {
    const symmetric = ["wholeTone", "diminishedWholeHalf", "diminishedHalfWhole"];
    for (const id of ids.filter((i) => !symmetric.includes(i))) {
      expect(scaleTranspositions(id)).toBe(12);
      expect(enharmonicTonics(scaleOnPitchClass(0, id).tonic, id)).toHaveLength(1);
    }
  });

  it.each(ROOTS)("whole-tone scale on pitch class %i: six tonics, same keys", (pc) => {
    const scale = scaleOnPitchClass(pc, "wholeTone");
    const tonics = enharmonicTonics(scale.tonic, "wholeTone");
    expect(tonics).toHaveLength(6);
    expect(tonics[0]).toEqual(scale.tonic);
    for (const tonic of tonics) {
      expect(pcsOf(tonic, "wholeTone")).toEqual(pcsOf(scale.tonic, "wholeTone"));
    }
  });

  it.each(ROOTS)("diminished scales on pitch class %i: four tonics, same keys", (pc) => {
    for (const id of ["diminishedWholeHalf", "diminishedHalfWhole"] as const) {
      const scale = scaleOnPitchClass(pc, id);
      const tonics = enharmonicTonics(scale.tonic, id);
      expect(tonics).toHaveLength(4);
      for (const tonic of tonics) {
        expect(pcsOf(tonic, id)).toEqual(pcsOf(scale.tonic, id));
      }
    }
  });

  it("lists C whole tone with D, E, G♭, A♭ and B♭", () => {
    expect(names(enharmonicTonics(C, "wholeTone"))).toEqual(["C", "D", "E", "Gb", "Ab", "Bb"]);
  });

  it("spells the new scales the way a musician would", () => {
    const spell = (pc: number, id: ScaleId) =>
      names(scaleOnPitchClass(pc, id).tones.map((t) => t.note)).join(" ");
    expect(spell(0, "wholeTone")).toBe("C D E F# G# Bb");
    expect(spell(0, "diminishedWholeHalf")).toBe("C D Eb F Gb Ab A B");
    expect(spell(0, "diminishedHalfWhole")).toBe("C Db Eb E F# G A Bb");
    expect(spell(7, "diminishedHalfWhole")).toBe("G Ab Bb B C# D E F");
  });

  it("the whole–half scale on a note has the keys of the half–whole scale a whole step up", () => {
    for (const pc of ROOTS) {
      const wh = scaleOnPitchClass(pc, "diminishedWholeHalf");
      const hw = scaleOnPitchClass((pc + 2) % 12, "diminishedHalfWhole");
      expect(pcsOf(wh.tonic, "diminishedWholeHalf")).toEqual(
        pcsOf(hw.tonic, "diminishedHalfWhole"),
      );
    }
  });
});

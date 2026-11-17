import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, buildChord, chordOnPitchClass } from "./chords";
import { type Note, formatNote, note, pitchClass } from "./notes";
import { isDominantSeventh, tritoneSubstitute } from "./tritoneSubstitution";

const names = (notes: readonly Note[]) => notes.map(formatNote).join("–");

// Every dominant seventh (root spelled as the app spells it), its substitute and the tritone they
// share, each as its own chord spells it: [third, seventh].
const TABLE: ReadonlyArray<
  readonly [pc: number, original: string, shared: string, substitute: string, sharedSub: string]
> = [
  [0, "C7", "E–B♭", "F♯7", "A♯–E"],
  [1, "D♭7", "F–C♭", "G7", "B–F"],
  [2, "D7", "F♯–C", "A♭7", "C–G♭"],
  [3, "E♭7", "G–D♭", "A7", "C♯–G"],
  [4, "E7", "G♯–D", "B♭7", "D–A♭"],
  [5, "F7", "A–E♭", "B7", "D♯–A"],
  [6, "F♯7", "A♯–E", "C7", "E–B♭"],
  [7, "G7", "B–F", "D♭7", "F–C♭"],
  [8, "A♭7", "C–G♭", "D7", "F♯–C"],
  [9, "A7", "C♯–G", "E♭7", "G–D♭"],
  [10, "B♭7", "D–A♭", "E7", "G♯–D"],
  [11, "B7", "D♯–A", "F7", "A–E♭"],
];

describe("tritoneSubstitute", () => {
  it.each(TABLE)(
    "pitch class %i: %s → substitute with the shared tritone",
    (pc, original, shared, substitute, sharedSub) => {
      const result = tritoneSubstitute(chordOnPitchClass(pc, "dominant7"));
      expect(result).toBeDefined();
      expect(result?.original.symbol).toBe(original);
      expect(names(result?.shared.original ?? [])).toBe(shared);
      expect(result?.substitute.symbol).toBe(substitute);
      expect(names(result?.shared.substitute ?? [])).toBe(sharedSub);
    },
  );

  it("gives G7 → D♭7 with B–F and F–C♭", () => {
    const result = tritoneSubstitute(buildChord(note("G"), "dominant7"));
    expect(result?.substitute.symbol).toBe("D♭7");
    expect(names(result?.shared.original ?? [])).toBe("B–F");
    expect(names(result?.shared.substitute ?? [])).toBe("F–C♭");
  });

  it.each(TABLE.map(([pc]) => pc))(
    "pitch class %i: the third of one chord is the seventh of the other (same keys)",
    (pc) => {
      const result = tritoneSubstitute(chordOnPitchClass(pc, "dominant7"));
      if (!result) throw new Error("expected a substitute");
      const [third, seventh] = result.shared.original;
      const [subThird, subSeventh] = result.shared.substitute;
      expect(pitchClass(third)).toBe(pitchClass(subSeventh));
      expect(pitchClass(seventh)).toBe(pitchClass(subThird));
      // The roots are a tritone apart, and the substitute of the substitute is the original.
      expect(
        (pitchClass(result.substitute.root) - pitchClass(result.original.root) + 12) % 12,
      ).toBe(6);
      const back = tritoneSubstitute(result.substitute);
      expect(back && pitchClass(back.substitute.root)).toBe(pitchClass(result.original.root));
    },
  );

  it("spells the substitute from its own root whichever way the original is spelled", () => {
    // C♯7 and D♭7 are the same keys; either way the substitute is G7.
    expect(tritoneSubstitute(buildChord(note("C", 1), "dominant7"))?.substitute.symbol).toBe("G7");
    expect(tritoneSubstitute(buildChord(note("D", -1), "dominant7"))?.substitute.symbol).toBe("G7");
  });

  it("has no substitute for anything but a plain dominant seventh", () => {
    for (const id of CHORD_QUALITY_IDS) {
      const chord = buildChord(note("C"), id);
      expect(isDominantSeventh(chord)).toBe(id === "dominant7");
      expect(tritoneSubstitute(chord) !== undefined).toBe(id === "dominant7");
    }
  });
});

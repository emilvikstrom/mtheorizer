import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, buildChord, chordOnPitchClass } from "./chords";
import { type Note, formatNote, note, pitchClass } from "./notes";
import { hasTritoneSubstitute, isDominantSeventh, tritoneSubstitute } from "./tritoneSubstitution";

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
      if (!third || !seventh || !subThird || !subSeventh)
        throw new Error("expected two shared keys");
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

  it("has no substitute for anything but a dominant seventh and its variants", () => {
    for (const id of CHORD_QUALITY_IDS) {
      const chord = buildChord(note("C"), id);
      expect(isDominantSeventh(chord)).toBe(id === "dominant7");
      expect(hasTritoneSubstitute(chord)).toBe(id in VARIANTS);
      expect(tritoneSubstitute(chord) !== undefined).toBe(id in VARIANTS);
    }
  });
});

// The dominant variants and the quality of their substitute.
const VARIANTS: Record<string, string> = {
  dominant7: "dominant7",
  dominant9: "dominant9",
  dominant13: "dominant7Sharp11",
  dominant7Flat9: "dominant7Flat9",
  dominant7Sharp9: "dominant7Sharp9",
  dominant7Sus4: "dominant7Sus4",
};

// Original and substitute symbols for each variant, from every root (pitch class 0–11).
const VARIANT_TABLE: Record<string, ReadonlyArray<readonly [string, string]>> = {
  dominant9: [
    ["C9", "F♯9"],
    ["D♭9", "G9"],
    ["D9", "A♭9"],
    ["E♭9", "A9"],
    ["E9", "B♭9"],
    ["F9", "B9"],
    ["F♯9", "C9"],
    ["G9", "D♭9"],
    ["A♭9", "D9"],
    ["A9", "E♭9"],
    ["B♭9", "E9"],
    ["B9", "F9"],
  ],
  dominant13: [
    ["C13", "F♯7♯11"],
    ["D♭13", "G7♯11"],
    ["D13", "A♭7♯11"],
    ["E♭13", "A7♯11"],
    ["E13", "B♭7♯11"],
    ["F13", "B7♯11"],
    ["F♯13", "C7♯11"],
    ["G13", "D♭7♯11"],
    ["A♭13", "D7♯11"],
    ["A13", "E♭7♯11"],
    ["B♭13", "E7♯11"],
    ["B13", "F7♯11"],
  ],
  dominant7Flat9: [
    ["C7♭9", "F♯7♭9"],
    ["C♯7♭9", "G7♭9"],
    ["D7♭9", "G♯7♭9"],
    ["E♭7♭9", "A7♭9"],
    ["E7♭9", "B♭7♭9"],
    ["F7♭9", "B7♭9"],
    ["F♯7♭9", "C7♭9"],
    ["G7♭9", "C♯7♭9"],
    ["G♯7♭9", "D7♭9"],
    ["A7♭9", "E♭7♭9"],
    ["B♭7♭9", "E7♭9"],
    ["B7♭9", "F7♭9"],
  ],
  dominant7Sharp9: [
    ["C7♯9", "G♭7♯9"],
    ["D♭7♯9", "G7♯9"],
    ["D7♯9", "A♭7♯9"],
    ["E♭7♯9", "A7♯9"],
    ["E7♯9", "B♭7♯9"],
    ["F7♯9", "B7♯9"],
    ["G♭7♯9", "C7♯9"],
    ["G7♯9", "D♭7♯9"],
    ["A♭7♯9", "D7♯9"],
    ["A7♯9", "E♭7♯9"],
    ["B♭7♯9", "E7♯9"],
    ["B7♯9", "F7♯9"],
  ],
  dominant7Sus4: [
    ["C7sus4", "F♯7sus4"],
    ["C♯7sus4", "G7sus4"],
    ["D7sus4", "A♭7sus4"],
    ["E♭7sus4", "A7sus4"],
    ["E7sus4", "B♭7sus4"],
    ["F7sus4", "B7sus4"],
    ["F♯7sus4", "C7sus4"],
    ["G7sus4", "C♯7sus4"],
    ["A♭7sus4", "D7sus4"],
    ["A7sus4", "E♭7sus4"],
    ["B♭7sus4", "E7sus4"],
    ["B7sus4", "F7sus4"],
  ],
};

describe("tritoneSubstitute for the dominant variants", () => {
  for (const [id, rows] of Object.entries(VARIANT_TABLE)) {
    it.each(rows.map((row, pc) => [pc, ...row] as const))(
      `${id}, pitch class %i: %s → %s`,
      (pc, original, substitute) => {
        const result = tritoneSubstitute(chordOnPitchClass(pc, id as never));
        expect(result?.original.symbol).toBe(original);
        expect(result?.substitute.symbol).toBe(substitute);
      },
    );
  }

  it("keeps the colour: the substitute quality, a tritone up, from every root", () => {
    for (const [id, subId] of Object.entries(VARIANTS)) {
      for (let pc = 0; pc < 12; pc++) {
        const result = tritoneSubstitute(chordOnPitchClass(pc, id as never));
        expect(result?.substitute.quality?.id).toBe(subId);
        expect(((result ? pitchClass(result.substitute.root) : 0) - pc + 12) % 12).toBe(6);
      }
    }
  });

  it("lists the keys the chords share, each as its own chord spells them", () => {
    const names9 = (id: Parameters<typeof buildChord>[1]) => {
      const r = tritoneSubstitute(buildChord(note("G"), id));
      return [names(r?.shared.original ?? []), names(r?.shared.substitute ?? [])];
    };
    expect(names9("dominant9")).toEqual(["B–F", "F–C♭"]);
    expect(names9("dominant13")).toEqual(["G–B–F", "F–C♭–G"]);
    // G7♭9 and C♯7♭9 (D♭7♭9) are nearly the same chord: B, D, F and A♭ are all common.
    expect(names9("dominant7Flat9")).toEqual(["B–D–F–A♭", "E♯–G♯–B–D"]);
    expect(names9("dominant7Sus4")).toEqual(["", ""]);
  });

  it("shares exactly the tones of the same pitch class, in both directions", () => {
    for (const id of Object.keys(VARIANTS)) {
      for (let pc = 0; pc < 12; pc++) {
        const r = tritoneSubstitute(chordOnPitchClass(pc, id as never));
        if (!r) throw new Error("expected a substitute");
        const a = r.shared.original.map(pitchClass).sort((x, y) => x - y);
        const b = r.shared.substitute.map(pitchClass).sort((x, y) => x - y);
        expect(a).toEqual(b);
      }
    }
  });
});

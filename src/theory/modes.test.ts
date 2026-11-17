import { describe, expect, it } from "vitest";
import {
  MODE_IDS,
  type ModeId,
  SCALES,
  buildScale,
  circlePosition,
  formatNote,
  keyScale,
  mod12,
  modeKeySignature,
  noteEquals,
  pitchClass,
} from ".";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

/** Per pitch class from C: the mode's tonic, the major key it shares notes with, and its signature. */
const TABLE: Record<ModeId, readonly string[]> = {
  lydian: [
    "C:G 1♯",
    "D♭:A♭ 4♭",
    "D:A 3♯",
    "E♭:B♭ 2♭",
    "E:B 5♯",
    "F:C 0",
    "G♭:D♭ 5♭",
    "G:D 2♯",
    "A♭:E♭ 3♭",
    "A:E 4♯",
    "B♭:F 1♭",
    "B:F♯ 6♯",
  ],
  major: [
    "C:C 0",
    "D♭:D♭ 5♭",
    "D:D 2♯",
    "E♭:E♭ 3♭",
    "E:E 4♯",
    "F:F 1♭",
    "F♯:F♯ 6♯",
    "G:G 1♯",
    "A♭:A♭ 4♭",
    "A:A 3♯",
    "B♭:B♭ 2♭",
    "B:B 5♯",
  ],
  mixolydian: [
    "C:F 1♭",
    "D♭:G♭ 6♭",
    "D:G 1♯",
    "E♭:A♭ 4♭",
    "E:A 3♯",
    "F:B♭ 2♭",
    "F♯:B 5♯",
    "G:C 0",
    "A♭:D♭ 5♭",
    "A:D 2♯",
    "B♭:E♭ 3♭",
    "B:E 4♯",
  ],
  dorian: [
    "C:B♭ 2♭",
    "C♯:B 5♯",
    "D:C 0",
    "E♭:D♭ 5♭",
    "E:D 2♯",
    "F:E♭ 3♭",
    "F♯:E 4♯",
    "G:F 1♭",
    "G♯:F♯ 6♯",
    "A:G 1♯",
    "B♭:A♭ 4♭",
    "B:A 3♯",
  ],
  naturalMinor: [
    "C:E♭ 3♭",
    "C♯:E 4♯",
    "D:F 1♭",
    "E♭:G♭ 6♭",
    "E:G 1♯",
    "F:A♭ 4♭",
    "F♯:A 3♯",
    "G:B♭ 2♭",
    "G♯:B 5♯",
    "A:C 0",
    "B♭:D♭ 5♭",
    "B:D 2♯",
  ],
  phrygian: [
    "C:A♭ 4♭",
    "C♯:A 3♯",
    "D:B♭ 2♭",
    "D♯:B 5♯",
    "E:C 0",
    "F:D♭ 5♭",
    "F♯:D 2♯",
    "G:E♭ 3♭",
    "G♯:E 4♯",
    "A:F 1♭",
    "B♭:G♭ 6♭",
    "B:G 1♯",
  ],
  locrian: [
    "C:D♭ 5♭",
    "C♯:D 2♯",
    "D:E♭ 3♭",
    "D♯:E 4♯",
    "E:F 1♭",
    "F:G♭ 6♭",
    "F♯:G 1♯",
    "G:A♭ 4♭",
    "G♯:A 3♯",
    "A:B♭ 2♭",
    "A♯:B 5♯",
    "B:C 0",
  ],
};

/** How far a mode sits from the major scale around the circle: one more ♯ for lydian, one more ♭ per step darker. */
const CIRCLE_SHIFT: Record<ModeId, number> = {
  lydian: 1,
  major: 0,
  mixolydian: -1,
  dorian: -2,
  naturalMinor: -3,
  phrygian: -4,
  locrian: -5,
};

const describeRow = (mode: ModeId) =>
  PITCH_CLASSES.map((pc) => {
    const { tonic, parent, signature } = modeKeySignature(pc, mode);
    const mark = signature.kind === "sharps" ? "♯" : signature.kind === "flats" ? "♭" : "";
    return `${formatNote(tonic)}:${formatNote(parent.tonic)} ${signature.accidentals.length}${mark}`;
  });

describe("mode key signatures", () => {
  it("lists the seven modes, brightest first", () => {
    expect([...MODE_IDS]).toEqual([
      "lydian",
      "major",
      "mixolydian",
      "dorian",
      "naturalMinor",
      "phrygian",
      "locrian",
    ]);
  });

  it.each(MODE_IDS)("%s: the table on all 12 tonics", (mode) => {
    expect(describeRow(mode)).toEqual(TABLE[mode]);
  });

  it("gives the examples from the plan on C", () => {
    const parentOfC = (mode: ModeId) => formatNote(modeKeySignature(0, mode).parent.tonic);
    expect(parentOfC("lydian")).toBe("G");
    expect(parentOfC("major")).toBe("C");
    expect(parentOfC("mixolydian")).toBe("F");
    expect(parentOfC("dorian")).toBe("B♭");
    expect(parentOfC("naturalMinor")).toBe("E♭");
    expect(parentOfC("phrygian")).toBe("A♭");
    expect(parentOfC("locrian")).toBe("D♭");
  });

  describe.each(MODE_IDS)("%s", (mode) => {
    it.each(PITCH_CLASSES)("on pitch class %i has exactly the notes of its major key", (pc) => {
      const { tonic, parent } = modeKeySignature(pc, mode);
      const own = buildScale(tonic, SCALES[mode]);
      const major = keyScale(parent);
      expect(pitchClass(tonic)).toBe(pc);
      expect(own).toHaveLength(7);
      for (const n of own) {
        expect(major.some((m) => noteEquals(m, n))).toBe(true);
      }
    });

    it.each(PITCH_CLASSES)("on pitch class %i sits on the circle where the shift says", (pc) => {
      const { tonic, parent } = modeKeySignature(pc, mode);
      // Compare with the major scale on the same tonic, whatever its spelling.
      const sameTonicMajor = modeKeySignature(pc, "major").parent;
      expect(pitchClass(tonic)).toBe(pc);
      expect(circlePosition(parent)).toBe(
        mod12(circlePosition(sameTonicMajor) + CIRCLE_SHIFT[mode]),
      );
    });

    it.each(PITCH_CLASSES)("on pitch class %i stays within seven accidentals", (pc) => {
      const { signature } = modeKeySignature(pc, mode);
      expect(signature.accidentals.length).toBeLessThanOrEqual(7);
    });
  });

  it("makes each mode one step darker around the circle: ionian → mixolydian is one flat more", () => {
    // C ionian has none, C mixolydian one flat, C dorian two, down to C locrian with five.
    const flats = MODE_IDS.slice(1).map((mode) => modeKeySignature(0, mode).signature);
    expect(flats.map((s) => `${s.kind}:${s.accidentals.length}`)).toEqual([
      "none:0",
      "flats:1",
      "flats:2",
      "flats:3",
      "flats:4",
      "flats:5",
    ]);
  });
});

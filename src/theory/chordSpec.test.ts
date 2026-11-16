import { describe, expect, it } from "vitest";
import {
  CHORD_BASES,
  CHORD_MODIFIERS,
  type ChordBase,
  type ChordModifier,
  type ChordSpec,
  availableQualities,
  buildChordFromSpec,
  normalizeSpec,
  specOf,
  withBase,
  withQuality,
  withoutQuality,
} from "./chordSpec";
import { CHORD_QUALITY_IDS, buildChord } from "./chords";
import { formatNoteAscii, note, parseNote, pitchClass } from "./notes";

const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].map(parseNote);
const C = note("C", 0);

const spec = (base: ChordBase, ...qualities: ChordModifier[]): ChordSpec => ({ base, qualities });
const spelled = (root: string, s: ChordSpec) =>
  buildChordFromSpec(parseNote(root), s)
    .tones.map((t) => formatNoteAscii(t.note))
    .join(" ");
const pitchClassesOf = (s: ChordSpec) =>
  buildChordFromSpec(C, s).tones.map((t) => pitchClass(t.note));

/** Every spec reachable from a base chord by adding available modifiers one at a time. */
function reachableSpecs(): ChordSpec[] {
  const seen = new Map<string, ChordSpec>();
  const queue: ChordSpec[] = CHORD_BASES.map((base) => spec(base));
  for (let next = queue.pop(); next; next = queue.pop()) {
    const key = `${next.base}:${next.qualities.join(",")}`;
    if (seen.has(key)) continue;
    seen.set(key, next);
    for (const m of availableQualities(next)) queue.push(withQuality(next, m));
  }
  return [...seen.values()];
}

describe("specOf", () => {
  it.each(CHORD_QUALITY_IDS)("%s builds the same tones and roles as the named chord", (id) => {
    expect(normalizeSpec(specOf(id))).toEqual(specOf(id));
    for (const root of ROOTS) {
      expect(buildChordFromSpec(root, specOf(id)).tones).toEqual(buildChord(root, id).tones);
    }
  });

  it("has a unique spec for each of the 43 qualities", () => {
    expect(CHORD_QUALITY_IDS).toHaveLength(43);
    const keys = CHORD_QUALITY_IDS.map((id) => JSON.stringify(specOf(id)));
    expect(new Set(keys).size).toBe(43);
  });

  it("builds every named chord by only choosing among the available modifiers", () => {
    for (const id of CHORD_QUALITY_IDS) {
      const target = specOf(id);
      let current = spec(target.base);
      for (const m of target.qualities) {
        expect(availableQualities(current), `${id}: ${m}`).toContain(m);
        current = withQuality(current, m);
      }
      expect(current).toEqual(target);
    }
  });
});

describe("buildChordFromSpec", () => {
  it("spells free combinations", () => {
    expect(spelled("C", spec("major", "7", "flat5", "flat9"))).toBe("C E Gb Bb Db");
    expect(spelled("Eb", spec("minor", "7", "flat13"))).toBe("Eb Gb Bb Db Cb");
    expect(spelled("F#", spec("major", "7", "13", "flat9"))).toBe("F# A# C# E G D#");
    expect(spelled("C", spec("sus4", "add9"))).toBe("C F G D");
    expect(spelled("C", spec("diminished", "dim7"))).toBe("C Eb Gb Bbb");
  });

  it("gives C° with 7 as Cm7♭5, C+ with 7 as C7♯5 and C+ with maj7 as Cmaj7♯5", () => {
    expect(spelled("C", spec("diminished", "7"))).toBe("C Eb Gb Bb");
    expect(pitchClassesOf(specOf("augmented7"))).toEqual([0, 4, 8, 10]);
    expect(pitchClassesOf(specOf("augmentedMajor7"))).toEqual([0, 4, 8, 11]);
  });

  it("makes the fifth optional only in pure form in chords of four tones or more", () => {
    const fifth = (s: ChordSpec) => buildChordFromSpec(C, s).tones.find((t) => t.role === "fifth");
    expect(fifth(spec("major"))?.optional).toBe(false);
    expect(fifth(spec("power"))?.optional).toBe(false);
    expect(fifth(spec("sus4"))?.optional).toBe(false);
    expect(fifth(spec("major", "7"))?.optional).toBe(true);
    expect(fifth(spec("major", "add2"))?.optional).toBe(true);
    expect(fifth(spec("major", "7", "flat5"))?.optional).toBe(false);
    expect(fifth(spec("augmented", "7"))?.optional).toBe(false);
    expect(fifth(spec("diminished", "dim7"))?.optional).toBe(false);
  });

  it("makes the ninth optional only under 11 and 13, and the eleventh only in minor 13 chords", () => {
    const find = (s: ChordSpec, role: string) =>
      buildChordFromSpec(C, s).tones.find((t) => t.role === role);
    expect(find(spec("major", "7", "9"), "ninth")?.optional).toBe(false);
    expect(find(spec("major", "7", "11"), "ninth")?.optional).toBe(true);
    expect(find(spec("major", "7", "13"), "ninth")?.optional).toBe(true);
    expect(find(spec("major", "7", "13", "flat9"), "ninth")?.optional).toBe(false);
    expect(find(spec("minor", "7", "13"), "eleventh")?.optional).toBe(true);
    expect(find(spec("minor", "7", "11"), "eleventh")?.optional).toBe(false);
    expect(find(spec("major", "7", "13"), "eleventh")).toBeUndefined();
    expect(find(spec("sus4", "7", "13"), "eleventh")).toBeUndefined();
    expect(find(spec("sus2", "7", "13"), "ninth")).toBeUndefined();
    expect(spelled("C", spec("major", "7", "13"))).toBe("C E G Bb D A");
    expect(spelled("C", spec("minor", "7", "13"))).toBe("C Eb G Bb D F A");
  });

  it("never gives two tones the same pitch class, for any reachable spec", () => {
    for (const s of reachableSpecs()) {
      const pcs = pitchClassesOf(s);
      expect(new Set(pcs).size, JSON.stringify(s)).toBe(pcs.length);
    }
  });
});

describe("availableQualities", () => {
  const avail = (base: ChordBase, ...q: ChordModifier[]) => availableQualities(spec(base, ...q));
  const added = ["add2", "add4", "add9", "add11"];

  it("gives C5 no qualities", () => {
    expect(avail("power")).toEqual([]);
  });

  it("offers one seventh at a time", () => {
    for (const base of ["major", "minor", "augmented", "sus2", "sus4"] as const) {
      expect(avail(base)).toEqual(expect.arrayContaining(["7", "maj7"]));
      expect(avail(base)).not.toContain("dim7");
    }
    expect(avail("diminished")).toEqual(expect.arrayContaining(["7", "dim7"]));
    expect(avail("diminished")).not.toContain("maj7");
    for (const s of ["7", "maj7"] as const) {
      expect(avail("major", s)).not.toContain("7");
      expect(avail("major", s)).not.toContain("maj7");
    }
    expect(avail("diminished", "dim7")).not.toContain("7");
  });

  it("offers 6 on C and Cm without a seventh", () => {
    expect(avail("major")).toContain("6");
    expect(avail("minor")).toContain("6");
    for (const base of ["diminished", "augmented", "sus2", "sus4", "power"] as const) {
      expect(avail(base)).not.toContain("6");
    }
    expect(avail("major", "7")).not.toContain("6");
    expect(avail("major", "add9")).not.toContain("6");
  });

  it("offers 9, 11 and 13 after a seventh, and 9 after a sixth", () => {
    expect(avail("major")).not.toContain("9");
    expect(avail("major")).toEqual(expect.arrayContaining(["add9", "add11"]));
    expect(avail("major", "6")).toContain("9");
    expect(avail("major", "6")).not.toContain("11");
    expect(avail("major", "6")).not.toContain("13");
    for (const s of ["7", "maj7"] as const) {
      expect(avail("major", s)).toEqual(expect.arrayContaining(["9", "11", "13"]));
    }
  });

  it("leaves out 11 on Csus4 and 9 on Csus2", () => {
    expect(avail("sus4", "7")).not.toContain("11");
    expect(avail("sus4", "7")).toEqual(expect.arrayContaining(["9", "13"]));
    expect(avail("sus2", "7")).not.toContain("9");
    expect(avail("sus2", "7")).toEqual(expect.arrayContaining(["11", "13"]));
  });

  it("does not offer a lower extension under a higher one", () => {
    expect(avail("major", "7", "9")).toEqual(expect.arrayContaining(["11", "13"]));
    expect(avail("major", "7", "11")).not.toContain("9");
    expect(avail("major", "7", "13")).not.toContain("9");
    expect(avail("major", "7", "13")).not.toContain("11");
  });

  it("offers ♭5 only on C, and not with ♯11", () => {
    expect(avail("major")).toContain("flat5");
    for (const base of ["minor", "diminished", "augmented", "sus2", "sus4", "power"] as const) {
      expect(avail(base)).not.toContain("flat5");
    }
    expect(avail("major", "7", "sharp11")).not.toContain("flat5");
    expect(avail("major", "7", "flat5")).not.toContain("sharp11");
  });

  it("offers the altered tones where they are not the same key as a chord tone", () => {
    const has = (base: ChordBase, m: ChordModifier, ...q: ChordModifier[]) =>
      avail(base, ...q).includes(m);
    for (const base of ["major", "minor", "augmented", "sus4"] as const) {
      expect(has(base, "flat9", "7")).toBe(true);
    }
    for (const base of ["diminished", "sus2"] as const) expect(has(base, "flat9", "7")).toBe(false);
    expect(has("major", "flat9", "maj7")).toBe(false);
    for (const base of ["major", "augmented"] as const) expect(has(base, "sharp9", "7")).toBe(true);
    for (const base of ["minor", "diminished", "sus2", "sus4"] as const) {
      expect(has(base, "sharp9", "7")).toBe(false);
    }
    for (const s of ["7", "maj7"] as const) expect(has("major", "sharp11", s)).toBe(true);
    expect(has("minor", "sharp11", "7")).toBe(false);
    expect(has("major", "sharp11")).toBe(false);
    for (const base of ["major", "minor"] as const) expect(has(base, "flat13", "7")).toBe(true);
    for (const base of ["augmented", "diminished", "sus2", "sus4"] as const) {
      expect(has(base, "flat13", "7")).toBe(false);
    }
    expect(has("major", "flat13", "maj7")).toBe(false);
  });

  it("offers added tones on C and Cm, only add9 on Csus4 and none elsewhere", () => {
    for (const base of ["major", "minor"] as const) {
      expect(avail(base)).toEqual(expect.arrayContaining(added));
    }
    expect(avail("sus4").filter((m) => added.includes(m))).toEqual(["add9"]);
    for (const base of ["diminished", "augmented", "sus2", "power"] as const) {
      expect(avail(base).filter((m) => added.includes(m))).toEqual([]);
    }
    expect(avail("major", "7").filter((m) => added.includes(m))).toEqual([]);
    expect(avail("major", "6").filter((m) => added.includes(m))).toEqual([]);
    expect(avail("major", "add9").filter((m) => added.includes(m))).toEqual([]);
  });

  it("only offers modifiers that are not already set, in canonical order", () => {
    for (const s of reachableSpecs()) {
      const offered = availableQualities(s);
      expect(offered).toEqual(CHORD_MODIFIERS.filter((m) => offered.includes(m)));
      for (const m of offered) expect(s.qualities).not.toContain(m);
    }
  });
});

describe("normalizeSpec", () => {
  it("leaves every reachable spec as it is", () => {
    for (const s of reachableSpecs()) expect(normalizeSpec(s)).toEqual(s);
  });

  it("removes what depended on a removed seventh", () => {
    expect(withoutQuality(spec("major", "7", "9", "flat5"), "7")).toEqual(spec("major", "flat5"));
    for (const dependent of ["9", "11", "13", "flat9", "sharp9", "sharp11", "flat13"] as const) {
      expect(withoutQuality(spec("major", "7", dependent), "7").qualities).toEqual([]);
    }
  });

  it("drops the ninth when the sixth goes, but keeps it when a seventh arrives", () => {
    expect(withoutQuality(spec("major", "6", "9"), "6")).toEqual(spec("major"));
    expect(withQuality(spec("major", "6", "9"), "7")).toEqual(spec("major", "7", "9"));
  });

  it("drops what the new base cannot have, and keeps the rest", () => {
    expect(withBase(spec("major", "7", "flat5", "flat9"), "minor")).toEqual(
      spec("minor", "7", "flat9"),
    );
    expect(withBase(spec("major", "7", "flat13", "flat9"), "augmented")).toEqual(
      spec("augmented", "7", "flat9"),
    );
    expect(withBase(spec("major", "7", "9"), "diminished")).toEqual(spec("diminished", "7", "9"));
    expect(withBase(spec("major", "maj7", "9"), "diminished")).toEqual(spec("diminished"));
    expect(withBase(spec("major", "7", "11"), "sus4")).toEqual(spec("sus4", "7"));
    expect(withBase(spec("major", "7", "9"), "power")).toEqual(spec("power"));
    expect(withBase(spec("major", "add2"), "sus4")).toEqual(spec("sus4"));
  });

  it("lets a higher extension replace a lower one", () => {
    expect(withQuality(spec("major", "7", "9"), "11")).toEqual(spec("major", "7", "11"));
    expect(withQuality(spec("major", "7", "11"), "13")).toEqual(spec("major", "7", "13"));
  });

  it("sorts and de-duplicates modifiers", () => {
    expect(normalizeSpec(spec("major", "flat9", "9", "7", "7"))).toEqual(spec("major", "7", "9"));
  });
});

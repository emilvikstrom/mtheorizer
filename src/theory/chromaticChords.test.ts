import { describe, expect, it } from "vitest";
import { chromaticChords } from "./chromaticChords";
import { type Key, type KeyMode, key, keysAt } from "./keys";
import { type Note, formatNoteAscii, letterIndex, mod12, parseNote, pitchClass } from "./notes";

const k = (tonic: string, mode: KeyMode = "major") => key(parseNote(tonic), mode);
const names = (notes: readonly Note[]) => notes.map(formatNoteAscii).join(" ");
const chord = (key: Key, id: string) => {
  const found = chromaticChords(key).find((c) => c.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

// Every spelling of every key on the circle, major and minor: 12 + 12 and the enharmonic twins.
const ALL_KEYS: Key[] = (["major", "minor"] as const).flatMap((mode) =>
  Array.from({ length: 12 }, (_, position) => keysAt(position, mode)).flat(),
);

describe("chromaticChords", () => {
  it("gives the four chords in a fixed order", () => {
    expect(chromaticChords(k("C")).map((c) => c.id)).toEqual([
      "neapolitan",
      "italian",
      "french",
      "german",
    ]);
  });

  it("spells the chords in C, in major and in minor", () => {
    for (const mode of ["major", "minor"] as const) {
      const c = k("C", mode);
      expect(names(chord(c, "neapolitan").notes)).toBe("F Ab Db");
      expect(chord(c, "neapolitan").symbol).toBe("D♭/F");
      expect(names(chord(c, "italian").notes)).toBe("Ab C F#");
      expect(names(chord(c, "french").notes)).toBe("Ab C D F#");
      expect(names(chord(c, "german").notes)).toBe("Ab C Eb F#");
    }
  });

  it("spells the German sixth with a raised fourth, never a lowered fifth (F♯, not G♭)", () => {
    const german = chord(k("C", "minor"), "german");
    expect(names(german.notes)).toContain("F#");
    expect(names(german.notes)).not.toContain("Gb");
    expect(german.soundsLike?.symbol).toBe("A♭7");
    expect(names(german.soundsLike?.notes ?? [])).toBe("Ab C Eb Gb");
    expect(formatNoteAscii(german.soundsLike?.respelled.here as Note)).toBe("F#");
    expect(formatNoteAscii(german.soundsLike?.respelled.there as Note)).toBe("Gb");
  });

  it("spells the chords in keys with many accidentals", () => {
    // D♭ major: the lowered sixth is B𝄫 and the raised fourth is plain G.
    expect(names(chord(k("Db"), "german").notes)).toBe("Bbb Db Fb G");
    expect(names(chord(k("F#"), "german").notes)).toBe("D F# A B#");
    expect(chord(k("Db"), "neapolitan").symbol).toBe("E𝄫/G♭");
  });

  it("builds the French sixth as a dominant seventh with a flattened fifth", () => {
    const french = chord(k("C"), "french");
    expect(french.soundsLike?.symbol).toBe("D7♭5");
    expect(french.open).toEqual({ root: parseNote("D"), qualityId: "dominant7Flat5" });
    expect(chord(k("C"), "italian").soundsLike).toBeUndefined();
  });

  describe.each(ALL_KEYS.map((key) => [`${formatNoteAscii(key.tonic)} ${key.mode}`, key] as const))(
    "%s",
    (_name, tonic) => {
      const t = tonic.tonic;
      const steps = (n: Note) => (((letterIndex(n.letter) - letterIndex(t.letter)) % 7) + 7) % 7;
      const semis = (n: Note) => mod12(pitchClass(n) - pitchClass(t));
      const chords = chromaticChords(tonic);

      it("puts the Neapolitan sixth on ♭II with its third in the bass", () => {
        const n = chord(tonic, "neapolitan");
        expect(n.notes.map(steps)).toEqual([3, 5, 1]);
        expect(n.notes.map(semis)).toEqual([5, 8, 1]);
        expect(n.bass).toEqual(n.notes[0]);
        expect(n.open?.qualityId).toBe("major");
      });

      it("gives all three augmented sixths ♭6 in the bass and ♯4 above, a letter step from the 5", () => {
        for (const id of ["italian", "french", "german"]) {
          const c = chord(tonic, id);
          expect(semis(c.bass)).toBe(8);
          expect(steps(c.bass)).toBe(5);
          const fourth = c.notes[c.notes.length - 1] as Note;
          expect(semis(fourth)).toBe(6);
          expect(steps(fourth)).toBe(3);
        }
      });

      it("adds the second (French) or the lowered third (German) with the right letters", () => {
        expect(chord(tonic, "italian").notes.map(steps)).toEqual([5, 0, 3]);
        expect(chord(tonic, "french").notes.map(steps)).toEqual([5, 0, 1, 3]);
        expect(chord(tonic, "french").notes.map(semis)).toEqual([8, 0, 2, 6]);
        expect(chord(tonic, "german").notes.map(steps)).toEqual([5, 0, 2, 3]);
        expect(chord(tonic, "german").notes.map(semis)).toEqual([8, 0, 3, 6]);
      });

      it("makes the German sixth sound like a dominant seventh on ♭6", () => {
        const german = chord(tonic, "german");
        const like = german.soundsLike;
        expect(like?.qualityId).toBe("dominant7");
        expect(like?.root).toEqual(german.bass);
        const sounding = (notes: readonly Note[]) => notes.map(pitchClass).sort((a, b) => a - b);
        expect(sounding(like?.notes ?? [])).toEqual(sounding(german.notes));
        // Only the raised fourth is spelled differently: a different letter, the same key.
        expect(like?.respelled.here.letter).not.toBe(like?.respelled.there.letter);
        expect(pitchClass(like?.respelled.here as Note)).toBe(
          pitchClass(like?.respelled.there as Note),
        );
      });

      it("is spelled the same whichever mode the tonic is in", () => {
        const other = key(t, tonic.mode === "major" ? "minor" : "major");
        expect(chromaticChords(other)).toEqual(chords);
      });
    },
  );
});

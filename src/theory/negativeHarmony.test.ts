import { describe, expect, it } from "vitest";
import { type Key, type KeyMode, key, keysAt } from "./keys";
import { negativeChord, negativeDiatonic, negativeNote } from "./negativeHarmony";
import { type Note, formatNoteAscii, mod12, parseNote, pitchClass } from "./notes";

const k = (tonic: string, mode: KeyMode = "major") => key(parseNote(tonic), mode);
const names = (notes: readonly Note[]) => notes.map(formatNoteAscii).join(" ");

// Every spelling of every key on the circle, major and minor: 12 + 12 and the enharmonic twins.
const ALL_KEYS: Key[] = (["major", "minor"] as const).flatMap((mode) =>
  Array.from({ length: 12 }, (_, position) => keysAt(position, mode)).flat(),
);
const CHROMATIC = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"].map(parseNote);
const TWELVE_TONICS = Array.from({ length: 12 }, (_, position) => keysAt(position, "major")[0]!);

describe("negativeNote", () => {
  it("mirrors the notes of C around the axis between E and E♭", () => {
    const c = parseNote("C");
    const mirrored = ["C", "D", "E", "F", "G", "A", "B"].map((n) =>
      formatNoteAscii(negativeNote(c, parseNote(n))),
    );
    expect(mirrored).toEqual(["G", "F", "Eb", "D", "C", "Bb", "Ab"]);
  });

  it("swaps the tonic and the fifth, with the fifth spelled a fifth above", () => {
    for (const { tonic } of ALL_KEYS) {
      const fifth = negativeNote(tonic, tonic);
      expect(pitchClass(fifth)).toBe(mod12(pitchClass(tonic) + 7));
      // Letter steps: a fifth is four letters above the tonic.
      expect(fifth.letter).toBe("CDEFGAB"[("CDEFGAB".indexOf(tonic.letter) + 4) % 7]);
      expect(pitchClass(negativeNote(tonic, fifth))).toBe(pitchClass(tonic));
    }
  });

  it("is its own inverse on pitch classes, for every note in every key", () => {
    for (const { tonic } of ALL_KEYS) {
      for (const source of CHROMATIC) {
        const twice = negativeNote(tonic, negativeNote(tonic, source));
        expect(pitchClass(twice)).toBe(pitchClass(source));
      }
    }
  });

  it("moves each note to the pitch class 7 − offset above the tonic", () => {
    for (const { tonic } of ALL_KEYS) {
      for (const source of CHROMATIC) {
        const offset = mod12(pitchClass(source) - pitchClass(tonic));
        const out = negativeNote(tonic, source);
        expect(mod12(pitchClass(out) - pitchClass(tonic))).toBe(mod12(7 - offset));
      }
    }
  });
});

describe("negativeChord", () => {
  it("turns C major into C minor and G7 into Fm6 in C", () => {
    const c = k("C");
    const major = negativeChord(c, parseNote("C"), "major");
    expect(major.chord.symbol).toBe("Cm");
    expect(names(major.chord.notes)).toBe("G Eb C");

    const g7 = negativeChord(c, parseNote("G"), "dominant7");
    expect(g7.chord.symbol).toBe("Fm6");
    expect(names(g7.chord.notes)).toBe("C Ab F D");
    // The same four notes are also Dm7♭5.
    expect(g7.alsoReads).toContain("Dm7♭5");
  });

  it("turns A minor into A major in A minor", () => {
    const am = negativeChord(k("A", "minor"), parseNote("A"), "minor");
    expect(am.chord.symbol).toBe("A");
    expect(names(am.chord.notes)).toBe("E C# A");
  });
});

describe("negativeDiatonic", () => {
  it("maps the triads of C major", () => {
    const rows = negativeDiatonic(k("C")).map((m) => [m.source.symbol, m.negative.symbol]);
    expect(rows).toEqual([
      ["C", "Cm"],
      ["Dm", "B♭"],
      ["Em", "A♭"],
      ["F", "Gm"],
      ["G", "Fm"],
      ["Am", "E♭"],
      ["B°", "D°"],
    ]);
  });

  it("maps the sevenths of C major, with G7 becoming Fm6", () => {
    const rows = negativeDiatonic(k("C"), "sevenths");
    expect(rows).toHaveLength(7);
    expect(rows[4]?.source.symbol).toBe("G7");
    expect(rows[4]?.negative.symbol).toBe("Fm6");
  });

  it("is the same pattern in every key, transposed (all 12 tonics, major and minor)", () => {
    for (const mode of ["major", "minor"] as const) {
      const base = k("C", mode);
      for (const size of ["triads", "sevenths"] as const) {
        const reference = negativeDiatonic(base, size);
        for (const { tonic } of Array.from({ length: 12 }, (_, p) => keysAt(p, mode)[0]!)) {
          const shift = mod12(pitchClass(tonic) - 0);
          const rows = negativeDiatonic(key(tonic, mode), size);
          expect(rows).toHaveLength(7);
          rows.forEach((row, i) => {
            const ref = reference[i]!;
            expect(row.negative.qualityId).toBe(ref.negative.qualityId);
            expect(pitchClass(row.negative.root)).toBe(
              mod12(pitchClass(ref.negative.root) + shift),
            );
          });
        }
      }
    }
  });

  it("gives every diatonic chord of every spelling a named negative chord", () => {
    for (const keyValue of ALL_KEYS) {
      for (const size of ["triads", "sevenths"] as const) {
        for (const row of negativeDiatonic(keyValue, size)) {
          expect(row.negative.symbol).not.toBe("?");
          expect(row.negative.notes).toHaveLength(row.source.notes.length);
          expect(row.alsoReads.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("mirrors each chord back onto its source when applied twice (pitch classes)", () => {
    for (const { tonic } of TWELVE_TONICS) {
      const keyValue = key(tonic, "major");
      for (const row of negativeDiatonic(keyValue)) {
        const back = row.negative.notes.map((n) => pitchClass(negativeNote(tonic, n)));
        expect(back).toEqual(row.source.notes.map(pitchClass));
      }
    }
  });

  it("spells the notes of the negative chords from the key, with a lowered third and seventh", () => {
    const rows = negativeDiatonic(k("E♭"));
    // I in E♭: E♭–G–B♭ becomes B♭–G♭–E♭ (E♭ minor, with a lowered third).
    expect(names(rows[0]!.negative.notes)).toBe("Bb Gb Eb");
    expect(rows[0]?.negative.symbol).toBe("E♭m");
  });
});

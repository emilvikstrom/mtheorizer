import { describe, expect, it } from "vitest";
import { type Note, formatNote, note, pitchClass } from "./notes";
import {
  PROGRESSIONS,
  PROGRESSION_IDS,
  type ProgressionId,
  progressionChords,
  progressionKey,
  progressionKeyOn,
} from "./progressions";
import { type KeyMode, formatKey, keyScale, keysAt } from "./keys";

const symbols = (id: ProgressionId, tonic: Note) =>
  progressionChords(PROGRESSIONS[id], progressionKeyOn(PROGRESSIONS[id], tonic))
    .map(({ chord }) => chord.symbol)
    .join(" ");

const spelled = (name: string): Note =>
  note(name[0] as "A", name[1] === "♯" ? 1 : name[1] === "♭" ? -1 : 0);

// I–V–vi–IV in every major key on the circle of fifths.
const POP: Record<string, string> = {
  C: "C G Am F",
  G: "G D Em C",
  D: "D A Bm G",
  A: "A E F♯m D",
  E: "E B C♯m A",
  B: "B F♯ G♯m E",
  "C♭": "C♭ G♭ A♭m F♭",
  "F♯": "F♯ C♯ D♯m B",
  "G♭": "G♭ D♭ E♭m C♭",
  "D♭": "D♭ A♭ B♭m G♭",
  "C♯": "C♯ G♯ A♯m F♯",
  "A♭": "A♭ E♭ Fm D♭",
  "E♭": "E♭ B♭ Cm A♭",
  "B♭": "B♭ F Gm E♭",
  F: "F C Dm B♭",
};

// i–♭VI–♭III–♭VII in every minor key on the circle of fifths.
const AEOLIAN: Record<string, string> = {
  A: "Am F C G",
  E: "Em C G D",
  B: "Bm G D A",
  "F♯": "F♯m D A E",
  "C♯": "C♯m A E B",
  "G♯": "G♯m E B F♯",
  "D♯": "D♯m B F♯ C♯",
  "A♯": "A♯m F♯ C♯ G♯",
  "E♭": "E♭m C♭ G♭ D♭",
  "B♭": "B♭m G♭ D♭ A♭",
  "A♭": "A♭m F♭ C♭ G♭",
  F: "Fm D♭ A♭ E♭",
  C: "Cm A♭ E♭ B♭",
  G: "Gm E♭ B♭ F",
  D: "Dm B♭ F C",
};

const allKeys = (mode: KeyMode) =>
  Array.from({ length: 12 }, (_, position) => keysAt(position, mode)).flat();

describe("progression data", () => {
  it("has every progression under its own id, in major or minor", () => {
    for (const id of PROGRESSION_IDS) {
      expect(PROGRESSIONS[id].id).toBe(id);
      expect(PROGRESSIONS[id].steps.length).toBeGreaterThan(0);
    }
    expect(PROGRESSIONS.aeolian.mode).toBe("minor");
    expect(PROGRESSIONS.pop.mode).toBe("major");
  });

  it("writes the 12-bar blues as twelve bars", () => {
    expect(PROGRESSIONS.blues.steps.map((s) => s.roman).join(" ")).toBe(
      "I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7",
    );
  });
});

describe("progressions in every key", () => {
  it("spells I–V–vi–IV in all 15 major keys of the circle", () => {
    const keys = allKeys("major");
    expect(keys).toHaveLength(Object.keys(POP).length);
    for (const k of keys) {
      expect(symbols("pop", k.tonic), formatKey(k)).toBe(POP[formatNote(k.tonic)]);
    }
  });

  it("spells i–♭VI–♭III–♭VII in all 15 minor keys of the circle", () => {
    const keys = allKeys("minor");
    expect(keys).toHaveLength(Object.keys(AEOLIAN).length);
    for (const k of keys) {
      expect(symbols("aeolian", k.tonic), formatKey(k)).toBe(AEOLIAN[formatNote(k.tonic)]);
    }
  });

  it("spells the examples right", () => {
    expect(symbols("pop", spelled("A♭"))).toBe("A♭ E♭ Fm D♭");
    expect(symbols("fifties", spelled("A♭"))).toBe("A♭ Fm D♭ E♭");
    expect(symbols("twoFiveOne", spelled("A♭"))).toBe("B♭m7 E♭7 A♭maj7");
    expect(symbols("pachelbel", spelled("D"))).toBe("D A Bm F♯m G D G A");
    expect(symbols("blues", spelled("E"))).toBe("E7 E7 E7 E7 A7 A7 E7 E7 B7 A7 E7 B7");
  });

  it.each(PROGRESSION_IDS)("%s: the roots are the scale degrees of the key", (id) => {
    const progression = PROGRESSIONS[id];
    for (const k of allKeys(progression.mode)) {
      const kk = progressionKeyOn(progression, k.tonic);
      const scale = keyScale(kk);
      const chords = progressionChords(progression, kk);
      expect(chords).toHaveLength(progression.steps.length);
      for (const { step, chord } of chords) {
        expect(chord.root, `${formatKey(kk)} ${step.roman}`).toEqual(scale[step.degree - 1]);
      }
    }
  });

  it.each(["pop", "fifties", "twoFiveOne", "pachelbel", "aeolian"] as const)(
    "%s: every chord tone is in the key's scale",
    (id) => {
      const progression = PROGRESSIONS[id];
      for (const k of allKeys(progression.mode)) {
        const kk = progressionKeyOn(progression, k.tonic);
        const scale = keyScale(kk).map((n) => formatNote(n));
        for (const { chord } of progressionChords(progression, kk)) {
          for (const tone of chord.tones) {
            expect(scale, `${formatKey(kk)} ${chord.symbol}`).toContain(formatNote(tone.note));
          }
        }
      }
    },
  );
});

describe("progressionKey", () => {
  const names = (id: ProgressionId) =>
    Array.from({ length: 12 }, (_, pc) => formatKey(progressionKey(PROGRESSIONS[id], pc)));

  it("spells a major key with the fewest accidentals", () => {
    expect(names("pop")).toEqual([
      "C major",
      "D♭ major",
      "D major",
      "E♭ major",
      "E major",
      "F major",
      "F♯ major",
      "G major",
      "A♭ major",
      "A major",
      "B♭ major",
      "B major",
    ]);
  });

  it("spells a minor key with the fewest accidentals", () => {
    expect(names("aeolian")).toEqual([
      "C minor",
      "C♯ minor",
      "D minor",
      "E♭ minor",
      "E minor",
      "F minor",
      "F♯ minor",
      "G minor",
      "G♯ minor",
      "A minor",
      "B♭ minor",
      "B minor",
    ]);
  });

  it("is a key on the circle for every pitch class", () => {
    for (const id of PROGRESSION_IDS) {
      const progression = PROGRESSIONS[id];
      for (let pc = 0; pc < 12; pc++) {
        const k = progressionKey(progression, pc);
        expect(pitchClass(k.tonic)).toBe(pc);
        expect(allKeys(progression.mode).map(formatKey)).toContain(formatKey(k));
      }
    }
  });
});

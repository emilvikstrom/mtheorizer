import { describe, expect, it } from "vitest";
import { CADENCES, CADENCE_IDS, cadenceChords } from "./progressions";
import { type KeyMode, formatKey, keysAt } from "./keys";
import { formatNote, pitchClass } from "./notes";

const allKeys = (mode: KeyMode) =>
  Array.from({ length: 12 }, (_, position) => keysAt(position, mode)).flat();

const symbols = (id: (typeof CADENCE_IDS)[number], mode: KeyMode, tonic: string) => {
  const k = allKeys(mode).find((x) => formatNote(x.tonic) === tonic);
  if (!k) throw new Error(`No ${mode} key ${tonic}`);
  return cadenceChords(CADENCES[id], k)
    .map(({ chord }) => chord.symbol)
    .join(" ");
};

// Authentic (V–I / V–i) and deceptive (V–vi / V–♭VI) in every key on the circle.
const AUTHENTIC_MAJOR: Record<string, string> = {
  C: "G C",
  G: "D G",
  D: "A D",
  A: "E A",
  E: "B E",
  B: "F♯ B",
  "C♭": "G♭ C♭",
  "F♯": "C♯ F♯",
  "G♭": "D♭ G♭",
  "D♭": "A♭ D♭",
  "C♯": "G♯ C♯",
  "A♭": "E♭ A♭",
  "E♭": "B♭ E♭",
  "B♭": "F B♭",
  F: "C F",
};
const AUTHENTIC_MINOR: Record<string, string> = {
  A: "E Am",
  E: "B Em",
  B: "F♯ Bm",
  "F♯": "C♯ F♯m",
  "C♯": "G♯ C♯m",
  "G♯": "D♯ G♯m",
  "D♯": "A♯ D♯m",
  "A♯": "E♯ A♯m",
  "E♭": "B♭ E♭m",
  "B♭": "F B♭m",
  "A♭": "E♭ A♭m",
  F: "C Fm",
  C: "G Cm",
  G: "D Gm",
  D: "A Dm",
};
const DECEPTIVE_MAJOR: Record<string, string> = {
  C: "G Am",
  G: "D Em",
  D: "A Bm",
  A: "E F♯m",
  E: "B C♯m",
  B: "F♯ G♯m",
  "C♭": "G♭ A♭m",
  "F♯": "C♯ D♯m",
  "G♭": "D♭ E♭m",
  "D♭": "A♭ B♭m",
  "C♯": "G♯ A♯m",
  "A♭": "E♭ Fm",
  "E♭": "B♭ Cm",
  "B♭": "F Gm",
  F: "C Dm",
};
const DECEPTIVE_MINOR: Record<string, string> = {
  A: "E F",
  E: "B C",
  B: "F♯ G",
  "F♯": "C♯ D",
  "C♯": "G♯ A",
  "G♯": "D♯ E",
  "D♯": "A♯ B",
  "A♯": "E♯ F♯",
  "E♭": "B♭ C♭",
  "B♭": "F G♭",
  "A♭": "E♭ F♭",
  F: "C D♭",
  C: "G A♭",
  G: "D E♭",
  D: "A B♭",
};

describe("cadence data", () => {
  it("has every cadence under its own id with two chords in major and minor", () => {
    for (const id of CADENCE_IDS) {
      expect(CADENCES[id].id).toBe(id);
      expect(CADENCES[id].steps.major).toHaveLength(2);
      expect(CADENCES[id].steps.minor).toHaveLength(2);
      expect(CADENCES[id].description.length).toBeGreaterThan(0);
    }
  });

  it("writes the step numbers of each cadence", () => {
    const romans = (id: (typeof CADENCE_IDS)[number], mode: KeyMode) =>
      CADENCES[id].steps[mode].map((s) => s.roman).join("–");
    expect(CADENCE_IDS.map((id) => romans(id, "major"))).toEqual(["V–I", "IV–I", "I–V", "V–vi"]);
    expect(CADENCE_IDS.map((id) => romans(id, "minor"))).toEqual(["V–i", "iv–i", "i–V", "V–♭VI"]);
  });

  it("ends the half cadence on V and the others on the tonic or its stand-in", () => {
    expect(CADENCES.half.steps.major.at(-1)?.degree).toBe(5);
    expect(CADENCES.half.steps.minor.at(-1)?.degree).toBe(5);
    expect(CADENCES.authentic.steps.major.at(-1)?.degree).toBe(1);
    expect(CADENCES.deceptive.steps.major.at(-1)?.degree).toBe(6);
  });
});

describe("cadences in every key", () => {
  it("spells the authentic cadence in all 15 major and all 15 minor keys", () => {
    expect(allKeys("major")).toHaveLength(15);
    expect(allKeys("minor")).toHaveLength(15);
    for (const k of allKeys("major")) {
      expect(symbols("authentic", "major", formatNote(k.tonic)), formatKey(k)).toBe(
        AUTHENTIC_MAJOR[formatNote(k.tonic)],
      );
    }
    for (const k of allKeys("minor")) {
      expect(symbols("authentic", "minor", formatNote(k.tonic)), formatKey(k)).toBe(
        AUTHENTIC_MINOR[formatNote(k.tonic)],
      );
    }
  });

  it("spells the deceptive cadence in all 15 major and all 15 minor keys", () => {
    for (const k of allKeys("major")) {
      expect(symbols("deceptive", "major", formatNote(k.tonic)), formatKey(k)).toBe(
        DECEPTIVE_MAJOR[formatNote(k.tonic)],
      );
    }
    for (const k of allKeys("minor")) {
      expect(symbols("deceptive", "minor", formatNote(k.tonic)), formatKey(k)).toBe(
        DECEPTIVE_MINOR[formatNote(k.tonic)],
      );
    }
  });

  it("spells the examples right", () => {
    expect(symbols("plagal", "major", "A♭")).toBe("D♭ A♭");
    expect(symbols("half", "major", "A♭")).toBe("A♭ E♭");
    expect(symbols("plagal", "minor", "A")).toBe("Dm Am");
    expect(symbols("half", "minor", "A")).toBe("Am E");
    expect(symbols("authentic", "minor", "A")).toBe("E Am");
  });

  it.each(CADENCE_IDS)(
    "%s: the roots sit at the right distance above the tonic in every key",
    (id) => {
      const SEMITONES: Record<(typeof CADENCE_IDS)[number], Record<KeyMode, number[]>> = {
        authentic: { major: [7, 0], minor: [7, 0] },
        plagal: { major: [5, 0], minor: [5, 0] },
        half: { major: [0, 7], minor: [0, 7] },
        deceptive: { major: [7, 9], minor: [7, 8] },
      };
      for (const mode of ["major", "minor"] as const) {
        for (const k of allKeys(mode)) {
          const roots = cadenceChords(CADENCES[id], k).map(
            ({ chord }) => (pitchClass(chord.root) - pitchClass(k.tonic) + 12) % 12,
          );
          expect(roots, formatKey(k)).toEqual(SEMITONES[id][mode]);
        }
      }
    },
  );

  it("uses the major dominant in minor keys (the leading tone of harmonic minor)", () => {
    for (const k of allKeys("minor")) {
      const [dominant] = cadenceChords(CADENCES.authentic, k);
      expect(dominant?.chord.quality?.id, formatKey(k)).toBe("major");
    }
  });
});

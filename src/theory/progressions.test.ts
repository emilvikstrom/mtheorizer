import { describe, expect, it } from "vitest";
import { type Note, formatNote, note, pitchClass } from "./notes";
import {
  PROGRESSIONS,
  PROGRESSION_IDS,
  PROGRESSION_TAGS,
  type ProgressionId,
  findProgressions,
  parseProgressionTags,
  progressionChords,
  sortProgressionTags,
  progressionTonality,
  progressionTonalityOn,
} from "./progressions";
import { type KeyMode, formatKey, keysAt } from "./keys";
import { builderStepsFor } from "./progressionBuilder";
import {
  TONALITY_IDS,
  type Tonality,
  type TonalityId,
  formatTonality,
  tonality,
  tonalityScale,
  tonalitySpellings,
} from "./tonality";

const symbols = (id: ProgressionId, tonic: Note) =>
  progressionChords(PROGRESSIONS[id], progressionTonalityOn(PROGRESSIONS[id], tonic))
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

/** Every readable tonic of a tonality, both spellings of a black key where both read well. */
const allTonalities = (id: TonalityId): Tonality[] =>
  Array.from({ length: 12 }, (_, pc) =>
    tonalitySpellings(pc, id).map((n) => tonality(n, id)),
  ).flat();

// Every progression on C (or C minor, C dorian …): the spelling of each chord.
const ON_C: Record<ProgressionId, string> = {
  pop: "C G Am F",
  fifties: "C Am F G",
  sensitive: "Am F C G",
  rock: "C F G F",
  royalRoad: "Fmaj7 G7 Em7 Am",
  twoFiveOne: "Dm7 G7 Cmaj7",
  turnaround: "Cmaj7 Am7 Dm7 G7",
  circleMajor: "Em7 Am7 Dm7 G7 Cmaj7",
  ragtime: "E7 A7 D7 G7 C",
  pachelbel: "C G Am Em F C F G",
  minorPlagal: "C F Fm C",
  heroic: "C A♭ B♭ C",
  backdoor: "Fm7 B♭7 Cmaj7",
  blues: "C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7",
  aeolian: "Cm A♭ E♭ B♭",
  andalusian: "Cm B♭ A♭ G",
  minorClimb: "Cm A♭ B♭ Cm",
  minorRock: "Cm B♭ A♭ B♭",
  circleMinor: "Cm Fm B♭ E♭ A♭ D° G Cm",
  lineCliche: "Cm Cm(maj7) Cm7 Cm6",
  minorBlues: "Cm7 Cm7 Cm7 Cm7 Fm7 Fm7 Cm7 Cm7 A♭7 G7 Cm7 G7",
  classicalMinor: "Cm Fm G Cm",
  minorTwoFiveOne: "Dm7♭5 G7 Cm",
  minorDrama: "Cm A♭ Fm G",
  dorianVamp: "Cm7 F7",
  dorianLoop: "Cm B♭ F Cm",
  mixolydianLoop: "C B♭ F C",
  mixolydianVamp: "C Gm B♭ F",
  lydianVamp: "C D",
  phrygianVamp: "Cm D♭",
  phrygianMetal: "Cm D♭ E♭ D♭",
  hijaz: "C D♭ B♭m C",
  melodicMinorVamp: "Cm(maj7) F7",
};

describe("progression data", () => {
  it("has every progression under its own id, with keywords", () => {
    for (const id of PROGRESSION_IDS) {
      expect(PROGRESSIONS[id].id).toBe(id);
      expect(PROGRESSIONS[id].steps.length).toBeGreaterThan(0);
      expect(PROGRESSIONS[id].tags.length).toBeGreaterThan(0);
      expect(new Set(PROGRESSIONS[id].tags).size).toBe(PROGRESSIONS[id].tags.length);
    }
    expect(PROGRESSIONS.aeolian.tonality).toBe("naturalMinor");
    expect(PROGRESSIONS.pop.tonality).toBe("major");
    expect(PROGRESSIONS.dorianVamp.tonality).toBe("dorian");
  });

  it("uses every keyword at least twice and has progressions beyond major and minor", () => {
    for (const tag of PROGRESSION_TAGS) {
      expect(findProgressions([tag]).length, tag).toBeGreaterThanOrEqual(2);
    }
    const tonalities = new Set(PROGRESSION_IDS.map((id) => PROGRESSIONS[id].tonality));
    expect(tonalities.size).toBeGreaterThanOrEqual(8);
  });

  it("names each progression by its step numbers", () => {
    for (const id of PROGRESSION_IDS) {
      const p = PROGRESSIONS[id];
      if (p.name.includes("blues")) continue;
      expect(p.name, id).toBe(p.steps.map((s) => s.roman).join("–"));
    }
  });

  it("writes the 12-bar blues as twelve bars", () => {
    expect(PROGRESSIONS.blues.steps.map((s) => s.roman).join(" ")).toBe(
      "I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7",
    );
  });
});

/** Whether every chord of the progression is one of its tonality's own. */
const inside = (id: ProgressionId): boolean =>
  builderStepsFor(PROGRESSIONS[id])?.every((s) => s.from === undefined) ?? false;

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

  it.each(PROGRESSION_IDS)("%s: spelled on C", (id) => {
    expect(symbols(id, note("C"))).toBe(ON_C[id]);
  });

  it.each(PROGRESSION_IDS)("%s: the roots are the scale degrees, on every tonic", (id) => {
    const progression = PROGRESSIONS[id];
    for (const t of allTonalities(progression.tonality)) {
      const scale = tonalityScale(t);
      const chords = progressionChords(progression, t);
      expect(chords).toHaveLength(progression.steps.length);
      for (const { step, chord } of chords) {
        const degree = scale[step.degree - 1];
        expect(chord.root.letter, `${formatTonality(t)} ${step.roman}`).toBe(degree?.letter);
        expect(chord.root.accidental).toBe((degree?.accidental ?? 0) + (step.alter ?? 0));
        // A flat in the step number means a lowered root: ♭VI is a half step below VI.
        expect(chord.tones.length).toBeGreaterThan(0);
      }
    }
  });

  it.each(PROGRESSION_IDS.filter(inside))(
    "%s: every chord tone is in the scale, on every tonic",
    (id) => {
      const progression = PROGRESSIONS[id];
      for (const t of allTonalities(progression.tonality)) {
        const scale = tonalityScale(t).map((n) => formatNote(n));
        for (const { chord } of progressionChords(progression, t)) {
          for (const tone of chord.tones) {
            expect(scale, `${formatTonality(t)} ${chord.symbol}`).toContain(formatNote(tone.note));
          }
        }
      }
    },
  );

  it("keeps most progressions inside their tonality", () => {
    expect(PROGRESSION_IDS.filter(inside).length).toBeGreaterThan(PROGRESSION_IDS.length / 2);
    // The ones that borrow are the ones that say so. The builder can borrow ♭VI and ♭VII, but
    // not the major V of the Andalusian cadence.
    expect(inside("heroic")).toBe(false);
    expect(builderStepsFor(PROGRESSIONS.heroic)?.some((s) => s.from === "borrowed")).toBe(true);
    expect(builderStepsFor(PROGRESSIONS.andalusian)).toBeUndefined();
  });
});

describe("progression keywords in a link", () => {
  it("reads keywords in the usual order, each once, and leaves out unknown words", () => {
    expect(parseProgressionTags("sad,jazz")).toEqual(sortProgressionTags(["jazz", "sad"]));
    expect(parseProgressionTags("jazz,jazz,banana,,JAZZ")).toEqual(["jazz"]);
    expect(parseProgressionTags(null)).toEqual([]);
    expect(parseProgressionTags("")).toEqual([]);
  });

  it("round-trips every keyword and all of them together", () => {
    for (const tag of PROGRESSION_TAGS) expect(parseProgressionTags(tag)).toEqual([tag]);
    expect(parseProgressionTags([...PROGRESSION_TAGS].reverse().join(","))).toEqual([
      ...PROGRESSION_TAGS,
    ]);
  });
});

describe("findProgressions", () => {
  it("finds by every keyword given, and by tonality", () => {
    const jazzSad = findProgressions(["jazz", "sad"]).map((p) => p.id);
    expect(jazzSad).toContain("minorTwoFiveOne");
    expect(jazzSad).not.toContain("twoFiveOne");
    expect(findProgressions([], "dorian").map((p) => p.id)).toEqual(["dorianVamp", "dorianLoop"]);
    expect(findProgressions(["metal"], "phrygian").map((p) => p.id)).toEqual([
      "phrygianVamp",
      "phrygianMetal",
    ]);
    expect(findProgressions([])).toHaveLength(PROGRESSION_IDS.length);
    expect(findProgressions(["jazz", "metal"])).toEqual([]);
  });
});

describe("progressionTonality", () => {
  const names = (id: ProgressionId) =>
    Array.from({ length: 12 }, (_, pc) =>
      formatTonality(progressionTonality(PROGRESSIONS[id], pc)),
    );

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

  it("spells a mode with the fewest accidentals", () => {
    expect(names("dorianVamp").slice(0, 4)).toEqual([
      "C dorian",
      "C♯ dorian",
      "D dorian",
      "E♭ dorian",
    ]);
  });

  it("is a readable tonality for every pitch class", () => {
    for (const id of PROGRESSION_IDS) {
      const progression = PROGRESSIONS[id];
      for (let pc = 0; pc < 12; pc++) {
        const t = progressionTonality(progression, pc);
        expect(pitchClass(t.tonic)).toBe(pc);
        expect(allTonalities(progression.tonality).map(formatTonality)).toContain(
          formatTonality(t),
        );
      }
    }
  });

  it("offers the same tonics as the circle of fifths for major and minor", () => {
    const circle = (mode: KeyMode) => allKeys(mode).map(formatKey).sort();
    expect(allTonalities("major").map(formatTonality).sort()).toEqual(circle("major"));
    expect(allTonalities("naturalMinor").map(formatTonality).sort()).toEqual(circle("minor"));
    for (const id of TONALITY_IDS) expect(allTonalities(id).length).toBeGreaterThanOrEqual(12);
  });
});

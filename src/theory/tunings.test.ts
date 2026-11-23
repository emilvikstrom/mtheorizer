import { describe, expect, it } from "vitest";
import {
  MAX_STRINGS,
  STANDARD_TUNING,
  TUNINGS,
  TUNING_PRESETS,
  customTuning,
  describeTuning,
  formatTune,
  openStringMidi,
  parseTune,
  presetFor,
  tuningFor,
} from "./index";

describe("tuning link text", () => {
  it("writes and reads every preset back unchanged", () => {
    for (const preset of TUNING_PRESETS) {
      const text = formatTune(preset.strings);
      expect(parseTune(text), preset.id).toEqual(preset.strings);
    }
  });

  it("spells sharps with s and flats with b", () => {
    expect(formatTune(parseTune("Eb4,Fs3,B3,Bb2,Cbb4,Gss2") ?? [])).toBe(
      "Eb4,Fs3,B3,Bb2,Cbb4,Gss2",
    );
    expect(parseTune("Bb3,B3")?.map(openStringMidi)).toEqual([58, 59]);
  });

  it("gives nothing for text that is not a tuning", () => {
    for (const bad of [
      "",
      "E4",
      "E4,H3",
      "E4,B",
      "E4,B33",
      "e4,b3",
      "E4,,B3",
      Array(MAX_STRINGS + 1)
        .fill("E2")
        .join(","),
    ]) {
      expect(parseTune(bad), bad).toBeUndefined();
    }
    expect(parseTune(null)).toBeUndefined();
  });
});

describe("presets", () => {
  it("have unique ids and distinct tunings, so each tuning has one name", () => {
    expect(new Set(TUNING_PRESETS.map((p) => p.id)).size).toBe(TUNING_PRESETS.length);
    for (const preset of TUNING_PRESETS) expect(presetFor(preset.strings)?.id).toBe(preset.id);
  });

  it("include every built-in tuning with the same pitches", () => {
    const builtIn = TUNING_PRESETS.filter((p) => p.builtIn);
    expect(builtIn.map((p) => p.builtIn?.tuning ?? p.builtIn?.instrument)).toEqual([
      "standard",
      "dropD",
      "dadgad",
      "ukulele",
      "bass",
      "bass5",
      "mandolin",
    ]);
    for (const preset of builtIn) {
      const id = preset.builtIn?.tuning ?? preset.builtIn?.instrument;
      const tuning = TUNINGS[id as keyof typeof TUNINGS];
      expect(preset.strings.map(openStringMidi), preset.id).toEqual(
        tuning.strings.map(openStringMidi),
      );
    }
  });

  it("tune each string a sensible way: the strings of a preset span a range", () => {
    const midi = (id: string) =>
      presetFor(
        parseTune(formatTune(TUNING_PRESETS.find((p) => p.id === id)?.strings ?? [])) ?? [],
      )?.strings.map(openStringMidi);
    expect(midi("guitarHalfDown")).toEqual([63, 58, 54, 49, 44, 39]);
    expect(midi("guitarOpenG")).toEqual([62, 59, 55, 50, 43, 38]);
    expect(midi("guitar7")).toEqual([64, 59, 55, 50, 45, 40, 35]);
    expect(midi("bass6")).toEqual([48, 43, 38, 33, 28, 23]);
    expect(midi("ukulele")).toEqual([69, 64, 60, 67]);
  });

  it("describe a tuning from the low string up", () => {
    expect(describeTuning(STANDARD_TUNING)).toBe("E A D G B E");
    expect(describeTuning(parseTune("Eb4,Bb3,Gb3,Db3,Ab2,Eb2") ?? [])).toBe("E♭ A♭ D♭ G♭ B♭ E♭");
  });
});

describe("custom tuning", () => {
  it("searches grips as the built-in tunings do", () => {
    for (const id of [
      "standard",
      "dropD",
      "dadgad",
      "ukulele",
      "bass",
      "bass5",
      "mandolin",
    ] as const) {
      const built = TUNINGS[id];
      const custom = customTuning(built.strings);
      expect({ root: custom.rootInBass, fret: custom.openChordMaxFret }, id).toEqual({
        root: built.rootInBass,
        fret: built.openChordMaxFret,
      });
    }
  });

  it("is what tuningFor gives for the custom instrument, standard guitar when no strings are named", () => {
    const strings = parseTune("D4,A3,F3,C3,G2,C2") ?? [];
    expect(tuningFor("custom", "standard", strings).strings).toEqual(strings);
    expect(tuningFor("custom").strings).toEqual(STANDARD_TUNING);
    expect(tuningFor("custom").instrument).toBe("custom");
  });
});

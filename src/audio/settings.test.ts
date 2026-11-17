import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from "./settings";

describe("normalizeAudioSettings", () => {
  it("falls back to the defaults for anything that is not settings", () => {
    for (const raw of [undefined, null, 5, "x", [], {}]) {
      expect(normalizeAudioSettings(raw)).toEqual(DEFAULT_AUDIO_SETTINGS);
    }
  });

  it("keeps valid settings", () => {
    const settings = { timbre: "pluck", tempo: 1.5, volume: 0.3, reference: 432 } as const;
    expect(normalizeAudioSettings(settings)).toEqual(settings);
  });

  it.each([
    [{ tempo: 10 }, { tempo: 2 }],
    [{ tempo: 0.01 }, { tempo: 0.5 }],
    [{ volume: 3 }, { volume: 1 }],
    [{ volume: -1 }, { volume: 0 }],
    [{ reference: 1000 }, { reference: 480 }],
    [{ reference: 100 }, { reference: 400 }],
    [{ reference: 432.6 }, { reference: 433 }],
  ])("keeps %j in range", (given, expected) => {
    expect(normalizeAudioSettings(given)).toMatchObject(expected);
  });

  it("replaces an unknown sound or a number that is not a number", () => {
    expect(normalizeAudioSettings({ timbre: "organ" }).timbre).toBe(DEFAULT_AUDIO_SETTINGS.timbre);
    expect(normalizeAudioSettings({ tempo: "fast", volume: Number.NaN })).toEqual(
      DEFAULT_AUDIO_SETTINGS,
    );
  });
});

describe("stored settings", () => {
  // The module keeps the settings in memory, so each test loads a fresh copy.
  const load = async () => {
    vi.resetModules();
    return import("./settings");
  };

  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("starts from the defaults", async () => {
    const { getAudioSettings } = await load();
    expect(getAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("remembers a change and reads it back on the next visit", async () => {
    const first = await load();
    first.updateAudioSettings({ timbre: "sine", reference: 415 });
    const second = await load();
    expect(second.getAudioSettings()).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      timbre: "sine",
      reference: 415,
    });
  });

  it("tells listeners about a change and stops after they unsubscribe", async () => {
    const { subscribeAudioSettings, updateAudioSettings, resetAudioSettings } = await load();
    const listener = vi.fn();
    const unsubscribe = subscribeAudioSettings(listener);
    updateAudioSettings({ volume: 0.2 });
    resetAudioSettings();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    updateAudioSettings({ volume: 0.4 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("goes back to the defaults on reset", async () => {
    const { getAudioSettings, updateAudioSettings, resetAudioSettings } = await load();
    updateAudioSettings({ tempo: 2, timbre: "pluck" });
    resetAudioSettings();
    expect(getAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("ignores stored settings that are not valid JSON", async () => {
    window.localStorage.setItem("mtheorizer.audio", "{oops");
    const { getAudioSettings } = await load();
    expect(getAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("keeps the settings for this visit when storage is not available", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { getAudioSettings, updateAudioSettings } = await load();
    expect(getAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(() => updateAudioSettings({ tempo: 1.5 })).not.toThrow();
    expect(getAudioSettings().tempo).toBe(1.5);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ScheduledNote, planPlayback, planProgression } from "./playback";
import {
  clearSounding,
  currentSounding,
  soundingAt,
  soundingEvents,
  trackSounding,
} from "./sounding";

const sorted = (set: ReadonlySet<number>) => [...set].sort((a, b) => a - b);

describe("soundingEvents", () => {
  it("lists every start and end in time order", () => {
    const plan: ScheduledNote[] = [
      { midi: 64, start: 0.5, duration: 1 },
      { midi: 60, start: 0, duration: 1 },
    ];
    expect(soundingEvents(plan)).toEqual([
      { time: 0, midi: 60, on: true },
      { time: 0.5, midi: 64, on: true },
      { time: 1, midi: 60, on: false },
      { time: 1.5, midi: 64, on: false },
    ]);
  });

  it("turns a tone off before the next one starts at the same moment", () => {
    const plan: ScheduledNote[] = [
      { midi: 60, start: 0, duration: 1 },
      { midi: 60, start: 1, duration: 1 },
    ];
    const atOne = soundingEvents(plan).filter((e) => e.time === 1);
    expect(atOne.map((e) => e.on)).toEqual([false, true]);
  });
});

describe("soundingAt", () => {
  it("lets a chord sound all at once and then stop", () => {
    const plan = planPlayback([60, 64, 67], "together");
    expect(sorted(soundingAt(plan, 0))).toEqual([60, 64, 67]);
    expect(sorted(soundingAt(plan, 1.5))).toEqual([60, 64, 67]);
    expect(soundingAt(plan, 1.6).size).toBe(0);
  });

  it("builds a broken chord up one tone at a time", () => {
    const plan = planPlayback([60, 64, 67], "broken");
    expect(sorted(soundingAt(plan, 0))).toEqual([60]);
    expect(sorted(soundingAt(plan, 0.4))).toEqual([60, 64]);
    expect(sorted(soundingAt(plan, 0.8))).toEqual([60, 64, 67]);
  });

  it("steps through a scale, one tone at a time", () => {
    const plan = planPlayback([60, 62, 64], "broken", "scale");
    expect(sorted(soundingAt(plan, 0.1))).toEqual([60]);
    expect(sorted(soundingAt(plan, 0.35))).toEqual([60, 62]);
  });

  it("moves from chord to chord in a progression", () => {
    const plan = planProgression([
      [60, 64, 67],
      [62, 65, 69],
    ]);
    expect(sorted(soundingAt(plan, 0.5))).toEqual([60, 64, 67]);
    // The first chord is cut off a little after the second one starts, at 1.2 s.
    expect(sorted(soundingAt(plan, 1.25))).toEqual([60, 62, 64, 65, 67, 69]);
    expect(sorted(soundingAt(plan, 1.4))).toEqual([62, 65, 69]);
  });
});

describe("trackSounding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearSounding();
  });
  afterEach(() => {
    clearSounding();
    vi.useRealTimers();
  });

  it("marks a tone from its start until it ends", () => {
    trackSounding([{ midi: 60, start: 1, duration: 2 }]);
    expect(currentSounding().size).toBe(0);
    vi.advanceTimersByTime(999);
    expect(currentSounding().size).toBe(0);
    vi.advanceTimersByTime(1);
    expect(sorted(currentSounding())).toEqual([60]);
    vi.advanceTimersByTime(1999);
    expect(sorted(currentSounding())).toEqual([60]);
    vi.advanceTimersByTime(1);
    expect(currentSounding().size).toBe(0);
  });

  it("starts after the lead the audio waits before it begins", () => {
    trackSounding([{ midi: 60, start: 0, duration: 1 }], 0.05);
    vi.advanceTimersByTime(49);
    expect(currentSounding().size).toBe(0);
    vi.advanceTimersByTime(1);
    expect(sorted(currentSounding())).toEqual([60]);
  });

  it("steps through a broken chord", () => {
    trackSounding(planPlayback([60, 64, 67], "broken"));
    vi.advanceTimersByTime(0);
    expect(sorted(currentSounding())).toEqual([60]);
    vi.advanceTimersByTime(350);
    expect(sorted(currentSounding())).toEqual([60, 64]);
    vi.advanceTimersByTime(350);
    expect(sorted(currentSounding())).toEqual([60, 64, 67]);
    vi.advanceTimersByTime(5000);
    expect(currentSounding().size).toBe(0);
  });

  it("moves through a progression, keeping a shared tone lit across the change", () => {
    trackSounding(
      planProgression([
        [60, 64, 67],
        [60, 65, 69],
      ]),
    );
    vi.advanceTimersByTime(500);
    expect(sorted(currentSounding())).toEqual([60, 64, 67]);
    // The first chord is cut off a little after the second one starts, at 1.2 s.
    vi.advanceTimersByTime(900);
    expect(sorted(currentSounding())).toEqual([60, 65, 69]);
  });

  it("does not let one play end the tone of another that is still sounding", () => {
    trackSounding([{ midi: 60, start: 0, duration: 1 }]);
    vi.advanceTimersByTime(500);
    trackSounding([{ midi: 60, start: 0, duration: 2 }]);
    // The first play ended at 1 s; the second one lasts until 2.5 s.
    vi.advanceTimersByTime(600);
    expect(sorted(currentSounding())).toEqual([60]);
    vi.advanceTimersByTime(1500);
    expect(currentSounding().size).toBe(0);
  });

  it("stops marking anything when it is cleared, and ignores the tones still to come", () => {
    trackSounding(planPlayback([60, 64, 67], "broken"));
    vi.advanceTimersByTime(400);
    expect(currentSounding().size).toBe(2);
    clearSounding();
    expect(currentSounding().size).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(currentSounding().size).toBe(0);
  });
});

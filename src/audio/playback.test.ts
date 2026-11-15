import { afterEach, describe, expect, it, vi } from "vitest";
import { midiToFrequency, planPlayback, playNotes } from "./playback";

describe("midiToFrequency", () => {
  it("puts A4 at 440 Hz and middle C at about 261.63 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 2);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
  });
});

describe("planPlayback", () => {
  it("starts every tone at once when played together", () => {
    const plan = planPlayback([67, 60, 64], "together");
    expect(plan.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(new Set(plan.map((n) => n.start))).toEqual(new Set([0]));
  });

  it("breaks a chord from the lowest tone up and ends all tones together", () => {
    const plan = planPlayback([67, 60, 64], "broken");
    expect(plan.map((n) => n.midi)).toEqual([60, 64, 67]);
    const starts = plan.map((n) => n.start);
    expect(starts[0]).toBe(0);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(3);
    const ends = plan.map((n) => +(n.start + n.duration).toFixed(6));
    expect(new Set(ends).size).toBe(1);
  });

  it("plays a scale as a run of short tones", () => {
    const plan = planPlayback([60, 62, 64, 65], "broken", "scale");
    const starts = plan.map((n) => n.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(4);
    expect(plan.every((n) => n.duration < 1)).toBe(true);
  });
});

describe("playNotes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(playNotes(planPlayback([60], "together"))).toBe(0);
  });

  it("starts one oscillator per tone at the right frequency", () => {
    const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn> }[] = [];
    class FakeContext {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        const osc = {
          type: "",
          frequency: { value: 0 },
          connect: (n: unknown) => n,
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(osc);
        return osc;
      }
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: (n: unknown) => n,
        };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    playNotes(planPlayback([60, 64, 67], "together"));
    expect(oscillators.map((o) => Math.round(o.frequency.value))).toEqual([262, 330, 392]);
    expect(oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
  });
});

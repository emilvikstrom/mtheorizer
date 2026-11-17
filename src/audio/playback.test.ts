import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROGRESSION_STEP,
  applyTempo,
  envelopeFor,
  midiToFrequency,
  planPlayback,
  planProgression,
  playNotes,
} from "./playback";
import { DEFAULT_AUDIO_SETTINGS, TIMBRES } from "./settings";

describe("planProgression", () => {
  it("plays the chords one after another, each as a block", () => {
    const plan = planProgression([
      [60, 64, 67],
      [62, 65, 69],
    ]);
    expect(plan.map((n) => n.midi)).toEqual([60, 64, 67, 62, 65, 69]);
    expect(plan.map((n) => n.start)).toEqual([0, 0, 0, 1, 1, 1].map((i) => i * PROGRESSION_STEP));
  });

  it("cuts a chord off just after the next one starts", () => {
    for (const note of planProgression([[60], [62], [64]], 1)) {
      expect(note.duration).toBeLessThanOrEqual(1.1);
    }
  });

  it("plans nothing for no chords", () => {
    expect(planProgression([])).toEqual([]);
  });
});

describe("midiToFrequency", () => {
  it("puts A4 at 440 Hz and middle C at about 261.63 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 2);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
  });

  it.each([
    [415, 69, 415],
    [432, 69, 432],
    [432, 81, 864],
    [442, 57, 221],
    [466, 60, 466 * 2 ** (-9 / 12)],
  ])("with A4 at %i Hz, MIDI %i is %f Hz", (reference, midi, expected) => {
    expect(midiToFrequency(midi, reference)).toBeCloseTo(expected, 6);
  });

  it("keeps every interval whatever the tuning", () => {
    for (const reference of [415, 432, 440, 466]) {
      expect(midiToFrequency(76, reference) / midiToFrequency(64, reference)).toBeCloseTo(2, 9);
      expect(midiToFrequency(67, reference) / midiToFrequency(60, reference)).toBeCloseTo(
        2 ** (7 / 12),
        9,
      );
    }
  });
});

describe("applyTempo", () => {
  const plan = planPlayback([60, 64, 67], "broken");

  it("leaves the plan as it is at tempo 1", () => {
    expect(applyTempo(plan, 1)).toEqual(plan);
  });

  it("halves every start and duration at twice the speed, and doubles them at half", () => {
    const fast = applyTempo(plan, 2);
    const slow = applyTempo(plan, 0.5);
    plan.forEach((n, i) => {
      expect(fast[i]).toEqual({ midi: n.midi, start: n.start / 2, duration: n.duration / 2 });
      expect(slow[i]).toEqual({ midi: n.midi, start: n.start * 2, duration: n.duration * 2 });
    });
  });

  it("ignores a tempo that is not positive", () => {
    expect(applyTempo(plan, 0)).toEqual(plan);
    expect(applyTempo(plan, Number.NaN)).toEqual(plan);
  });
});

describe("envelopeFor", () => {
  it.each(TIMBRES.map((t) => t.id))(
    "%s starts and ends silent and peaks at the level",
    (timbre) => {
      const points = envelopeFor(timbre, 0.2, 2);
      expect(points[0]).toEqual({ time: 0, level: 0.0001 });
      expect(points.at(-1)?.level).toBe(0.0001);
      expect(Math.max(...points.map((p) => p.level))).toBe(0.2);
      const times = points.map((p) => p.time);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThanOrEqual(2);
    },
  );

  it("lets a plucked tone die away before a long tone ends, but not the others", () => {
    expect(envelopeFor("pluck", 0.2, 3).at(-1)?.time).toBeLessThan(3);
    expect(envelopeFor("sine", 0.2, 3).at(-1)?.time).toBe(3);
    expect(envelopeFor("triangle", 0.2, 3).at(-1)?.time).toBe(3);
  });

  it("stays inside a very short tone", () => {
    for (const { id } of TIMBRES) {
      expect(Math.max(...envelopeFor(id, 0.2, 0.01).map((p) => p.time))).toBeLessThanOrEqual(0.01);
    }
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

interface FakeOsc {
  type: string;
  frequency: { value: number };
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

// playNotes keeps its AudioContext for the whole page, so every test shares one fake.
const oscillators: FakeOsc[] = [];
const peaks: number[] = [];
let filters = 0;

class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createOscillator() {
    const osc: FakeOsc & { connect: (n: unknown) => unknown } = {
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
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: (level: number) => peaks.push(level),
      },
      connect: (n: unknown) => n,
    };
  }
  createBiquadFilter() {
    filters += 1;
    return {
      type: "",
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (n: unknown) => n,
    };
  }
}

describe("playNotes", () => {
  beforeEach(() => {
    oscillators.length = 0;
    peaks.length = 0;
    filters = 0;
    vi.stubGlobal("AudioContext", FakeContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(playNotes(planPlayback([60], "together"))).toBe(0);
  });

  it("starts one oscillator per tone at the right frequency", () => {
    playNotes(planPlayback([60, 64, 67], "together"));
    expect(oscillators.map((o) => Math.round(o.frequency.value))).toEqual([262, 330, 392]);
    expect(oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
  });

  it("tunes the tones to the reference pitch", () => {
    playNotes(planPlayback([69, 81], "together"), { ...DEFAULT_AUDIO_SETTINGS, reference: 432 });
    expect(oscillators.map((o) => o.frequency.value)).toEqual([432, 864]);
  });

  it.each([
    ["sine", "sine", 0],
    ["triangle", "triangle", 0],
    ["pluck", "sawtooth", 2],
  ] as const)("plays %s as a %s wave with %i filters", (timbre, wave, filterCount) => {
    playNotes(planPlayback([60, 64], "together"), { ...DEFAULT_AUDIO_SETTINGS, timbre });
    expect(oscillators.map((o) => o.type)).toEqual([wave, wave]);
    expect(filters).toBe(filterCount);
  });

  it("does not change the plan when the sound changes", () => {
    const plan = planPlayback([60, 64, 67], "broken");
    const lengths = TIMBRES.map(({ id }) =>
      playNotes(plan, { ...DEFAULT_AUDIO_SETTINGS, timbre: id }),
    );
    expect(new Set(lengths).size).toBe(1);
    expect(plan).toEqual(planPlayback([60, 64, 67], "broken"));
  });

  it("plays faster and returns a shorter length at a higher tempo", () => {
    const plan = planPlayback([60, 64, 67], "broken");
    const normal = playNotes(plan, DEFAULT_AUDIO_SETTINGS);
    const fast = playNotes(plan, { ...DEFAULT_AUDIO_SETTINGS, tempo: 2 });
    expect(fast).toBeCloseTo(normal / 2, 9);
  });

  it("scales the level with the volume", () => {
    playNotes(planPlayback([60], "together"), { ...DEFAULT_AUDIO_SETTINGS, volume: 1 });
    const loud = Math.max(...peaks);
    peaks.length = 0;
    playNotes(planPlayback([60], "together"), { ...DEFAULT_AUDIO_SETTINGS, volume: 0.5 });
    expect(Math.max(...peaks)).toBeCloseTo(loud / 2, 9);
  });
});

import { type AudioSettings, type Timbre, getAudioSettings } from "./settings";

/** How a set of tones is played: all at once, or one after another from the lowest. */
export type PlayMode = "together" | "broken";

export interface ScheduledNote {
  readonly midi: number;
  /** Seconds after the start of playback. */
  readonly start: number;
  /** Seconds the tone sounds. */
  readonly duration: number;
}

const BROKEN_STEP = 0.35;
const SCALE_STEP = 0.3;
const SUSTAIN = 1.6;

/** Frequency in Hz of a MIDI note number, with A4 (69) at `reference` Hz (440 unless tuned). */
export function midiToFrequency(midi: number, reference = 440): number {
  return reference * 2 ** ((midi - 69) / 12);
}

/** The plan played `tempo` times as fast: 2 halves every start and duration, 0.5 doubles them. */
export function applyTempo(notes: readonly ScheduledNote[], tempo: number): ScheduledNote[] {
  if (!(tempo > 0)) return [...notes];
  return notes.map((n) => ({ midi: n.midi, start: n.start / tempo, duration: n.duration / tempo }));
}

/** A point on a gain envelope: the level to reach, in seconds after the tone starts. */
export interface EnvelopePoint {
  readonly time: number;
  readonly level: number;
}

const SILENT = 0.0001;

/**
 * The gain envelope of one tone. Sine and triangle tones swell in and fade out over the whole
 * duration; a plucked tone starts sharply and dies away well before it ends.
 */
export function envelopeFor(timbre: Timbre, level: number, duration: number): EnvelopePoint[] {
  const peak = Math.max(level, SILENT);
  if (timbre === "pluck") {
    const attack = Math.min(0.005, duration / 4);
    return [
      { time: 0, level: SILENT },
      { time: attack, level: peak },
      { time: Math.max(attack * 2, Math.min(duration, 1.4)), level: SILENT },
    ];
  }
  const attack = Math.min(0.02, duration / 4);
  return [
    { time: 0, level: SILENT },
    { time: attack, level: peak },
    { time: duration, level: SILENT },
  ];
}

/**
 * When each tone starts. "together" sounds every tone at once; "broken" plays
 * them from the lowest up, each one held until the end so the chord builds up.
 * A scale uses "broken" with a faster step and shorter tones.
 */
export function planPlayback(
  midis: readonly number[],
  mode: PlayMode,
  kind: "chord" | "scale" = "chord",
): ScheduledNote[] {
  const sorted = [...midis].sort((a, b) => a - b);
  if (mode === "together") return sorted.map((midi) => ({ midi, start: 0, duration: SUSTAIN }));
  if (kind === "scale") {
    return sorted.map((midi, i) => ({ midi, start: i * SCALE_STEP, duration: SCALE_STEP * 1.5 }));
  }
  const end = (sorted.length - 1) * BROKEN_STEP + SUSTAIN;
  return sorted.map((midi, i) => ({
    midi,
    start: i * BROKEN_STEP,
    duration: end - i * BROKEN_STEP,
  }));
}

/** Seconds each chord of a progression lasts. */
export const PROGRESSION_STEP = 1.2;

/**
 * A progression as one plan: each chord sounds together, one after another,
 * and is cut off when the next one starts so they do not pile up.
 */
export function planProgression(
  chords: readonly (readonly number[])[],
  step = PROGRESSION_STEP,
): ScheduledNote[] {
  return chords.flatMap((midis, i) =>
    planPlayback(midis, "together").map((n) => ({
      midi: n.midi,
      start: i * step,
      duration: Math.min(n.duration, step * 1.1),
    })),
  );
}

let context: AudioContext | undefined;

/** The tones that are sounding or scheduled, so that they can be cut off. */
const active = new Set<{ osc: OscillatorNode; gain: GainNode }>();

/** Cuts off everything that is playing or about to play. Does nothing when nothing is. */
export function stopPlayback(): void {
  if (!context) return;
  const now = context.currentTime;
  for (const { osc, gain } of active) {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.02);
      osc.stop(now + 0.1);
    } catch {
      // A tone that has already ended cannot be stopped again.
    }
  }
  active.clear();
}

/** Whether this browser can play sound through Web Audio. */
export function audioSupported(): boolean {
  return typeof window !== "undefined" && typeof window.AudioContext === "function";
}

/**
 * Plays the planned notes in the chosen sound (the stored settings unless given). The plan is the
 * same whatever the sound; tempo, tuning, volume and timbre only decide how it is played.
 * `voices` is how many tones sound at the same time, which sets the level (all of them by default).
 * Returns the total length in seconds.
 */
export function playNotes(
  plan: readonly ScheduledNote[],
  settings: AudioSettings = getAudioSettings(),
  voices?: number,
): number {
  if (!audioSupported() || plan.length === 0) return 0;
  context ??= new AudioContext();
  const ctx = context;
  if (ctx.state === "suspended") void ctx.resume();
  const notes = applyTempo(plan, settings.tempo);
  const t0 = ctx.currentTime + 0.05;
  // Keep the combined level below clipping however many tones play. `voices` is how many sound
  // at once, for a long plan where only a few overlap (every tone counts when it is not given).
  const level = (0.5 / Math.max(2, voices ?? notes.length)) * settings.volume;
  let total = 0;
  for (const { midi, start, duration } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = settings.timbre === "pluck" ? "sawtooth" : settings.timbre;
    osc.frequency.value = midiToFrequency(midi, settings.reference);
    const at = t0 + start;
    const envelope = envelopeFor(settings.timbre, level, duration);
    gain.gain.setValueAtTime(envelope[0]?.level ?? SILENT, at);
    for (const point of envelope.slice(1)) {
      gain.gain.exponentialRampToValueAtTime(point.level, at + point.time);
    }
    if (settings.timbre === "pluck") {
      // A plucked string loses its upper harmonics as it rings out.
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(5000, at);
      filter.frequency.exponentialRampToValueAtTime(600, at + Math.min(duration, 1.2));
      osc.connect(filter).connect(gain).connect(ctx.destination);
    } else {
      osc.connect(gain).connect(ctx.destination);
    }
    osc.start(at);
    osc.stop(at + duration + 0.05);
    const tone = { osc, gain };
    active.add(tone);
    osc.onended = () => active.delete(tone);
    total = Math.max(total, start + duration);
  }
  return total;
}

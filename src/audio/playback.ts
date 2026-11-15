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

/** Frequency in Hz of a MIDI note number (A4 = 69 = 440 Hz). */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
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

let context: AudioContext | undefined;

/** Whether this browser can play sound through Web Audio. */
export function audioSupported(): boolean {
  return typeof window !== "undefined" && typeof window.AudioContext === "function";
}

/** Plays the planned notes with a soft piano-like envelope. Returns the total length in seconds. */
export function playNotes(notes: readonly ScheduledNote[]): number {
  if (!audioSupported() || notes.length === 0) return 0;
  context ??= new AudioContext();
  const ctx = context;
  if (ctx.state === "suspended") void ctx.resume();
  const t0 = ctx.currentTime + 0.05;
  // Keep the combined level below clipping however many tones play.
  const level = 0.5 / Math.max(2, notes.length);
  let total = 0;
  for (const { midi, start, duration } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToFrequency(midi);
    const at = t0 + start;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.05);
    total = Math.max(total, start + duration);
  }
  return total;
}

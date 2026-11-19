import { useSyncExternalStore } from "react";
import type { ScheduledNote } from "./playback";

/** A tone starting or ending, in seconds after playback began. */
export interface SoundingEvent {
  readonly time: number;
  readonly midi: number;
  readonly on: boolean;
}

/**
 * The starts and ends of a plan's tones in time order. A tone that ends at the moment another
 * begins (a progression cut off at the next chord) is turned off first, so the same key
 * does not blink out right after it lit up again.
 */
export function soundingEvents(plan: readonly ScheduledNote[]): SoundingEvent[] {
  const events = plan.flatMap((n) => [
    { time: n.start, midi: n.midi, on: true },
    { time: n.start + n.duration, midi: n.midi, on: false },
  ]);
  return events.sort((a, b) => a.time - b.time || Number(a.on) - Number(b.on));
}

/** The MIDI numbers sounding `time` seconds into a plan (a tone sounds from its start up to its end). */
export function soundingAt(plan: readonly ScheduledNote[], time: number): ReadonlySet<number> {
  return new Set(
    plan.filter((n) => n.start <= time && time < n.start + n.duration).map((n) => n.midi),
  );
}

const EMPTY: ReadonlySet<number> = new Set();
let current: ReadonlySet<number> = EMPTY;
/** How many plans have each tone sounding: two overlapping plays must not cut each other short. */
const counts = new Map<number, number>();
const timers = new Set<ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function publish(): void {
  current = counts.size === 0 ? EMPTY : new Set(counts.keys());
  for (const listener of listeners) listener();
}

function change(midi: number, on: boolean): void {
  const next = (counts.get(midi) ?? 0) + (on ? 1 : -1);
  if (next > 0) counts.set(midi, next);
  else counts.delete(midi);
  publish();
}

/**
 * Follows a plan that starts `lead` seconds from now: each tone is reported as sounding from its
 * start until its end. The plan is the one handed to the audio, with the tempo already applied.
 */
export function trackSounding(plan: readonly ScheduledNote[], lead = 0): void {
  for (const event of soundingEvents(plan)) {
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        change(event.midi, event.on);
      },
      Math.max(0, (lead + event.time) * 1000),
    );
    timers.add(timer);
  }
}

/** Forgets everything that was scheduled and marks nothing as sounding. */
export function clearSounding(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  counts.clear();
  publish();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The MIDI numbers that are sounding right now. */
export function currentSounding(): ReadonlySet<number> {
  return current;
}

/** The tones sounding right now, for a view to mark. Re-renders as tones start and stop. */
export function useSounding(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, currentSounding, () => EMPTY);
}

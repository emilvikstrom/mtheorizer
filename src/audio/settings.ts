/** The sound of a played tone. */
export type Timbre = "sine" | "triangle" | "pluck";

export const TIMBRES: readonly { readonly id: Timbre; readonly label: string }[] = [
  { id: "sine", label: "Sine" },
  { id: "triangle", label: "Triangle" },
  { id: "pluck", label: "Plucked" },
];

export interface AudioSettings {
  readonly timbre: Timbre;
  /** Playback speed as a factor: 1 is normal, 2 twice as fast. */
  readonly tempo: number;
  /** Master level from 0 (silent) to 1. */
  readonly volume: number;
  /** Frequency in Hz of A4. */
  readonly reference: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  timbre: "triangle",
  tempo: 1,
  volume: 0.8,
  reference: 440,
};

export const TEMPO_RANGE = { min: 0.5, max: 2 } as const;
export const REFERENCE_RANGE = { min: 400, max: 480 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Anything that is not a valid setting falls back to its default, and numbers are kept in range. */
export function normalizeAudioSettings(raw: unknown): AudioSettings {
  const given = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_AUDIO_SETTINGS;
  return {
    timbre: TIMBRES.some((t) => t.id === given.timbre) ? (given.timbre as Timbre) : d.timbre,
    tempo: clamp(numberOr(given.tempo, d.tempo), TEMPO_RANGE.min, TEMPO_RANGE.max),
    volume: clamp(numberOr(given.volume, d.volume), 0, 1),
    reference: Math.round(
      clamp(numberOr(given.reference, d.reference), REFERENCE_RANGE.min, REFERENCE_RANGE.max),
    ),
  };
}

const STORAGE_KEY = "mtheorizer.audio";

let current: AudioSettings | undefined;
const listeners = new Set<() => void>();

function read(): AudioSettings {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeAudioSettings(stored ? JSON.parse(stored) : undefined);
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

/** The settings in use. Read from localStorage once, and kept in memory where that is not available. */
export function getAudioSettings(): AudioSettings {
  current ??= read();
  return current;
}

function set(next: AudioSettings) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private windows and blocked storage keep the settings for this visit only.
  }
  for (const listener of listeners) listener();
}

export function updateAudioSettings(patch: Partial<AudioSettings>): void {
  set(normalizeAudioSettings({ ...getAudioSettings(), ...patch }));
}

export function resetAudioSettings(): void {
  set(DEFAULT_AUDIO_SETTINGS);
}

export function subscribeAudioSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

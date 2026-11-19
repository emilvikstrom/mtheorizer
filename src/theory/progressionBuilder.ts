import { type ChordQualityId, buildChord } from "./chords";
import { type Key, diatonicSevenths, diatonicTriads } from "./keys";
import type { ProgressionChord } from "./progressions";

/**
 * A progression put together chord by chord from the key's own chords. Each entry is a scale
 * degree and whether to use the triad or the seventh chord built on it, so the list is the same
 * in every key of the mode and only the spelling changes: [1, 5, 6, 4] is C–G–Am–F in C major and
 * A♭–E♭–Fm–D♭ in A♭ major.
 */

export type BuilderSize = "triad" | "seventh";

export interface BuilderChord {
  /** Scale degree of the key (1–7). */
  readonly degree: number;
  readonly size: BuilderSize;
}

/** The longest progression the builder holds (the 12-bar blues fits, with room for a turnaround). */
export const MAX_BUILDER_CHORDS = 16;

const isDegree = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 7;

const TRIAD_QUALITY = {
  major: "major",
  minor: "minor",
  diminished: "diminished",
  augmented: "augmented",
} as const satisfies Record<string, ChordQualityId>;

/** The chord of the key that `item` stands for, with its step number and tones. */
export function builderChord(k: Key, item: BuilderChord): ProgressionChord {
  const triad = diatonicTriads(k)[item.degree - 1];
  const seventh = diatonicSevenths(k)[item.degree - 1];
  const found = item.size === "seventh" ? seventh : triad;
  if (!triad || !seventh || !found) throw new Error(`No scale degree ${item.degree}`);
  const quality: ChordQualityId =
    item.size === "seventh" ? seventh.quality : TRIAD_QUALITY[triad.quality];
  const root = found.notes[0];
  if (!root) throw new Error("A chord has a root");
  return {
    step: { degree: item.degree, quality, roman: found.roman },
    chord: buildChord(root, quality),
  };
}

/** All the chords of `items` in `k`, in order. */
export const builderChords = (k: Key, items: readonly BuilderChord[]): ProgressionChord[] =>
  items.map((item) => builderChord(k, item));

/** `items` with `item` added at the end (unchanged when the list is full). */
export const addBuilderChord = (
  items: readonly BuilderChord[],
  item: BuilderChord,
): readonly BuilderChord[] => (items.length >= MAX_BUILDER_CHORDS ? items : [...items, item]);

/** `items` without the chord at `index`. */
export const removeBuilderChord = (
  items: readonly BuilderChord[],
  index: number,
): readonly BuilderChord[] => items.filter((_, i) => i !== index);

/** `items` with the chord at `index` moved `by` places (negative moves it earlier). */
export function moveBuilderChord(
  items: readonly BuilderChord[],
  index: number,
  by: number,
): readonly BuilderChord[] {
  const to = index + by;
  const moved = items[index];
  if (moved === undefined || to < 0 || to >= items.length || by === 0) return items;
  const rest = items.filter((_, i) => i !== index);
  return [...rest.slice(0, to), moved, ...rest.slice(to)];
}

// --- Text form, for links -----------------------------------------------------

/** "1,5,6,4" or, with seventh chords, "2s,5s,1s": a digit and an `s` for the seventh chord. */
export const formatBuilderChords = (items: readonly BuilderChord[]): string =>
  items.map((c) => `${c.degree}${c.size === "seventh" ? "s" : ""}`).join(",");

/** The list written by `formatBuilderChords`; undefined when any part of it is not a chord. */
export function parseBuilderChords(text: string): readonly BuilderChord[] | undefined {
  if (text === "") return [];
  const parts = text.split(",");
  if (parts.length > MAX_BUILDER_CHORDS) return undefined;
  const items: BuilderChord[] = [];
  for (const part of parts) {
    const m = /^([1-7])(s?)$/.exec(part);
    if (!m) return undefined;
    const degree = Number(m[1]);
    if (!isDegree(degree)) return undefined;
    items.push({ degree, size: m[2] === "s" ? "seventh" : "triad" });
  }
  return items;
}

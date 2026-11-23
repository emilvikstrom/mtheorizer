import { buildChord } from "./chords";
import type { Progression, ProgressionChord } from "./progressions";
import { type Tonality, tonality, tonalitySevenths, tonalityTriads } from "./tonality";
import type { Note } from "./notes";

/**
 * A progression put together chord by chord from a tonality's own chords. Each entry is a scale
 * degree and whether to use the triad or the seventh chord built on it, so the list is the same
 * on every tonic of the tonality and only the spelling changes: [1, 5, 6, 4] is C–G–Am–F in
 * C major and A♭–E♭–Fm–D♭ in A♭ major, and [1, 4] is Dm–G in D dorian.
 */

export type BuilderSize = "triad" | "seventh";

export interface BuilderChord {
  /** Scale degree of the tonality (1–7). */
  readonly degree: number;
  readonly size: BuilderSize;
}

/** The longest progression the builder holds (the 12-bar blues fits, with room for a turnaround). */
export const MAX_BUILDER_CHORDS = 16;

const isDegree = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 7;

/** The chord of the tonality that `item` stands for, with its step number and tones. */
export function builderChord(t: Tonality, item: BuilderChord): ProgressionChord {
  const found = (item.size === "seventh" ? tonalitySevenths(t) : tonalityTriads(t))[
    item.degree - 1
  ];
  const root = found?.notes[0];
  if (!found || !root) throw new Error(`No scale degree ${item.degree}`);
  return {
    step: { degree: item.degree, quality: found.quality, roman: found.roman },
    chord: buildChord(root, found.quality),
  };
}

/** All the chords of `items` in `t`, in order. */
export const builderChords = (t: Tonality, items: readonly BuilderChord[]): ProgressionChord[] =>
  items.map((item) => builderChord(t, item));

/**
 * A ready-made progression as builder chords, when every chord is one of the tonality's own triads
 * or seventh chords (I–V–vi–IV, ii7–V7–Imaj7); undefined when one comes from outside it (the
 * major V of the Andalusian cadence, the ♭VI of a major key) or when it is too long.
 */
export function builderStepsFor(progression: Progression): readonly BuilderChord[] | undefined {
  // Qualities do not depend on the tonic, so C stands for every tonic.
  const t = tonality({ letter: "C", accidental: 0 } satisfies Note, progression.tonality);
  const triads = tonalityTriads(t);
  const sevenths = tonalitySevenths(t);
  if (progression.steps.length > MAX_BUILDER_CHORDS) return undefined;
  const items: BuilderChord[] = [];
  for (const s of progression.steps) {
    if (s.alter) return undefined;
    if (triads[s.degree - 1]?.quality === s.quality)
      items.push({ degree: s.degree, size: "triad" });
    else if (sevenths[s.degree - 1]?.quality === s.quality)
      items.push({ degree: s.degree, size: "seventh" });
    else return undefined;
  }
  return items;
}

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

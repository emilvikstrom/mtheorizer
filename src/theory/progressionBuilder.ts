import { buildChord } from "./chords";
import { PERFECT_FIFTH, transpose } from "./intervals";
import { borrowedChords, formatKey, parallelKey } from "./keys";
import { type Note, pitchClass } from "./notes";
import type { Progression, ProgressionChord } from "./progressions";
import {
  type NextChord,
  type Tonality,
  nextChords,
  tonality,
  tonalityKey,
  tonalityScale,
  tonalitySevenths,
  tonalityTriads,
} from "./tonality";

/**
 * A progression put together chord by chord. Each entry is a scale degree and whether to use the
 * triad or the seventh chord built on it, so the list is the same on every tonic of the tonality
 * and only the spelling changes: [1, 5, 6, 4] is C–G–Am–F in C major and A♭–E♭–Fm–D♭ in A♭ major,
 * and [1, 4] is Dm–G in D dorian.
 *
 * Besides the tonality's own chords, an entry can be borrowed from the parallel key (♭VI and ♭VII
 * from C minor in C major, the major IV in C minor) or be a secondary dominant (V7/ii, D7 → G).
 */

export type BuilderSize = "triad" | "seventh";

/** Where a chord comes from, when not from the tonality itself. */
export type BuilderSource = "borrowed" | "secondary";

export interface BuilderChord {
  /**
   * Scale degree (1–7): of the tonality, of the parallel key for a borrowed chord, and of the
   * chord it resolves to for a secondary dominant (2 for V7/ii).
   */
  readonly degree: number;
  /** A secondary dominant is always a dominant seventh. */
  readonly size: BuilderSize;
  /** Absent for the tonality's own chords. */
  readonly from?: BuilderSource;
}

/** The longest progression the builder holds (the 12-bar blues fits, with room for a turnaround). */
export const MAX_BUILDER_CHORDS = 16;

/** The key a major or natural minor tonality borrows from (C minor for C major), or undefined. */
export function parallelTonality(t: Tonality): Tonality | undefined {
  if (t.scale === "major") return tonality(t.tonic, "naturalMinor");
  if (t.scale === "naturalMinor") return tonality(t.tonic, "major");
  return undefined;
}

/**
 * The degrees of the parallel key the builder offers to borrow, as the key panel lists them:
 * ii°, ♭III, iv, ♭VI and ♭VII in a major key, and I, ii and IV in a minor one. Other tonalities
 * have no single parallel key, so none.
 */
export function borrowedDegrees(t: Tonality): readonly number[] {
  const k = tonalityKey(t);
  return k ? borrowedChords(k).map((c) => c.degree) : [];
}

/**
 * The degrees a secondary dominant can point at: every chord of the tonality but the tonic that is
 * major or minor (a diminished chord is not tonicised). In C major: ii, iii, IV, V and vi.
 */
export function secondaryTargets(t: Tonality): readonly number[] {
  return tonalityTriads(t)
    .filter((c) => c.degree !== 1 && (c.quality === "major" || c.quality === "minor"))
    .map((c) => c.degree);
}

/** Whether `t` has the chord `item` stands for. */
export function fitsBuilder(t: Tonality, item: BuilderChord): boolean {
  if (!Number.isInteger(item.degree) || item.degree < 1 || item.degree > 7) return false;
  if (item.from === "borrowed") return borrowedDegrees(t).includes(item.degree);
  if (item.from === "secondary") return secondaryTargets(t).includes(item.degree);
  return true;
}

/** The chords of `items` that `t` has, so a progression can move to another tonality. */
export const fitBuilderChords = (
  t: Tonality,
  items: readonly BuilderChord[],
): readonly BuilderChord[] => items.filter((item) => fitsBuilder(t, item));

/** Half steps a root lies off the tonality's own scale degree: -1 for A♭ (♭VI) in C major. */
function alterOf(t: Tonality, degree: number, root: Note): -1 | 1 | undefined {
  const own = tonalityScale(t)[degree - 1];
  if (!own) return undefined;
  const diff = ((((pitchClass(root) - pitchClass(own)) % 12) + 18) % 12) - 6;
  return diff === -1 || diff === 1 ? diff : undefined;
}

/** The chord `item` stands for in `t`, with its step number and tones. */
export function builderChord(t: Tonality, item: BuilderChord): ProgressionChord {
  if (!fitsBuilder(t, item))
    throw new Error(`No such chord in ${t.scale}: ${formatBuilderChords([item])}`);
  if (item.from === "secondary") {
    const target = tonalityTriads(t)[item.degree - 1];
    const targetRoot = target?.notes[0];
    if (!target || !targetRoot) throw new Error(`No scale degree ${item.degree}`);
    const root = transpose(targetRoot, PERFECT_FIFTH);
    const degree = ((item.degree + 3) % 7) + 1;
    const alter = alterOf(t, degree, root);
    return {
      step: {
        degree,
        ...(alter ? { alter } : {}),
        quality: "dominant7",
        roman: `V7/${target.roman}`,
      },
      chord: buildChord(root, "dominant7"),
    };
  }
  const source = item.from === "borrowed" ? parallelTonality(t) : t;
  const found =
    source &&
    (item.size === "seventh" ? tonalitySevenths(source) : tonalityTriads(source))[item.degree - 1];
  const root = found ? found.notes[0] : undefined;
  if (!found || !root) throw new Error(`No scale degree ${item.degree}`);
  const alter = alterOf(t, item.degree, root);
  return {
    step: {
      degree: item.degree,
      ...(alter ? { alter } : {}),
      quality: found.quality,
      roman: found.roman,
    },
    chord: buildChord(root, found.quality),
  };
}

/** All the chords of `items` in `t`, in order. */
export const builderChords = (t: Tonality, items: readonly BuilderChord[]): ProgressionChord[] =>
  items.map((item) => builderChord(t, item));

/** "secondary dominant of Dm" or "borrowed from C minor", for the list; undefined for the tonality's own. */
export function builderSourceText(t: Tonality, item: BuilderChord): string | undefined {
  if (item.from === "secondary") {
    const target = tonalityTriads(t)[item.degree - 1];
    return target ? `secondary dominant of ${target.symbol}` : undefined;
  }
  if (item.from === "borrowed") {
    const k = tonalityKey(t);
    return k ? `borrowed from ${formatKey(parallelKey(k))}` : undefined;
  }
  return undefined;
}

/**
 * What could follow `last` in `t` (up to four chords of the tonality, each with its reason). After
 * a secondary dominant comes the chord it points at, a fifth down; after a borrowed chord, the
 * tonality's own chord a fifth below it, if there is one, and the tonic.
 */
export function builderIdeas(t: Tonality, last: BuilderChord | undefined): NextChord[] {
  if (!last || !last.from) return nextChords(t, last?.degree);
  if (last.from === "secondary") {
    return [
      { degree: last.degree, reason: "fifthDown" },
      { degree: 1, reason: "home" },
    ];
  }
  const root = builderChord(t, last).chord.root;
  const below = (pitchClass(root) + 5) % 12;
  const fifthDown = tonalityTriads(t).find(
    (c) =>
      c.notes[0] !== undefined &&
      pitchClass(c.notes[0]) === below &&
      (c.quality === "major" || c.quality === "minor"),
  );
  return [
    ...(fifthDown && fifthDown.degree !== 1
      ? [{ degree: fifthDown.degree, reason: "fifthDown" as const }]
      : []),
    { degree: 1, reason: fifthDown?.degree === 1 ? ("fifthDown" as const) : ("home" as const) },
  ];
}

/**
 * A ready-made progression as builder chords, when every chord is one of the tonality's own triads
 * or seventh chords (I–V–vi–IV, ii7–V7–Imaj7) or one the builder can borrow (the ♭VI and ♭VII of a
 * major key); undefined when one comes from elsewhere (the major V of the Andalusian cadence) or
 * when it is too long.
 */
export function builderStepsFor(progression: Progression): readonly BuilderChord[] | undefined {
  // Qualities do not depend on the tonic, so C stands for every tonic.
  const t = tonality({ letter: "C", accidental: 0 } satisfies Note, progression.tonality);
  if (progression.steps.length > MAX_BUILDER_CHORDS) return undefined;
  const items: BuilderChord[] = [];
  for (const s of progression.steps) {
    const candidates: BuilderChord[] = [
      { degree: s.degree, size: "triad" },
      { degree: s.degree, size: "seventh" },
      { degree: s.degree, size: "triad", from: "borrowed" },
      { degree: s.degree, size: "seventh", from: "borrowed" },
    ];
    const match = candidates.find((c) => {
      if (!fitsBuilder(t, c)) return false;
      const { step } = builderChord(t, c);
      return step.quality === s.quality && (step.alter ?? 0) === (s.alter ?? 0);
    });
    if (!match) return undefined;
    items.push(match);
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

/**
 * "1,5,6,4" or, with seventh chords, "2s,5s,1s": a digit and an `s` for the seventh chord. A
 * borrowed chord has a `b` before it (`b6`, `b7s`) and a secondary dominant is `v5/` and the
 * degree it points at (`v5/2` for V7/ii).
 */
export const formatBuilderChords = (items: readonly BuilderChord[]): string =>
  items
    .map((c) =>
      c.from === "secondary"
        ? `v5/${c.degree}`
        : `${c.from === "borrowed" ? "b" : ""}${c.degree}${c.size === "seventh" ? "s" : ""}`,
    )
    .join(",");

/**
 * The list written by `formatBuilderChords`; undefined when any part of it is not a chord. Whether
 * the tonality has each chord is checked by `fitBuilderChords`.
 */
export function parseBuilderChords(text: string): readonly BuilderChord[] | undefined {
  if (text === "") return [];
  const parts = text.split(",");
  if (parts.length > MAX_BUILDER_CHORDS) return undefined;
  const items: BuilderChord[] = [];
  for (const part of parts) {
    const secondary = /^v5\/([2-7])$/.exec(part);
    if (secondary) {
      items.push({ degree: Number(secondary[1]), size: "seventh", from: "secondary" });
      continue;
    }
    const m = /^(b?)([1-7])(s?)$/.exec(part);
    if (!m) return undefined;
    items.push({
      degree: Number(m[2]),
      size: m[3] === "s" ? "seventh" : "triad",
      ...(m[1] === "b" ? { from: "borrowed" as const } : {}),
    });
  }
  return items;
}

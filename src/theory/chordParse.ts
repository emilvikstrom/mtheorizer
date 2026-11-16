import { chordSymbolSuffix, identifyQuality } from "./chordNaming";
import {
  CHORD_BASES,
  type ChordSpec,
  availableQualities,
  buildChordFromSpec,
  normalizeSpec,
  withQuality,
} from "./chordSpec";
import type { ChordQualityId } from "./chords";
import { type Letter, type Note, note, noteEquals, pitchClass } from "./notes";

/**
 * Reading a chord symbol ("F#m7b5/C") back into a root, a spec and a bass: the
 * reverse of `chordSymbolFor`.
 *
 * The symbols `chordSymbolSuffix` writes are the source of truth: every spec
 * reachable from a base chord through `availableQualities` is named once, and
 * parsing is a lookup of the (cleaned-up) suffix in that table. That makes the
 * round trip exact by construction, and the common ways of writing a chord are
 * handled by rewriting them to the canonical suffix first (`cleanSuffix`).
 */

/** Every spec a user can build, found by adding available modifiers one at a time. */
function reachableSpecs(): ChordSpec[] {
  const seen = new Map<string, ChordSpec>();
  const key = (spec: ChordSpec) => `${spec.base}:${spec.qualities.join(",")}`;
  const queue: ChordSpec[] = CHORD_BASES.map((base) => ({ base, qualities: [] }));
  for (const spec of queue) {
    if (seen.has(key(spec))) continue;
    seen.set(key(spec), spec);
    for (const modifier of availableQualities(spec)) queue.push(withQuality(spec, modifier));
  }
  return [...seen.values()];
}

/** Every spec a chord symbol can name. Exposed so tests can walk the same set. */
export const PARSEABLE_SPECS: readonly ChordSpec[] = reachableSpecs();

const ACCIDENTALS = "#♯b♭𝄪𝄫";
const ACCIDENTAL_VALUE: Record<string, number> = {
  "#": 1,
  "♯": 1,
  b: -1,
  "♭": -1,
  "𝄪": 2,
  "𝄫": -2,
};

/** A note name as `formatNote` or a keyboard writes it: "F♯", "Bb", "E𝄫", "c#". */
function readNote(text: string): Note {
  const [first = "C", ...accidentals] = [...text];
  const accidental = accidentals.reduce((sum, ch) => sum + (ACCIDENTAL_VALUE[ch] ?? 0), 0);
  return note(first.toUpperCase() as Letter, accidental);
}

const stripPunctuation = (suffix: string) => suffix.replace(/[(),]/g, "");

const EXACT = new Map<string, ChordSpec>();
const LOOSE = new Map<string, ChordSpec | null>();
for (const spec of PARSEABLE_SPECS) {
  const suffix = chordSymbolSuffix(spec);
  EXACT.set(suffix, normalizeSpec(spec));
  // Without parentheses ("13♭9" for "13(♭9)"), but only when that is unambiguous.
  const loose = stripPunctuation(suffix);
  LOOSE.set(loose, LOOSE.has(loose) ? null : normalizeSpec(spec));
}

/** Rewrite the usual ways of writing a suffix to the one `chordSymbolSuffix` uses. */
function cleanSuffix(raw: string): string {
  let s = raw.replace(/\s+/g, "").replace(/#/g, "♯").replace(/b/g, "♭");
  s = s.replace(/[øØ]7?/g, "m7♭5"); // Cø, Cø7: half-diminished
  s = s.replace(/dim/g, "°").replace(/o(?=\d|$)/g, "°");
  s = s.replace(/aug/g, "+");
  s = s.replace(/[△Δ]/g, "maj").replace(/M/g, "maj");
  s = s.replace(/min/g, "m");
  if (s.startsWith("-")) s = `m${s.slice(1)}`;
  s = s.replace(/sus(?![24])/g, "sus4");
  if (/^m?69$/.test(s)) s = s.replace("69", "6/9");
  // "C+7" and "C7+5" are C7♯5; "C+" alone is the augmented triad.
  if (s.length > 1 && s.startsWith("+")) s = `${s.slice(1)}♯5`;
  s = s.replace(/(?<=.)\+5/g, "♯5");
  if (s === "maj" || s === "major") return "";
  return s;
}

/** A chord symbol read back: the root, what kind of chord it is and what is in the bass. */
export interface ParsedChord {
  readonly root: Note;
  readonly spec: ChordSpec;
  /** The named chord quality, when the spec has one (a free combination like C7♭5♭9 has none). */
  readonly quality: ChordQualityId | undefined;
  /** The bass written after a slash, or null for a plain chord. */
  readonly bass: Note | null;
  /**
   * 0 for root position (also C/C), 1–3 when the bass is a chord tone within the
   * octave (C/E is the 1st inversion), and null when the bass is not one (C/D,
   * or a ninth in the bass), which the keyboard can't show as an inversion.
   */
  readonly inversion: number | null;
}

export type ParseResult =
  | { readonly ok: true; readonly chord: ParsedChord }
  | { readonly ok: false; readonly error: string };

const fail = (error: string): ParseResult => ({ ok: false, error });

/**
 * Parse a chord symbol such as "Cmaj7", "F#m7b5/C", "Bb13(b9)" or "C-7".
 * Accepts ASCII (`#`, `b`) and music symbols (`♯`, `♭`, `°`, `ø`, `△`), and
 * common alternatives (`M7`, `min7`, `dim`, `aug`, `+`, `-`, `sus`). The root and
 * the bass are read by spelling, so Gb and F# are different roots.
 */
export function parseChordSymbol(input: string): ParseResult {
  const text = input.trim();
  if (text === "") return fail("Enter a chord symbol, for example Cm7♭5 or F♯7/A.");

  const bassMatch = new RegExp(`/([A-Ga-g][${ACCIDENTALS}]*)$`, "u").exec(text);
  const body = bassMatch ? text.slice(0, bassMatch.index) : text;
  if (!bassMatch && text.endsWith("/")) return fail("Add a bass note after the slash, like C/E.");

  const rootMatch = new RegExp(`^([A-Ga-g][${ACCIDENTALS}]*)(.*)$`, "su").exec(body);
  if (!rootMatch) {
    return fail(`"${text}" does not start with a note name (A–G), for example C or F♯.`);
  }
  const root = readNote(rootMatch[1] ?? "");
  const rawSuffix = rootMatch[2] ?? "";

  const cleaned = cleanSuffix(rawSuffix);
  const spec = EXACT.get(cleaned) ?? LOOSE.get(stripPunctuation(cleaned)) ?? undefined;
  if (!spec) {
    return fail(
      `Unknown chord quality "${rawSuffix}" after ${rootMatch[1]}. Try something like m, 7, maj7, m7♭5, sus4 or add9.`,
    );
  }

  const bass = bassMatch ? readNote(bassMatch[1] ?? "") : null;
  return {
    ok: true,
    chord: {
      root,
      spec,
      quality: identifyQuality(spec),
      bass,
      inversion: bass ? inversionOf(root, spec, bass) : 0,
    },
  };
}

function inversionOf(root: Note, spec: ChordSpec, bass: Note): number | null {
  if (noteEquals(bass, root)) return 0;
  // Lowest first, as `inversionSymbol` lists them. Match on sound, so Cm/D♯ finds E♭.
  const tones = buildChordFromSpec(root, spec).tones;
  const index = tones.findIndex((tone) => pitchClass(tone.note) === pitchClass(bass));
  const tone = tones[index];
  if (!tone || tone.interval.semitones >= 12 || index > 3) return null;
  return index;
}

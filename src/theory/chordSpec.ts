import type { ChordQualityId, ChordTone, ChordToneSpec } from "./chords";
import {
  AUGMENTED_ELEVENTH,
  AUGMENTED_FIFTH,
  AUGMENTED_NINTH,
  DIMINISHED_FIFTH,
  DIMINISHED_SEVENTH,
  type Interval,
  MAJOR_NINTH,
  MAJOR_SECOND,
  MAJOR_SEVENTH,
  MAJOR_SIXTH,
  MAJOR_THIRD,
  MAJOR_THIRTEENTH,
  MINOR_NINTH,
  MINOR_SEVENTH,
  MINOR_THIRD,
  MINOR_THIRTEENTH,
  PERFECT_ELEVENTH,
  PERFECT_FIFTH,
  PERFECT_FOURTH,
  PERFECT_UNISON,
  transpose,
} from "./intervals";
import type { Note } from "./notes";

/**
 * A chord as a base chord plus modifiers ("qualities" in the plan): C, Cm, C°,
 * C+, Csus2, Csus4 or C5, with a seventh, sixth, extensions, altered tones and
 * added tones laid on top. Naming comes in M6-03; this module only knows which
 * tones a spec contains and which modifiers can be added to it.
 */
export const CHORD_BASES = [
  "major",
  "minor",
  "diminished",
  "augmented",
  "sus2",
  "sus4",
  "power",
] as const;

export type ChordBase = (typeof CHORD_BASES)[number];

/**
 * Modifiers, in canonical order. Dependencies come before the modifiers that
 * need them, which `normalizeSpec` relies on.
 *
 * - seventh: `7` (minor seventh), `maj7`, `dim7` (°7, a diminished seventh)
 * - sixth: `6`
 * - extensions: `9`, `11`, `13` (each includes the ones below it)
 * - altered: `flat5`, `flat9`, `sharp9`, `sharp11`, `flat13`
 * - added tones: `add2`, `add4`, `add9`, `add11` (one at a time)
 */
export const CHORD_MODIFIERS = [
  "7",
  "maj7",
  "dim7",
  "6",
  "9",
  "11",
  "13",
  "flat5",
  "flat9",
  "sharp9",
  "sharp11",
  "flat13",
  "add2",
  "add4",
  "add9",
  "add11",
] as const;

export type ChordModifier = (typeof CHORD_MODIFIERS)[number];

export interface ChordSpec {
  readonly base: ChordBase;
  /** A set, kept in canonical order (`CHORD_MODIFIERS`) so that equal chords compare equal. */
  readonly qualities: readonly ChordModifier[];
}

const SEVENTHS: readonly ChordModifier[] = ["7", "maj7", "dim7"];
const ADDED: readonly ChordModifier[] = ["add2", "add4", "add9", "add11"];

function canAdd(base: ChordBase, has: (m: ChordModifier) => boolean, modifier: ChordModifier) {
  if (has(modifier)) return false;
  const hasSeventh = SEVENTHS.some(has);
  const hasAdded = ADDED.some(has);
  const hasNinth = has("9") || has("flat9") || has("sharp9");
  switch (modifier) {
    case "7":
      return base !== "power" && !hasSeventh;
    case "maj7":
      return base !== "power" && base !== "diminished" && !hasSeventh;
    case "dim7":
      return base === "diminished" && !hasSeventh;
    case "6":
      return (base === "major" || base === "minor") && !hasSeventh && !hasAdded;
    case "9":
      // A bare ninth needs a seventh, or a sixth (6/9). Csus2 already has it as the second.
      return (
        base !== "power" &&
        base !== "sus2" &&
        (hasSeventh || has("6")) &&
        !hasNinth &&
        !has("11") &&
        !has("13")
      );
    case "11":
      // Csus4 already has it as the fourth.
      return (
        base !== "power" &&
        base !== "sus4" &&
        hasSeventh &&
        !has("11") &&
        !has("13") &&
        !has("sharp11")
      );
    case "13":
      // Same tone as the diminished seventh.
      return hasSeventh && !has("dim7") && !has("flat13");
    case "flat5":
      // On a minor chord it would be a diminished chord, and it clashes with ♯11.
      return base === "major" && !has("sharp11");
    case "flat9":
      return has("7") && ["major", "minor", "augmented", "sus4"].includes(base) && !hasNinth;
    case "sharp9":
      // On a minor chord ♯9 is the minor third, and a sus chord has no third.
      return has("7") && (base === "major" || base === "augmented") && !hasNinth;
    case "sharp11":
      return base === "major" && hasSeventh && !has("flat5") && !has("11");
    case "flat13":
      // On an augmented chord ♭13 is the fifth.
      return has("7") && (base === "major" || base === "minor") && !has("13");
    case "add2":
    case "add4":
    case "add11":
      return (base === "major" || base === "minor") && !hasSeventh && !has("6") && !hasAdded;
    case "add9":
      return (
        (base === "major" || base === "minor" || base === "sus4") &&
        !hasSeventh &&
        !has("6") &&
        !hasAdded
      );
  }
}

/**
 * The spec with everything that no longer fits removed: modifiers that need a
 * missing seventh (`9` without `7`), clash with another (`6` with a seventh)
 * or don't exist on the base (`flat5` on Cm), and extensions already implied
 * by a higher one (`9` under `11`). Idempotent, and keeps the earlier
 * modifier in canonical order when two clash.
 */
export function normalizeSpec(spec: ChordSpec): ChordSpec {
  const wanted = new Set(spec.qualities);
  const kept = new Set<ChordModifier>();
  for (const modifier of CHORD_MODIFIERS) {
    if (wanted.has(modifier) && canAdd(spec.base, (m) => kept.has(m), modifier)) {
      kept.add(modifier);
    }
  }
  if (kept.has("13")) kept.delete("11");
  if (kept.has("13") || kept.has("11")) kept.delete("9");
  return { base: spec.base, qualities: CHORD_MODIFIERS.filter((m) => kept.has(m)) };
}

/** The modifiers that can be added to the chord as it looks now, in canonical order. */
export function availableQualities(spec: ChordSpec): ChordModifier[] {
  const { base, qualities } = normalizeSpec(spec);
  const has = (m: ChordModifier) => qualities.includes(m);
  return CHORD_MODIFIERS.filter((m) => canAdd(base, has, m));
}

/** Add a modifier and normalize, so that what depended on nothing else stays. */
export function withQuality(spec: ChordSpec, modifier: ChordModifier): ChordSpec {
  return normalizeSpec({ base: spec.base, qualities: [...spec.qualities, modifier] });
}

/** Remove a modifier and everything that depended on it (no `7` means no `9`). */
export function withoutQuality(spec: ChordSpec, modifier: ChordModifier): ChordSpec {
  return normalizeSpec({
    base: spec.base,
    qualities: spec.qualities.filter((m) => m !== modifier),
  });
}

/** Change the base chord and keep the modifiers that are still available. */
export function withBase(spec: ChordSpec, base: ChordBase): ChordSpec {
  return normalizeSpec({ base, qualities: spec.qualities });
}

function toneSpec(role: ChordToneSpec["role"], interval: Interval, optional = false) {
  return { role, interval, optional } satisfies ChordToneSpec;
}

/** The tones of a spec, lowest first, with roles and which tones may be left out. */
export function toneSpecsOf(input: ChordSpec): ChordToneSpec[] {
  const { base, qualities } = normalizeSpec(input);
  const has = (m: ChordModifier) => qualities.includes(m);
  const tones: ChordToneSpec[] = [toneSpec("root", PERFECT_UNISON)];

  if (base === "major" || base === "augmented") tones.push(toneSpec("third", MAJOR_THIRD));
  if (base === "minor" || base === "diminished") tones.push(toneSpec("third", MINOR_THIRD));
  if (base === "sus2") tones.push(toneSpec("second", MAJOR_SECOND));
  if (base === "sus4") tones.push(toneSpec("fourth", PERFECT_FOURTH));

  // The perfect fifth is optional once the chord has four tones or more.
  const fifthIndex = tones.length;
  const alteredFifth =
    base === "diminished" || has("flat5")
      ? DIMINISHED_FIFTH
      : base === "augmented"
        ? AUGMENTED_FIFTH
        : null;
  tones.push(toneSpec("fifth", alteredFifth ?? PERFECT_FIFTH));

  if (has("6")) tones.push(toneSpec("sixth", MAJOR_SIXTH));
  if (has("7")) tones.push(toneSpec("seventh", MINOR_SEVENTH));
  if (has("maj7")) tones.push(toneSpec("seventh", MAJOR_SEVENTH));
  if (has("dim7")) tones.push(toneSpec("seventh", DIMINISHED_SEVENTH));

  const upper = has("11") || has("13");
  if (has("9")) tones.push(toneSpec("ninth", MAJOR_NINTH));
  else if (has("flat9")) tones.push(toneSpec("ninth", MINOR_NINTH));
  else if (has("sharp9")) tones.push(toneSpec("ninth", AUGMENTED_NINTH));
  // Under 11 and 13 the ninth is understood and may be left out, but Csus2 has it as the second.
  else if (upper && base !== "sus2") tones.push(toneSpec("ninth", MAJOR_NINTH, true));

  if (has("11")) tones.push(toneSpec("eleventh", PERFECT_ELEVENTH));
  else if (has("sharp11")) tones.push(toneSpec("eleventh", AUGMENTED_ELEVENTH));
  // Over a minor third the eleventh stays in a thirteenth chord (Cm13); over a major third it clashes.
  else if (has("13") && (base === "minor" || base === "diminished")) {
    tones.push(toneSpec("eleventh", PERFECT_ELEVENTH, true));
  }

  if (has("13")) tones.push(toneSpec("thirteenth", MAJOR_THIRTEENTH));
  else if (has("flat13")) tones.push(toneSpec("thirteenth", MINOR_THIRTEENTH));

  if (has("add2")) tones.push(toneSpec("second", MAJOR_SECOND));
  if (has("add4")) tones.push(toneSpec("fourth", PERFECT_FOURTH));
  if (has("add9")) tones.push(toneSpec("ninth", MAJOR_NINTH));
  if (has("add11")) tones.push(toneSpec("eleventh", PERFECT_ELEVENTH));

  // A power chord's fifth is never optional; elsewhere a plain fifth may go in chords of four tones or more.
  const fifth = tones[fifthIndex];
  if (fifth && base !== "power" && !alteredFifth && tones.length >= 4) {
    tones[fifthIndex] = { ...fifth, optional: true };
  }

  // Array#sort is stable, and no two tones of a spec share a pitch.
  return tones.sort((a, b) => a.interval.semitones - b.interval.semitones);
}

export interface SpecChord {
  readonly root: Note;
  readonly spec: ChordSpec;
  readonly tones: readonly ChordTone[];
}

/** The chord a spec describes on `root`, with correctly spelled tones. */
export function buildChordFromSpec(root: Note, spec: ChordSpec): SpecChord {
  const normalized = normalizeSpec(spec);
  const tones = toneSpecsOf(normalized).map((tone) => ({
    ...tone,
    note: transpose(root, tone.interval),
  }));
  return { root, spec: normalized, tones };
}

const triad = (base: ChordBase, ...qualities: ChordModifier[]): ChordSpec => ({ base, qualities });

/** Every named chord quality as a spec: a base chord and the modifiers that turn it into the named chord. */
const SPECS: Record<ChordQualityId, ChordSpec> = {
  major: triad("major"),
  minor: triad("minor"),
  diminished: triad("diminished"),
  augmented: triad("augmented"),
  sus2: triad("sus2"),
  sus4: triad("sus4"),
  power: triad("power"),

  major6: triad("major", "6"),
  minor6: triad("minor", "6"),
  sixNine: triad("major", "6", "9"),
  minorSixNine: triad("minor", "6", "9"),

  major7: triad("major", "maj7"),
  dominant7: triad("major", "7"),
  minor7: triad("minor", "7"),
  minorMajor7: triad("minor", "maj7"),
  halfDiminished7: triad("diminished", "7"),
  diminished7: triad("diminished", "dim7"),
  augmented7: triad("augmented", "7"),
  augmentedMajor7: triad("augmented", "maj7"),
  dominant7Flat5: triad("major", "7", "flat5"),
  dominant7Sus4: triad("sus4", "7"),

  major9: triad("major", "maj7", "9"),
  dominant9: triad("major", "7", "9"),
  minor9: triad("minor", "7", "9"),
  dominant7Flat9: triad("major", "7", "flat9"),
  dominant7Sharp9: triad("major", "7", "sharp9"),
  minorMajor9: triad("minor", "maj7", "9"),
  dominant7Sharp5Sharp9: triad("augmented", "7", "sharp9"),
  dominant9Sus4: triad("sus4", "7", "9"),

  dominant11: triad("major", "7", "11"),
  minor11: triad("minor", "7", "11"),
  dominant7Sharp11: triad("major", "7", "sharp11"),
  major7Sharp11: triad("major", "maj7", "sharp11"),

  dominant13: triad("major", "7", "13"),
  major13: triad("major", "maj7", "13"),
  minor13: triad("minor", "7", "13"),
  dominant7Flat13: triad("major", "7", "flat13"),
  dominant13Sus4: triad("sus4", "7", "13"),

  add2: triad("major", "add2"),
  add4: triad("major", "add4"),
  add9: triad("major", "add9"),
  minorAdd9: triad("minor", "add9"),
  add11: triad("major", "add11"),
};

/** The spec of a named chord quality, e.g. `specOf("dominant7Sharp9")` is C + `7` + `sharp9`. */
export function specOf(qualityId: ChordQualityId): ChordSpec {
  return SPECS[qualityId];
}

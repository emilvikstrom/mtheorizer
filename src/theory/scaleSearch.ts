import { mod12, pitchClass } from "./notes";
import { SCALES, SCALE_GROUPS, type ScaleId, type SpelledScale, scaleOnPitchClass } from "./scales";

/** Scales that hold the same pitches, as one result: C major, A natural minor, D dorian … */
export interface ScaleSearchResult {
  /** The best name first: a scale on the first note searched for, then by how common it is. */
  readonly scales: readonly SpelledScale[];
  /** How many notes the scales have that were not searched for. */
  readonly extra: number;
}

/** Scales in the order the picker lists them, a rough measure of how common they are. */
const SCALE_ORDER: readonly ScaleId[] = SCALE_GROUPS.flatMap((g) => g.scales);
const ALL_SCALE_IDS = Object.keys(SCALES) as ScaleId[];

const pitchSet = (scale: SpelledScale) =>
  [...new Set(scale.tones.map((t) => pitchClass(t.note)))].sort((a, b) => a - b);

/**
 * Every scale, on every tonic, that contains all of `notes` (pitch classes, 0 = C). Scales with
 * the same pitches are one result. Fewest extra notes first, so a scale with exactly those notes
 * leads; ties go to the result whose best scale is the more common one. Within a result, a scale
 * whose tonic is the first of `notes` comes first.
 */
export function scalesContaining(notes: readonly number[]): ScaleSearchResult[] {
  const wanted = [...new Set(notes.map(mod12))];
  const first = notes.length > 0 ? mod12(notes[0] ?? 0) : undefined;
  if (wanted.length === 0) return [];

  const groups = new Map<string, SpelledScale[]>();
  for (const id of ALL_SCALE_IDS) {
    for (let pc = 0; pc < 12; pc++) {
      const scale = scaleOnPitchClass(pc, id);
      const pcs = pitchSet(scale);
      if (!wanted.every((n) => pcs.includes(n))) continue;
      const key = pcs.join(",");
      const list = groups.get(key);
      if (list) list.push(scale);
      else groups.set(key, [scale]);
    }
  }

  const rank = (scale: SpelledScale) =>
    (pitchClass(scale.tonic) === first ? 0 : 1000) + SCALE_ORDER.indexOf(scale.scale.id);

  return [...groups.entries()]
    .map(([key, scales]) => ({
      scales: [...scales].sort((a, b) => rank(a) - rank(b)),
      extra: key.split(",").length - wanted.length,
    }))
    .sort((a, b) => {
      const best = (r: ScaleSearchResult) => (r.scales[0] ? rank(r.scales[0]) : Infinity);
      return a.extra - b.extra || best(a) - best(b);
    });
}

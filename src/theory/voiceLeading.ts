import type { Chord } from "./chords";
import { formatNote } from "./notes";
import { type VoicedTone, inversionCount, rootPosition } from "./voicing";

/** One tone going from a chord to the next. */
export interface ToneMove {
  readonly from: VoicedTone;
  readonly to: VoicedTone;
  /** Signed distance in semitones; 0 when the tone stays where it is. */
  readonly semitones: number;
}

/** How the tones of one chord move into the next. */
export interface VoiceLeading {
  /** The first chord as voiced, low to high. */
  readonly from: readonly VoicedTone[];
  /** The second chord as voiced, low to high. */
  readonly to: readonly VoicedTone[];
  /** Tones that carry over, including those that stay (0 semitones). */
  readonly moves: readonly ToneMove[];
  /** Tones of the first chord that have no counterpart in the second. */
  readonly dropped: readonly VoicedTone[];
  /** Tones of the second chord that have no counterpart in the first. */
  readonly added: readonly VoicedTone[];
  /** The sum of the semitones every tone moves, regardless of direction. */
  readonly total: number;
}

/** The voicings considered keep to this range (C3–C6), so the chords stay close together. */
const LOWEST = 48;
const HIGHEST = 84;

const byPitch = (tones: readonly VoicedTone[]) => [...tones].sort((a, b) => a.midi - b.midi);

/**
 * Every way to voice `chord` on the keyboard: each inversion, in the octave
 * of middle C and one octave up or down, as far as it stays within C3–C6.
 * Root position near middle C comes first, so ties are settled in its favour.
 */
export function voicingsOf(chord: Chord): VoicedTone[][] {
  const base = rootPosition(chord);
  const lowToHigh = byPitch(base);
  const voicings: VoicedTone[][] = [];
  for (let n = 0; n <= inversionCount(chord); n++) {
    // Each inversion lifts the lowest tone an octave.
    const lifted = new Set(lowToHigh.slice(0, n));
    const inverted = base.map((t) => (lifted.has(t) ? { ...t, midi: t.midi + 12 } : t));
    for (const shift of [0, -12, 12]) {
      const tones = byPitch(inverted.map((t) => ({ ...t, midi: t.midi + shift })));
      const lowest = tones[0]?.midi ?? 0;
      const highest = tones[tones.length - 1]?.midi ?? 0;
      if (lowest >= LOWEST && highest <= HIGHEST) voicings.push(tones);
    }
  }
  // A chord that reaches too high even in root position (a thirteenth on B) is used as it is.
  return voicings.length > 0 ? voicings : [byPitch(base)];
}

/**
 * Pairs every tone of the smaller voicing with a different tone of the larger
 * one so that the total distance is as small as possible. In one dimension
 * the best pairing never crosses, so a table over the sorted tones finds it.
 * Returns index pairs (into `small` and `large`) and the cost.
 */
function pairTones(small: readonly VoicedTone[], large: readonly VoicedTone[]) {
  const n = small.length;
  const m = large.length;
  const dist = (i: number, j: number) => Math.abs((small[i]?.midi ?? 0) - (large[j]?.midi ?? 0));
  // best[i][j]: the cheapest way to pair the first i small tones among the first j large tones.
  const best = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, () => (i === 0 ? 0 : Infinity)),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= m; j++) {
      const skip = best[i]?.[j - 1] ?? Infinity;
      const take = (best[i - 1]?.[j - 1] ?? Infinity) + dist(i - 1, j - 1);
      (best[i] as number[])[j] = Math.min(skip, take);
    }
  }
  const pairs: [number, number][] = [];
  let i = n;
  let j = m;
  while (i > 0) {
    const here = best[i]?.[j] ?? Infinity;
    const take = (best[i - 1]?.[j - 1] ?? Infinity) + dist(i - 1, j - 1);
    if (j >= i && here === take) {
      pairs.push([i - 1, j - 1]);
      i--;
    }
    j--;
  }
  return { pairs: pairs.reverse(), cost: best[n]?.[m] ?? 0 };
}

/** The cheapest total movement between two voicings. */
function movement(a: readonly VoicedTone[], b: readonly VoicedTone[]): number {
  return a.length <= b.length ? pairTones(a, b).cost : pairTones(b, a).cost;
}

/** How the voiced chord `from` moves into the voiced chord `to`. */
function link(from: readonly VoicedTone[], to: readonly VoicedTone[]): VoiceLeading {
  const lower = byPitch(from);
  const upper = byPitch(to);
  const fromIsSmaller = lower.length <= upper.length;
  const { pairs, cost } = fromIsSmaller ? pairTones(lower, upper) : pairTones(upper, lower);
  const moves: ToneMove[] = [];
  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();
  for (const [s, l] of pairs) {
    const [fi, ti] = fromIsSmaller ? [s, l] : [l, s];
    const a = lower[fi];
    const b = upper[ti];
    if (!a || !b) continue;
    usedFrom.add(fi);
    usedTo.add(ti);
    moves.push({ from: a, to: b, semitones: b.midi - a.midi });
  }
  return {
    from: lower,
    to: upper,
    moves,
    dropped: lower.filter((_, i) => !usedFrom.has(i)),
    added: upper.filter((_, i) => !usedTo.has(i)),
    total: cost,
  };
}

/**
 * How to go from one chord to the next with as little movement as possible.
 * `from` is voiced as given (root position near middle C by default) and `to`
 * in the inversion and octave that lie closest to it. C → Am keeps C and E
 * and moves G up to A (2 semitones); C7 → F keeps C, moves E up to F and B♭
 * down to A, and lets the G drop out (2 semitones).
 */
export function voiceLeading(
  from: Chord,
  to: Chord,
  fromVoicing: readonly VoicedTone[] = rootPosition(from),
): VoiceLeading {
  const lower = byPitch(fromVoicing);
  let bestVoicing: VoicedTone[] | undefined;
  let bestCost = Infinity;
  for (const voicing of voicingsOf(to)) {
    const cost = movement(lower, voicing);
    if (cost < bestCost) {
      bestCost = cost;
      bestVoicing = voicing;
    }
  }
  return link(lower, bestVoicing ?? byPitch(rootPosition(to)));
}

/** A progression voiced for the least movement overall, and how each step moves. */
export interface VoicedProgression {
  /** Every chord's voicing, low to high. */
  readonly voicings: readonly (readonly VoicedTone[])[];
  /** One entry for each step from a chord to the next. */
  readonly transitions: readonly VoiceLeading[];
  /** The movement of all steps together, in semitones. */
  readonly total: number;
}

/**
 * Voices a whole progression. The first chord is in root position near middle
 * C; each of the others takes the inversion and octave that make the
 * movement of the whole progression smallest, not just of the next step.
 */
export function voiceProgression(chords: readonly Chord[]): VoicedProgression {
  const first = chords[0];
  if (!first) return { voicings: [], transitions: [], total: 0 };

  const candidates = chords.map((chord, i) =>
    i === 0 ? [byPitch(rootPosition(chord))] : voicingsOf(chord),
  );
  // cheapest[i][k]: the least movement to reach candidate k of chord i; from[i][k] is where it came from.
  const cheapest: number[][] = [[0]];
  const from: number[][] = [[0]];
  for (let i = 1; i < candidates.length; i++) {
    const here = candidates[i] ?? [];
    const before = candidates[i - 1] ?? [];
    const costs: number[] = [];
    const origins: number[] = [];
    for (const voicing of here) {
      let bestCost = Infinity;
      let origin = 0;
      before.forEach((previous, k) => {
        const cost = (cheapest[i - 1]?.[k] ?? Infinity) + movement(previous, voicing);
        if (cost < bestCost) {
          bestCost = cost;
          origin = k;
        }
      });
      costs.push(bestCost);
      origins.push(origin);
    }
    cheapest.push(costs);
    from.push(origins);
  }

  const last = cheapest[cheapest.length - 1] ?? [0];
  let k = last.indexOf(Math.min(...last));
  const chosen: number[] = [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    chosen[i] = k;
    k = from[i]?.[k] ?? 0;
  }
  const voicings = candidates.map((options, i) => options[chosen[i] ?? 0] ?? []);
  const transitions = voicings.slice(1).map((voicing, i) => link(voicings[i] ?? [], voicing));
  return { voicings, transitions, total: transitions.reduce((sum, t) => sum + t.total, 0) };
}

/** A tone's name for the reader, e.g. "E♭". */
const nameOf = (tone: VoicedTone) => formatNote(tone.note);

const list = (names: readonly string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/**
 * One line about a step: which tones stay, which move and how far, which drop
 * out or join, and the total movement. "C and E stay · G → A · 2 semitones in total".
 */
export function describeVoiceLeading(leading: VoiceLeading): string {
  const stayed = leading.moves.filter((m) => m.semitones === 0);
  const moved = leading.moves.filter((m) => m.semitones !== 0);
  const parts: string[] = [];
  if (stayed.length > 0) {
    parts.push(
      `${list(stayed.map((m) => nameOf(m.from)))} ${stayed.length === 1 ? "stays" : "stay"}`,
    );
  }
  for (const m of moved) parts.push(`${nameOf(m.from)} → ${nameOf(m.to)}`);
  if (leading.dropped.length > 0) parts.push(`${list(leading.dropped.map(nameOf))} dropped`);
  if (leading.added.length > 0) parts.push(`${list(leading.added.map(nameOf))} added`);
  parts.push(`${leading.total} ${leading.total === 1 ? "semitone" : "semitones"} in total`);
  return parts.join(" · ");
}

/** What happens to one tone between two chords, for drawing a line on the keyboard. */
export type LinkKind = "stay" | "up" | "down" | "dropped" | "added";

/** One line between the two keyboards: from a key of the first chord, to a key of the second, or to neither. */
export interface VoiceLink {
  readonly kind: LinkKind;
  /** The tone's key in the first chord; absent for an added tone. */
  readonly from?: VoicedTone;
  /** The tone's key in the second chord; absent for a dropped tone. */
  readonly to?: VoicedTone;
  /** The movement in words and signs that do not rely on colour: "stays", "+2", "−3", "dropped", "added". */
  readonly label: string;
}

/**
 * The lines to draw between a chord and the next on the keyboard: a straight
 * line for each tone that stays, a slanted one for each that moves (up or
 * down, with the distance), and a stub for each tone that drops out or joins.
 * Ordered from the lowest tone up.
 */
export function voiceLinks(leading: VoiceLeading): VoiceLink[] {
  const links: VoiceLink[] = [];
  for (const m of leading.moves) {
    const kind: LinkKind = m.semitones === 0 ? "stay" : m.semitones > 0 ? "up" : "down";
    const label =
      kind === "stay" ? "stays" : `${m.semitones > 0 ? "+" : "−"}${Math.abs(m.semitones)}`;
    links.push({ kind, from: m.from, to: m.to, label });
  }
  for (const tone of leading.dropped) links.push({ kind: "dropped", from: tone, label: "dropped" });
  for (const tone of leading.added) links.push({ kind: "added", to: tone, label: "added" });
  const pitch = (link: VoiceLink) => (link.from ?? link.to)?.midi ?? 0;
  return links.sort((a, b) => pitch(a) - pitch(b));
}

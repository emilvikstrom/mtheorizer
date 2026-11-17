import { type Chord, buildChord, preferredRootSpelling } from "./chords";
import { type Note, mod12, pitchClass } from "./notes";

/** A dominant seventh and the dominant seventh a tritone away that can stand in for it. */
export interface TritoneSubstitution {
  readonly original: Chord;
  readonly substitute: Chord;
  /**
   * The tritone the two chords share, as each spells it: [third, seventh]. The third of one is
   * the seventh of the other, so G7 has B–F and D♭7 has F–C♭ (the same two keys).
   */
  readonly shared: {
    readonly original: readonly [Note, Note];
    readonly substitute: readonly [Note, Note];
  };
}

/** Whether a chord is a plain dominant seventh (the only chord this substitution is defined for). */
export function isDominantSeventh(chord: { readonly quality?: { readonly id: string } }): boolean {
  return chord.quality?.id === "dominant7";
}

/**
 * The tritone substitute of a dominant seventh: the dominant seventh whose root lies a tritone
 * above (G7 → D♭7). The two chords share their third and seventh, which only swap roles, and the
 * substitute resolves down a half step (D♭7 → C) instead of down a fifth (G7 → C). The root is
 * spelled for the fewest accidentals, as for every other chord. Anything that is not a plain
 * dominant seventh has no substitute here.
 */
export function tritoneSubstitute(chord: Chord): TritoneSubstitution | undefined {
  if (!isDominantSeventh(chord)) return undefined;
  const root = preferredRootSpelling(mod12(pitchClass(chord.root) + 6), "dominant7");
  const substitute = buildChord(root, "dominant7");
  const toneOf = (c: Chord, role: string): Note => {
    const tone = c.tones.find((t) => t.role === role);
    if (!tone) throw new Error(`A dominant seventh has a ${role}`);
    return tone.note;
  };
  return {
    original: chord,
    substitute,
    shared: {
      original: [toneOf(chord, "third"), toneOf(chord, "seventh")],
      substitute: [toneOf(substitute, "third"), toneOf(substitute, "seventh")],
    },
  };
}

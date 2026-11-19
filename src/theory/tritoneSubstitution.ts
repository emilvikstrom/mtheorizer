import { type Chord, type ChordQualityId, buildChord, preferredRootSpelling } from "./chords";
import { type Note, mod12, pitchClass } from "./notes";

/**
 * The quality of the substitute for each dominant chord. The substitute keeps the colour of the
 * original: a ninth stays a ninth and the altered ninths stay altered. A thirteenth becomes a
 * seventh with a sharp eleven (G13 → D♭7♯11): the root and the thirteenth of G13 are the sharp
 * eleven and the sharp nine of D♭, so the lydian dominant is the chord that keeps the sound. A
 * suspended fourth stays suspended, though the two sus chords have no key in common.
 */
const SUBSTITUTE_QUALITY: Partial<Record<ChordQualityId, ChordQualityId>> = {
  dominant7: "dominant7",
  dominant9: "dominant9",
  dominant13: "dominant7Sharp11",
  dominant7Flat9: "dominant7Flat9",
  dominant7Sharp9: "dominant7Sharp9",
  dominant7Sus4: "dominant7Sus4",
};

/** A dominant chord and the dominant chord a tritone away that can stand in for it. */
export interface TritoneSubstitution {
  readonly original: Chord;
  readonly substitute: Chord;
  /**
   * The keys the two chords have in common (by pitch class), each as its own chord spells them and
   * lowest first. For G7 and D♭7 they are the third and seventh, B–F and F–C♭, which swap roles;
   * longer chords can share more (G13 and D♭7♯11 also share G). Empty for sus chords.
   */
  readonly shared: {
    readonly original: readonly Note[];
    readonly substitute: readonly Note[];
  };
}

/** Whether a chord is a plain dominant seventh. */
export function isDominantSeventh(chord: { readonly quality?: { readonly id: string } }): boolean {
  return chord.quality?.id === "dominant7";
}

/**
 * Whether a chord has a tritone substitute: the dominant seventh and its 9, 13, 7♭9, 7♯9 and
 * 7sus4 variants.
 */
export function hasTritoneSubstitute(chord: {
  readonly quality?: { readonly id: string };
}): boolean {
  return chord.quality !== undefined && chord.quality.id in SUBSTITUTE_QUALITY;
}

/**
 * The tritone substitute of a dominant chord: the dominant chord whose root lies a tritone above
 * (G7 → D♭7, G13 → D♭7♯11), with the same colour (see `SUBSTITUTE_QUALITY`). The two chords share
 * their third and seventh, which only swap roles, and the substitute resolves down a half step
 * (D♭7 → C) instead of down a fifth (G7 → C). The root is spelled for the fewest accidentals, as
 * for every other chord. Anything that is not such a dominant chord has no substitute here.
 */
export function tritoneSubstitute(chord: Chord): TritoneSubstitution | undefined {
  const quality = chord.quality ? SUBSTITUTE_QUALITY[chord.quality.id] : undefined;
  if (!quality) return undefined;
  const root = preferredRootSpelling(mod12(pitchClass(chord.root) + 6), quality);
  const substitute = buildChord(root, quality);
  const pcs = (c: Chord) => new Set(c.tones.map((t) => pitchClass(t.note)));
  const inOriginal = pcs(chord);
  const inSubstitute = pcs(substitute);
  const common = (c: Chord, other: Set<number>) =>
    c.tones.filter((t) => other.has(pitchClass(t.note))).map((t) => t.note);
  return {
    original: chord,
    substitute,
    shared: {
      original: common(chord, inSubstitute),
      substitute: common(substitute, inOriginal),
    },
  };
}

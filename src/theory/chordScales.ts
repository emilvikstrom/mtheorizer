import { type Chord, type ChordQualityId, buildChord } from "./chords";
import { type Note, mod12, note, pitchClass } from "./notes";
import { SCALES, type ScaleId, type SpelledScale } from "./scales";

/**
 * The scales that fit over a chord of each quality, best first. Every scale starts on the root of
 * the chord (C major seventh: C Ionian and C Lydian). Qualities that are not listed take the
 * scales that contain all their required tones, see `scalesForChord`.
 */
export const CHORD_SCALES: Partial<Record<ChordQualityId, readonly ScaleId[]>> = {
  major: ["major", "lydian", "mixolydian"],
  minor: ["dorian", "naturalMinor", "phrygian"],
  diminished: ["locrian"],
  major6: ["major", "lydian"],
  minor6: ["dorian", "melodicMinor"],
  major7: ["major", "lydian"],
  dominant7: ["mixolydian", "lydianDominant", "altered"],
  minor7: ["dorian", "naturalMinor"],
  minorMajor7: ["melodicMinor", "harmonicMinor"],
  halfDiminished7: ["locrian", "locrianNatural2"],
  dominant9: ["mixolydian", "lydianDominant"],
  major9: ["major", "lydian"],
  minor9: ["dorian", "naturalMinor"],
  dominant7Flat9: ["phrygianDominant", "diminishedHalfWhole", "altered"],
  dominant7Sharp9: ["altered"],
  dominant7Sharp5Sharp9: ["altered"],
  dominant7Flat5: ["lydianDominant", "altered"],
  dominant7Sharp11: ["lydianDominant"],
  major7Sharp11: ["lydian"],
  dominant13: ["mixolydian", "lydianDominant"],
  major13: ["major", "lydian"],
  minor13: ["dorian"],
  dominant7Flat13: ["mixolydianFlat6", "altered"],
  augmented7: ["altered"],
  dominant7Sus4: ["mixolydian"],
};

const SEVEN_NOTE_SCALES = (Object.keys(SCALES) as ScaleId[]).filter(
  (id) => SCALES[id].degrees.length === 7,
);

/** Pitch classes of `scaleId` above its tonic. */
function scalePitchClasses(scaleId: ScaleId): Set<number> {
  return new Set(SCALES[scaleId].degrees.map((d) => d.semitones % 12));
}

/** The pitch classes a chord needs, above its root: everything that is not optional. */
function requiredPitchClasses(chord: Chord): number[] {
  const root = pitchClass(chord.root);
  return chord.tones.filter((t) => !t.optional).map((t) => mod12(pitchClass(t.note) - root));
}

/** Whether a scale on the root of `chord` contains every tone the chord needs. */
export function scaleFitsChord(chord: Chord, scaleId: ScaleId): boolean {
  const pcs = scalePitchClasses(scaleId);
  return requiredPitchClasses(chord).every((pc) => pcs.has(pc));
}

/**
 * The scales to play over a chord, best first, all starting on its root. A chord of a named
 * quality takes the list in `CHORD_SCALES`; any other chord (a free combination from the chord
 * builder, or a quality without an entry) takes the seven-note scales that contain its tones.
 */
export function scalesForChord(chord: Chord): ScaleId[] {
  const listed = chord.quality ? CHORD_SCALES[chord.quality.id] : undefined;
  if (listed) return [...listed];
  return SEVEN_NOTE_SCALES.filter((id) => scaleFitsChord(chord, id));
}

/** A chord built on one degree of a scale, stacking thirds from the scale's own tones. */
export interface ScaleChord {
  /** Scale degree of the root, 1 = tonic … 7. */
  readonly degree: number;
  readonly root: Note;
  /** The triad on this degree, if it is one of the named triads. */
  readonly triad?: ChordQualityId;
  /** The seventh chord on this degree, if it is one of the named seventh chords. */
  readonly seventh?: ChordQualityId;
}

const TRIADS: readonly ChordQualityId[] = ["major", "minor", "diminished", "augmented"];
const SEVENTHS: readonly ChordQualityId[] = [
  "major7",
  "dominant7",
  "minor7",
  "minorMajor7",
  "halfDiminished7",
  "diminished7",
  "augmented7",
  "augmentedMajor7",
];

const patternKey = (pcs: readonly number[]) => [...pcs].sort((a, b) => a - b).join(",");

const patternOf = (id: ChordQualityId) =>
  patternKey(
    buildChord(note("C"), id).tones.map((t) => mod12(pitchClass(t.note) - pitchClass(note("C")))),
  );

const BY_PATTERN = new Map<string, ChordQualityId>(
  [...TRIADS, ...SEVENTHS].map((id) => [patternOf(id), id]),
);

/**
 * The triad and the seventh chord on each degree of a seven-note scale, found by stacking thirds
 * from the scale's own tones (C major: C, Dm, Em, F, G, Am, B° and Cmaj7, Dm7 … Bm7♭5). Empty
 * for scales with fewer or more tones.
 */
export function chordsInScale(scale: SpelledScale): ScaleChord[] {
  if (scale.tones.length !== 7) return [];
  const pcs = scale.tones.map((t) => pitchClass(t.note));
  return scale.tones.map((root, i) => {
    const above = (steps: number) => mod12((pcs[(i + steps) % 7] ?? 0) - (pcs[i] ?? 0));
    const triad = BY_PATTERN.get(patternKey([0, above(2), above(4)]));
    const seventh = BY_PATTERN.get(patternKey([0, above(2), above(4), above(6)]));
    return {
      degree: i + 1,
      root: root.note,
      ...(triad && TRIADS.includes(triad) ? { triad } : {}),
      ...(seventh && SEVENTHS.includes(seventh) ? { seventh } : {}),
    };
  });
}

/** The name of a chord quality on a root, e.g. "E♭m7": the symbol the chord view shows. */
export function scaleChordSymbol(root: Note, id: ChordQualityId): string {
  return buildChord(root, id).symbol;
}

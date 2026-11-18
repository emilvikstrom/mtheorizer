import { type ChordQualityId, buildChord, chordSymbol } from "./chords";
import {
  AUGMENTED_FOURTH,
  MAJOR_SECOND,
  MINOR_SECOND,
  MINOR_SIXTH,
  MINOR_THIRD,
  transpose,
} from "./intervals";
import { type Key } from "./keys";
import { type Note, formatNote, pitchClass } from "./notes";

/**
 * Classical chromatic chords: the Neapolitan sixth and the three augmented
 * sixth chords. They are built from the tonic by interval, so the spelling is
 * the one the voice leading asks for: F♯ (never G♭) in the German sixth in C.
 */

export type ChromaticChordId = "neapolitan" | "italian" | "french" | "german";

/** A dominant-type chord that sounds the same as an augmented sixth chord. */
export interface SoundsLike {
  /** Chord symbol, e.g. "A♭7" for the German sixth in C. */
  readonly symbol: string;
  readonly root: Note;
  readonly qualityId: ChordQualityId;
  /** The notes of that chord, as it spells them: A♭–C–E♭–G♭. */
  readonly notes: readonly Note[];
  /** The one key that is spelled two ways: F♯ in the augmented sixth, G♭ in the dominant chord. */
  readonly respelled: { readonly here: Note; readonly there: Note };
}

export interface ChromaticChord {
  readonly id: ChromaticChordId;
  readonly name: string;
  /** Short label as written in analysis: ♭II6, It+6, Fr+6, Ger+6. */
  readonly roman: string;
  /** Lowest note first: F–A♭–D♭ for the Neapolitan sixth in C (first inversion). */
  readonly notes: readonly Note[];
  readonly bass: Note;
  /** Chord symbol where the chord has one: D♭/F. Augmented sixths have none. */
  readonly symbol?: string;
  /** A chord to open in the chord view: the Neapolitan triad, or the dominant seventh it sounds like. */
  readonly open?: { readonly root: Note; readonly qualityId: ChordQualityId };
  readonly soundsLike?: SoundsLike;
  /** One sentence on what the chord is and where it goes. */
  readonly description: string;
}

function soundsLike(root: Note, qualityId: ChordQualityId, sharp4: Note): SoundsLike {
  const notes = buildChord(root, qualityId).tones.map((tone) => tone.note);
  const there = notes.find((n) => pitchClass(n) === pitchClass(sharp4));
  return {
    symbol: chordSymbol(root, qualityId),
    root,
    qualityId,
    notes,
    respelled: { here: sharp4, there: there ?? sharp4 },
  };
}

/**
 * The Neapolitan sixth and the Italian, French and German sixths of a key.
 * They are spelled the same in a major key and its parallel minor, since all
 * four use the lowered second or lowered sixth degree.
 *
 * - Neapolitan sixth: the major triad on ♭II in first inversion, so the third is in the bass
 *   (D♭/F in C: F–A♭–D♭).
 * - Augmented sixth chords share ♭6 in the bass and ♯4 above, which open out to an octave on
 *   the dominant. Italian adds the tonic (A♭–C–F♯); French adds 2 as well (A♭–C–D–F♯);
 *   German adds ♭3 instead (A♭–C–E♭–F♯).
 */
export function chromaticChords(k: Key): ChromaticChord[] {
  const tonic = k.tonic;
  const flat2 = transpose(tonic, MINOR_SECOND);
  const flat6 = transpose(tonic, MINOR_SIXTH);
  const sharp4 = transpose(tonic, AUGMENTED_FOURTH);
  const flat3 = transpose(tonic, MINOR_THIRD);
  const two = transpose(tonic, MAJOR_SECOND);

  const triad = buildChord(flat2, "major").tones.map((tone) => tone.note);
  const third = triad[1] ?? flat2;
  const fifth = triad[2] ?? flat2;

  return [
    {
      id: "neapolitan",
      name: "Neapolitan sixth",
      roman: "♭II6",
      notes: [third, fifth, flat2],
      bass: third,
      symbol: `${chordSymbol(flat2, "major")}/${formatNote(third)}`,
      open: { root: flat2, qualityId: "major" },
      description:
        "A major triad on the lowered second degree with its third in the bass. It stands in for the subdominant and leads to the dominant.",
    },
    {
      id: "italian",
      name: "Italian sixth",
      roman: "It+6",
      notes: [flat6, tonic, sharp4],
      bass: flat6,
      description:
        "Lowered sixth in the bass, the tonic and the raised fourth. The outer notes are an augmented sixth that opens out to an octave on the dominant.",
    },
    {
      id: "french",
      name: "French sixth",
      roman: "Fr+6",
      notes: [flat6, tonic, two, sharp4],
      bass: flat6,
      soundsLike: soundsLike(two, "dominant7Flat5", sharp4),
      open: { root: two, qualityId: "dominant7Flat5" },
      description:
        "The Italian sixth with the second degree added. It sounds like a dominant seventh with a flattened fifth on the second degree.",
    },
    {
      id: "german",
      name: "German sixth",
      roman: "Ger+6",
      notes: [flat6, tonic, flat3, sharp4],
      bass: flat6,
      soundsLike: soundsLike(flat6, "dominant7", sharp4),
      open: { root: flat6, qualityId: "dominant7" },
      description:
        "The Italian sixth with the lowered third added. It sounds like a dominant seventh on the lowered sixth, but the seventh is spelled as a raised fourth because it moves up to the dominant.",
    },
  ];
}

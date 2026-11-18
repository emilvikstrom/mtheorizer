import {
  type Chord,
  type Note,
  type ScaleId,
  SCALES,
  enharmonicChords,
  enharmonicTonics,
  formatNote,
  scaleLabel,
  spellScale,
} from "../theory";

const SPELLING_NOTE =
  "The keys are the same but the spelling is not. Which spelling is right depends on what the chord does in the key, not on how it sounds.";

interface SameNotesChordProps {
  chord: Chord;
  /** Opens the same quality on another root. */
  onOpen: (root: Note) => void;
}

/**
 * For a chord that divides the octave into equal parts (a diminished seventh, an augmented
 * triad): the chords on other roots that use exactly the same keys, spelled differently. Renders
 * nothing for every other chord.
 */
export function SameNotesAsChord({ chord, onOpen }: SameNotesChordProps) {
  const chords = enharmonicChords(chord);
  const [, ...others] = chords;
  if (others.length === 0) return null;
  return (
    <section className="same" aria-labelledby="same-chord-title">
      <h3 id="same-chord-title" className="same__title">
        Same notes as
      </h3>
      <p className="same__text">
        {chords.map((c) => c.symbol).join(" = ")}: they all use the same {chord.tones.length} keys
        on the piano. {SPELLING_NOTE}
      </p>
      <ul className="same__list">
        {others.map((c) => (
          <li key={c.symbol}>
            <button type="button" className="play__button" onClick={() => onOpen(c.root)}>
              {c.symbol} ({c.tones.map((t) => formatNote(t.note)).join("–")})
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SameNotesScaleProps {
  tonic: Note;
  scaleId: ScaleId;
  /** Opens the same scale on another tonic. */
  onOpen: (tonic: Note) => void;
}

/**
 * For a scale that repeats inside the octave (whole tone, the diminished scales): the tonics that
 * give the same scale on the same keys. Renders nothing for every other scale.
 */
export function SameNotesAsScale({ tonic, scaleId, onOpen }: SameNotesScaleProps) {
  const tonics = enharmonicTonics(tonic, scaleId);
  const [, ...others] = tonics;
  if (others.length === 0) return null;
  const label = scaleLabel(SCALES[scaleId]).toLowerCase();
  return (
    <section className="same" aria-labelledby="same-scale-title">
      <h3 id="same-scale-title" className="same__title">
        Same notes as
      </h3>
      <p className="same__text">
        The {label} scale repeats itself, so it only has {tonics.length} different sets of keys:{" "}
        {tonics.map(formatNote).join(", ")} {label} all use the same keys. {SPELLING_NOTE}
      </p>
      <ul className="same__list">
        {others.map((t) => (
          <li key={formatNote(t)}>
            <button type="button" className="play__button" onClick={() => onOpen(t)}>
              {formatNote(t)} {label} (
              {spellScale(t, scaleId)
                .tones.map((x) => formatNote(x.note))
                .join(" ")}
              )
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

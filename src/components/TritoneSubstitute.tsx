import { audioSupported, planProgression, playNotes } from "../audio/playback";
import { type Chord, type Note, chordOnKeyboard, formatNote, tritoneSubstitute } from "../theory";

interface TritoneSubstituteProps {
  chord: Chord;
  /** Opens the substitute: the chord view moves to the dominant seventh on this root. */
  onOpen: (root: Note) => void;
}

const pair = (notes: readonly [Note, Note]) => `${formatNote(notes[0])}–${formatNote(notes[1])}`;

/**
 * For a dominant seventh: the dominant seventh a tritone away that can replace it, why (they share
 * the same two keys, the third and the seventh, which swap roles), and a way to hear both.
 * Renders nothing for any other chord.
 */
export function TritoneSubstitute({ chord, onOpen }: TritoneSubstituteProps) {
  const result = tritoneSubstitute(chord);
  if (!result) return null;
  const { original, substitute, shared } = result;
  const midis = (c: Chord) => chordOnKeyboard(c, 4).map((k) => k.midi);
  return (
    <section className="tritone" aria-labelledby="tritone-title">
      <h3 id="tritone-title" className="tritone__title">
        Tritone substitute
      </h3>
      <p className="tritone__text">
        <strong>{substitute.symbol}</strong> can stand in for {original.symbol}. Both chords contain
        the same tritone: the third and seventh of {original.symbol} are{" "}
        <span className="tritone__notes">{pair(shared.original)}</span>, and the third and seventh
        of {substitute.symbol} are <span className="tritone__notes">{pair(shared.substitute)}</span>{" "}
        (the same two keys, with their roles swapped). {substitute.symbol} then resolves down a half
        step instead of down a fifth.
      </p>
      <div className="tritone__actions">
        <button type="button" className="play__button" onClick={() => onOpen(substitute.root)}>
          Open {substitute.symbol}
        </button>
        {audioSupported() && (
          <button
            type="button"
            className="play__button"
            aria-label={`Play ${original.symbol} then ${substitute.symbol}`}
            onClick={() => playNotes(planProgression([midis(original), midis(substitute)]))}
          >
            ▶ Play {original.symbol} → {substitute.symbol}
          </button>
        )}
      </div>
    </section>
  );
}

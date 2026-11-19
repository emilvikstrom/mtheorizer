import { audioSupported, planProgression, playNotes } from "../audio/playback";
import {
  type Chord,
  type Note,
  chordOnKeyboard,
  formatNote,
  isDominantSeventh,
  tritoneSubstitute,
} from "../theory";

interface TritoneSubstituteProps {
  chord: Chord;
  /** Opens the substitute: the chord view moves to the dominant seventh on this root. */
  onOpen: (root: Note) => void;
}

const keys = (notes: readonly Note[]) => notes.map(formatNote).join("–");

/**
 * For a dominant chord (7, 9, 13, 7♭9, 7♯9, 7sus4): the dominant chord a tritone away that can
 * replace it, why (they share keys, for a plain seventh the third and the seventh, which swap
 * roles), and a way to hear both. Renders nothing for any other chord.
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
        <strong>{substitute.symbol}</strong> can stand in for {original.symbol}.{" "}
        {shared.original.length === 0 ? (
          <>
            The two suspended chords have no key in common, but both keep the suspension, and{" "}
            {substitute.symbol} resolves down a half step instead of down a fifth.
          </>
        ) : (
          <>
            Both chords contain the same keys: in {original.symbol} they are{" "}
            <span className="tritone__notes">{keys(shared.original)}</span>, and in{" "}
            {substitute.symbol} they are{" "}
            <span className="tritone__notes">{keys(shared.substitute)}</span>
            {isDominantSeventh(original)
              ? " (the third and seventh, with their roles swapped)"
              : " (spelled from the other root)"}
            . {substitute.symbol} then resolves down a half step instead of down a fifth.
          </>
        )}
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

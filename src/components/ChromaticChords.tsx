import {
  type ChordQualityId,
  type Key,
  type Note,
  chromaticChords,
  formatKey,
  formatNote,
} from "../theory";

interface ChromaticChordsProps {
  value: Key;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

const tones = (notes: readonly Note[]) => notes.map((n) => formatNote(n)).join("–");

/** The Neapolitan sixth and the Italian, French and German sixths of the selected key. */
export function ChromaticChords({ value, onOpenChord }: ChromaticChordsProps) {
  const chords = chromaticChords(value);

  return (
    <div className="key-details__section chromatic">
      <h3 className="key-details__heading">Chromatic chords</h3>
      <p className="key-details__text">
        Classical chords from outside the scale that lead to the dominant in {formatKey(value)}.
        Notes are listed from the bass up.
      </p>
      <ol className="chromatic__list" aria-label="Chromatic chords">
        {chords.map((chord) => {
          const open = chord.open;
          const label = chord.soundsLike?.symbol ?? chord.symbol?.split("/")[0];
          return (
            <li key={chord.id} className="chromatic__item">
              <div className="chromatic__head">
                <span className="chromatic__roman">{chord.roman}</span>
                <h4 className="chromatic__name">{chord.name}</h4>
                {chord.symbol && <span className="chromatic__symbol">{chord.symbol}</span>}
              </div>
              <p className="chromatic__notes">{tones(chord.notes)}</p>
              <p className="chromatic__text">{chord.description}</p>
              {chord.soundsLike && (
                <p className="chromatic__text">
                  Sounds like <strong>{chord.soundsLike.symbol}</strong> (
                  {tones(chord.soundsLike.notes)}), where{" "}
                  {formatNote(chord.soundsLike.respelled.here)} is spelled{" "}
                  {formatNote(chord.soundsLike.respelled.there)}.
                </p>
              )}
              {open && (
                <button
                  type="button"
                  className="play__button"
                  onClick={() => onOpenChord(open.root, open.qualityId)}
                >
                  {`Open ${label} in Chords & scales`}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

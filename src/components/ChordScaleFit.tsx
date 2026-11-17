import {
  type Chord,
  type ChordQualityId,
  type Note,
  SCALES,
  type ScaleId,
  type SpelledScale,
  chordsInScale,
  formatNote,
  scaleChordSymbol,
  scaleLabel,
  scalesForChord,
} from "../theory";

interface ScalesThatFitProps {
  chord: Chord;
  /** Opens the scale on the root of the chord in the scale view. */
  onOpen: (scaleId: ScaleId) => void;
}

/**
 * The scales that can be played over a chord, each starting on the chord's root, as buttons that
 * open the scale. Renders nothing for a chord that no scale here covers (a diminished seventh).
 */
export function ScalesThatFit({ chord, onOpen }: ScalesThatFitProps) {
  const scales = scalesForChord(chord);
  if (scales.length === 0) return null;
  const root = formatNote(chord.root);
  return (
    <section className="fit" aria-labelledby="scales-fit-title">
      <h3 id="scales-fit-title" className="fit__title">
        Scales that fit
      </h3>
      <p className="fit__text">
        Over {chord.symbol} you can play these scales, each starting on {root}.
      </p>
      <ul className="fit__list">
        {scales.map((id) => (
          <li key={id}>
            <button type="button" className="play__button" onClick={() => onOpen(id)}>
              {root} {scaleLabel(SCALES[id])}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ChordsThatFitProps {
  scale: SpelledScale;
  /** Opens the chord on this root in the chord view. */
  onOpen: (root: Note, quality: ChordQualityId) => void;
}

/**
 * The triad and the seventh chord on every degree of a seven-note scale, built from the scale's
 * own tones. Renders nothing for the pentatonic and blues scales.
 */
export function ChordsThatFit({ scale, onOpen }: ChordsThatFitProps) {
  const chords = chordsInScale(scale);
  if (chords.length === 0) return null;
  return (
    <section className="fit" aria-labelledby="chords-fit-title">
      <h3 id="chords-fit-title" className="fit__title">
        Chords that fit
      </h3>
      <p className="fit__text">
        The chords you get by stacking thirds on each note of the{" "}
        {scale.name.replace(/ scale$/, "")} scale.
      </p>
      <table className="fit__table">
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Triad</th>
            <th scope="col">Seventh</th>
          </tr>
        </thead>
        <tbody>
          {chords.map((c) => (
            <tr key={c.degree}>
              <th scope="row">{c.degree}</th>
              {([c.triad, c.seventh] as const).map((id, i) => (
                <td key={i}>
                  {id ? (
                    <button
                      type="button"
                      className="play__button fit__chord"
                      onClick={() => onOpen(c.root, id)}
                    >
                      {scaleChordSymbol(c.root, id)}
                    </button>
                  ) : (
                    "–"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

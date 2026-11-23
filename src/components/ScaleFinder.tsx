import { useMemo } from "react";
import {
  type SpelledScale,
  commonSpellings,
  formatNote,
  scaleLabel,
  scalesContaining,
} from "../theory";

/** Too few notes fit almost anything; this many results are enough to choose from. */
const MAX_RESULTS = 12;
const MIN_NOTES = 3;

const pitchName = (pc: number) => commonSpellings(pc).map(formatNote).join("/");
const scaleTitle = (scale: SpelledScale) =>
  `${formatNote(scale.tonic)} ${scaleLabel(scale.scale).toLowerCase()}`;

interface ScaleFinderProps {
  /** Pitch classes (0 = C), in the order they were picked; the first is taken as the tonic. */
  notes: readonly number[];
  onChange: (notes: readonly number[]) => void;
  onOpen: (scale: SpelledScale) => void;
}

/** Pick notes and see the scales that hold them all: the reverse of looking a scale up. */
export function ScaleFinder({ notes, onChange, onOpen }: ScaleFinderProps) {
  const results = useMemo(() => scalesContaining(notes), [notes]);
  const toggle = (pc: number) =>
    onChange(notes.includes(pc) ? notes.filter((n) => n !== pc) : [...notes, pc]);
  const first = notes[0];

  return (
    <section className="scale-finder" aria-labelledby="scale-finder-heading">
      <h2 id="scale-finder-heading" className="scale-finder__heading">
        Which scales have these notes?
      </h2>
      <p className="scale-finder__hint">
        Pick the notes of a melody or a riff. The first note you pick is taken as the tonic, so
        those scales are named first.
      </p>
      <div className="scale-finder__notes" role="group" aria-label="Notes">
        {Array.from({ length: 12 }, (_, pc) => (
          <button
            key={pc}
            type="button"
            className="toggle scale-finder__note"
            aria-pressed={notes.includes(pc)}
            onClick={() => toggle(pc)}
          >
            {pitchName(pc)}
            {pc === first && <span className="scale-finder__tonic"> (tonic)</span>}
          </button>
        ))}
      </div>
      <div className="finder__actions">
        <button
          type="button"
          className="finder__clear"
          disabled={notes.length === 0}
          onClick={() => onChange([])}
        >
          Clear notes
        </button>
      </div>

      <div aria-live="polite">
        {notes.length < MIN_NOTES ? (
          <p className="finder__empty">
            Pick at least {MIN_NOTES} notes. With fewer, almost every scale fits.
          </p>
        ) : results.length === 0 ? (
          <p className="finder__empty">No scale here has all of these notes. Try removing one.</p>
        ) : (
          <>
            <h3 className="finder__count">
              {results.length === 1 ? "1 set of notes fits" : `${results.length} sets of notes fit`}
            </h3>
            <ol className="scale-finder__results">
              {results.slice(0, MAX_RESULTS).map((result) => {
                const [best, ...others] = result.scales;
                if (!best) return null;
                return (
                  <li key={result.scales.map(scaleTitle).join()} className="scale-finder__result">
                    <button type="button" className="suggestion" onClick={() => onOpen(best)}>
                      <span className="suggestion__symbol">{scaleTitle(best)}</span>
                      <span className="suggestion__notes">
                        {best.tones.map((t) => formatNote(t.note)).join(" ")}
                        {" · "}
                        {result.extra === 0
                          ? "exactly these notes"
                          : `${result.extra} more note${result.extra === 1 ? "" : "s"}`}
                      </span>
                    </button>
                    {others.length > 0 && (
                      <p className="scale-finder__same">
                        Same notes:{" "}
                        {others.map((scale, i) => (
                          <span key={scaleTitle(scale)}>
                            {i > 0 && ", "}
                            <button
                              type="button"
                              className="scale-finder__link"
                              onClick={() => onOpen(scale)}
                            >
                              {scaleTitle(scale)}
                            </button>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            {results.length > MAX_RESULTS && (
              <p className="finder__more">
                Showing the {MAX_RESULTS} closest of {results.length}. Add notes to narrow it down.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

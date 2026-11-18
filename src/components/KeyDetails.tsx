import {
  type ChordQualityId,
  type HarmonicFunction,
  type Key,
  type Note,
  borrowedChords,
  secondaryDominants,
  circlePosition,
  diatonicTriads,
  dominantKey,
  formatKey,
  formatNote,
  harmonicMinorDominant,
  keyEquals,
  keyScale,
  keySignature,
  keysAt,
  parallelKey,
  relativeKey,
  subdominantKey,
} from "../theory";
import { ChromaticChords } from "./ChromaticChords";
import { PivotChords } from "./PivotChords";

const FUNCTION_LABELS: Record<HarmonicFunction, string> = {
  tonic: "Tonic",
  subdominant: "Subdominant",
  dominant: "Dominant",
};

function signatureText(key: Key): string {
  const { kind, accidentals } = keySignature(key);
  if (kind === "none") return "No sharps or flats";
  const count = accidentals.length;
  const word = kind === "sharps" ? "sharp" : "flat";
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

interface KeyDetailsProps {
  value: Key;
  onChange: (key: Key) => void;
  /** Open a diatonic chord in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

/** Signature, scale, diatonic triads and related keys for the selected key. */
export function KeyDetails({ value, onChange, onOpenChord }: KeyDetailsProps) {
  const spellings = keysAt(circlePosition(value), value.mode);
  const { accidentals } = keySignature(value);
  const harmonicDominant = harmonicMinorDominant(value);
  const borrowed = borrowedChords(value);
  const borrowedOrigin = borrowed[0]?.origin;
  const related: [string, Key][] = [
    [value.mode === "major" ? "Relative minor" : "Relative major", relativeKey(value)],
    [value.mode === "major" ? "Parallel minor" : "Parallel major", parallelKey(value)],
    ["Subdominant", subdominantKey(value)],
    ["Dominant", dominantKey(value)],
  ];

  return (
    <section className="key-details" aria-labelledby="key-name">
      <header>
        <p className="key-details__eyebrow">
          {value.mode === "major" ? "Major key" : "Minor key (natural minor)"}
        </p>
        <h2 id="key-name" className="key-details__name" aria-live="polite">
          {formatKey(value)}
        </h2>
        {spellings.length > 1 && (
          <div className="key-details__spellings" role="group" aria-label="Spelling">
            {spellings.map((k) => (
              <button
                key={formatKey(k)}
                type="button"
                className="toggle"
                aria-pressed={keyEquals(k, value)}
                onClick={() => onChange(k)}
              >
                {formatKey(k)}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="key-details__section">
        <h3 className="key-details__heading">Key signature</h3>
        <p className="key-details__text">{signatureText(value)}</p>
        {accidentals.length > 0 && (
          <ol className="pills" aria-label="Accidentals in the key signature">
            {accidentals.map((n) => (
              <li key={formatNote(n)} className="pill">
                {formatNote(n)}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="key-details__section">
        <h3 className="key-details__heading">Scale</h3>
        <ol className="pills" aria-label="Notes in the scale">
          {keyScale(value).map((n, i) => (
            <li key={formatNote(n)} className={`pill${i === 0 ? " pill--tonic" : ""}`}>
              {formatNote(n)}
            </li>
          ))}
        </ol>
      </div>

      <div className="key-details__section">
        <h3 className="key-details__heading">Diatonic triads</h3>
        <p className="key-details__text">Click a chord to open it in Chords &amp; scales.</p>
        <ol className="triads" aria-label="Diatonic triads">
          {diatonicTriads(value).map((triad) => (
            <li key={triad.degree}>
              <button
                type="button"
                className={`triad triad--${triad.quality}`}
                aria-label={`Open ${triad.symbol} in Chords & scales`}
                onClick={() => {
                  const root = triad.notes[0];
                  if (root) onOpenChord(root, triad.quality);
                }}
              >
                <span className="triad__roman">{triad.roman}</span>
                <span className="triad__symbol">{triad.symbol}</span>
                <span className="triad__function">
                  {triad.function && FUNCTION_LABELS[triad.function]}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {harmonicDominant && (
          <p className="key-details__note">
            In harmonic minor the seventh is raised, so the dominant becomes major:{" "}
            <strong>{harmonicDominant.symbol}</strong> (V).
          </p>
        )}
      </div>

      {borrowed.length > 0 && (
        <div className="key-details__section">
          <h3 className="key-details__heading">Borrowed chords</h3>
          <p className="key-details__text">
            Chords from the parallel key{borrowedOrigin && `, ${formatKey(borrowedOrigin)}`}, that
            colour {formatKey(value)}. Click one to open it.
          </p>
          <ol className="triads" aria-label="Borrowed chords">
            {borrowed.map((chord) => (
              <li key={chord.degree}>
                <button
                  type="button"
                  className={`triad triad--borrowed triad--${chord.quality}`}
                  aria-label={`Open ${chord.symbol} in Chords & scales, borrowed from ${formatKey(chord.origin)}`}
                  onClick={() => {
                    const root = chord.notes[0];
                    if (root) onOpenChord(root, chord.quality);
                  }}
                >
                  <span className="triad__roman">{chord.roman}</span>
                  <span className="triad__symbol">{chord.symbol}</span>
                  <span className="triad__function">{formatKey(chord.origin)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="key-details__section">
        <h3 className="key-details__heading">Secondary dominants</h3>
        <p className="key-details__text">
          A dominant seventh aimed at another chord of the key, as D7 leads to G in C major. The
          notes outside {formatKey(value)} are marked with a dot. Click one to open it.
        </p>
        <ol className="triads" aria-label="Secondary dominants">
          {secondaryDominants(value).map((dominant) => (
            <li key={dominant.target}>
              <button
                type="button"
                className="triad triad--secondary"
                aria-label={`Open ${dominant.symbol} in Chords & scales, ${dominant.roman}, resolves to ${dominant.targetSymbol}${
                  dominant.foreign.length > 0
                    ? `, with ${dominant.foreign.map((n) => formatNote(n)).join(" and ")} from outside the key`
                    : ", all notes in the key"
                }`}
                onClick={() => {
                  const root = dominant.notes[0];
                  if (root) onOpenChord(root, "dominant7");
                }}
              >
                <span className="triad__roman">{dominant.roman}</span>
                <span className="triad__symbol">{dominant.symbol}</span>
                <span className="triad__function">→ {dominant.targetSymbol}</span>
                <span className="triad__foreign" aria-hidden="true">
                  {dominant.foreign.length > 0
                    ? `● ${dominant.foreign.map((n) => formatNote(n)).join(" ")}`
                    : "in key"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <ChromaticChords value={value} onOpenChord={onOpenChord} />

      <PivotChords value={value} onOpenChord={onOpenChord} />

      <div className="key-details__section">
        <h3 className="key-details__heading">Related keys</h3>
        <div className="related">
          {related.map(([label, k]) => (
            <button key={label} type="button" className="related__key" onClick={() => onChange(k)}>
              <span className="related__label">{label}</span>
              <span className="related__name">{formatKey(k)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import {
  type ChordQualityId,
  type Key,
  type Note,
  formatKey,
  formatNote,
  negativeDiatonic,
} from "../theory";

interface NegativeHarmonyProps {
  value: Key;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

const tones = (notes: readonly Note[]) => notes.map((n) => formatNote(n)).join("–");

/** Each diatonic chord of the selected key next to its mirror image (experimental). */
export function NegativeHarmony({ value, onOpenChord }: NegativeHarmonyProps) {
  const [size, setSize] = useState<"triads" | "sevenths">("triads");
  const rows = negativeDiatonic(value, size);
  const tonic = formatNote(value.tonic);

  return (
    <div className="key-details__section negative">
      <h3 className="key-details__heading">
        Negative harmony <span className="negative__badge">Experimental</span>
      </h3>
      <p className="key-details__text">
        Every note is mirrored around the axis halfway between the tonic and the dominant of{" "}
        {formatKey(value)}, so {tonic} swaps with{" "}
        {formatNote(rows[0]?.negative.notes[0] ?? value.tonic)}, and the major and minor colours are
        flipped. This is one convention among several, so treat the result as an idea to try, not a
        rule.
      </p>
      <div className="negative__size" role="group" aria-label="Chord size">
        {(["triads", "sevenths"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="toggle"
            aria-pressed={size === option}
            onClick={() => setSize(option)}
          >
            {option === "triads" ? "Triads" : "Seventh chords"}
          </button>
        ))}
      </div>
      <ol className="negative__list" aria-label="Negative chords">
        {rows.map((row) => (
          <li key={row.degree} className="negative__item">
            <div className="negative__head">
              <span className="negative__roman">{row.roman}</span>
              <span className="negative__pair">
                <span className="negative__symbol">{row.source.symbol}</span>
                <span> → </span>
                <strong className="negative__symbol">{row.negative.symbol}</strong>
              </span>
            </div>
            <p className="negative__notes">
              {tones(row.source.notes)} → {tones(row.negative.notes)}
            </p>
            {row.alsoReads.length > 0 && (
              <p className="negative__text">Also reads as {row.alsoReads.join(" or ")}.</p>
            )}
            <button
              type="button"
              className="play__button"
              onClick={() => onOpenChord(row.negative.root, row.negative.qualityId)}
            >
              {`Open ${row.negative.symbol} in Chords`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

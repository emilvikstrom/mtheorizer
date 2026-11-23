import { useState } from "react";
import {
  type ChordQualityId,
  type Key,
  type LeadingToneVariant,
  type Note,
  formatKey,
  formatNote,
  secondaryLeadingToneChords,
} from "../theory";

interface LeadingToneChordsProps {
  value: Key;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

/**
 * The diminished seventh a half step below each chord of the key. They lead by half steps, not
 * by fifths, so they live with the progressions rather than on the circle of fifths.
 */
export function LeadingToneChords({ value, onOpenChord }: LeadingToneChordsProps) {
  const [leadingVariant, setLeadingVariant] = useState<LeadingToneVariant>("diminished");
  return (
    <div className="key-details__section">
      <h3 className="key-details__heading">Secondary leading-tone chords</h3>
      <p className="key-details__text">
        A diminished seventh built on the note a half step below another chord of the key, as F♯°7
        leads to G in C major. The notes outside {formatKey(value)} are marked with a dot. Click one
        to open it. Before a major chord the half-diminished seventh (the key's own viiø7) is an
        alternative; before a minor chord the diminished seventh stays.
      </p>
      <div className="negative__size" role="group" aria-label="Leading-tone chord type">
        {(["diminished", "halfDiminished"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="toggle"
            aria-pressed={leadingVariant === option}
            onClick={() => setLeadingVariant(option)}
          >
            {option === "diminished" ? "Diminished °7" : "Half-diminished ø7"}
          </button>
        ))}
      </div>
      <ol className="triads" aria-label="Secondary leading-tone chords">
        {secondaryLeadingToneChords(value, leadingVariant).map((chord) => (
          <li key={chord.target}>
            <button
              type="button"
              className="triad triad--leading"
              aria-label={`Open ${chord.symbol} in Chords, ${chord.roman}, resolves to ${chord.targetSymbol}, with ${chord.foreign.map((n) => formatNote(n)).join(" and ")} from outside the key`}
              onClick={() => {
                const root = chord.notes[0];
                if (root) onOpenChord(root, chord.quality);
              }}
            >
              <span className="triad__roman">{chord.roman}</span>
              <span className="triad__symbol">{chord.symbol}</span>
              <span className="triad__function">→ {chord.targetSymbol}</span>
              <span className="triad__foreign" aria-hidden="true">
                ● {chord.foreign.map((n) => formatNote(n)).join(" ")}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { useState } from "react";
import {
  type ChordQualityId,
  type Key,
  type Note,
  circleDistance,
  dominantKey,
  formatKey,
  keyEquals,
  keysAt,
  modulationPath,
} from "../theory";

const ALL_KEYS: Key[] = (["major", "minor"] as const).flatMap((mode) =>
  Array.from({ length: 12 }, (_, position) => keysAt(position, mode)).flat(),
);

interface PivotChordsProps {
  value: Key;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

function distanceText(from: Key, to: Key, between: number): string {
  const distance = circleDistance(from, to);
  if (distance === 0) return `${formatKey(from)} and ${formatKey(to)} have the same key signature.`;
  const steps = `${distance} step${distance === 1 ? "" : "s"} apart on the circle of fifths.`;
  if (between === 0) return steps;
  return `${steps} The route goes through ${between} key${between === 1 ? "" : "s"} in between.`;
}

/** Pick a second key and see the chords the two share, with a route along the circle. */
export function PivotChords({ value, onOpenChord }: PivotChordsProps) {
  const [target, setTarget] = useState<Key>(() => dominantKey(value));
  const same = keyEquals(value, target);
  const path = modulationPath(value, target);

  return (
    <div className="key-details__section pivots">
      <h3 className="key-details__heading">Modulating to another key</h3>
      <p className="key-details__text">
        A pivot chord belongs to both keys, so it can be heard in {formatKey(value)} and then
        reinterpreted in the new key. Click one to open it.
      </p>
      <label className="pivots__pick">
        <span className="related__label">Modulate to</span>
        <select
          className="pivots__select"
          value={formatKey(target)}
          onChange={(event) => {
            const next = ALL_KEYS.find((k) => formatKey(k) === event.target.value);
            if (next) setTarget(next);
          }}
        >
          {ALL_KEYS.map((k) => (
            <option key={formatKey(k)} value={formatKey(k)}>
              {formatKey(k)}
            </option>
          ))}
        </select>
      </label>

      {same ? (
        <p className="key-details__note">Pick a different key to see the chords they share.</p>
      ) : (
        <>
          <p className="key-details__note">
            {distanceText(value, target, Math.max(0, path.length - 1))}
          </p>
          <ol className="pivots__steps" aria-label="Route between the keys">
            {path.map((step) => (
              <li key={`${formatKey(step.from)}-${formatKey(step.to)}`} className="pivots__step">
                <p className="pivots__route">
                  <strong>{formatKey(step.from)}</strong> → <strong>{formatKey(step.to)}</strong>
                </p>
                {step.pivots.length === 0 ? (
                  <p className="key-details__note">No chord in common</p>
                ) : (
                  <ul
                    className="triads"
                    aria-label={`Pivot chords, ${formatKey(step.from)} to ${formatKey(step.to)}`}
                  >
                    {step.pivots.map(({ triad, inTarget }) => (
                      <li key={triad.symbol}>
                        <button
                          type="button"
                          className={`triad triad--${triad.quality}`}
                          aria-label={`Open ${triad.symbol} in Chords, ${triad.roman} in ${formatKey(step.from)} and ${inTarget.roman} in ${formatKey(step.to)}`}
                          onClick={() => {
                            const root = triad.notes[0];
                            if (root) onOpenChord(root, triad.quality);
                          }}
                        >
                          <span className="triad__roman">
                            {triad.roman} → {inTarget.roman}
                          </span>
                          <span className="triad__symbol">{triad.symbol}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

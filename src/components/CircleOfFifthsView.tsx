import { useState } from "react";
import type { ChordQualityId, Key, Note } from "../theory";
import { CircleOfFifths, type RingCount } from "./CircleOfFifths";
import { KeyDetails } from "./KeyDetails";

const RING_OPTIONS: readonly { count: RingCount; label: string }[] = [
  { count: 1, label: "Major" },
  { count: 2, label: "Major + minor" },
  { count: 3, label: "Major, minor + diminished" },
];

/** Pick a key on the circle and see its signature, scale and chords. */
export function CircleOfFifthsView({
  value: selected,
  onChange: setSelected,
  onOpenChord,
}: {
  value: Key;
  onChange: (key: Key) => void;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}) {
  const [rings, setRings] = useState<RingCount>(3);
  return (
    <div className="circle-view">
      <figure className="circle-view__figure">
        <div className="circle-view__rings" role="group" aria-label="Rings">
          {RING_OPTIONS.map(({ count, label }) => (
            <button
              key={count}
              type="button"
              className="toggle"
              aria-pressed={rings === count}
              onClick={() => setRings(count)}
            >
              {label}
            </button>
          ))}
        </div>
        <CircleOfFifths value={selected} onChange={setSelected} rings={rings} />
        <figcaption className="circle-view__legend">
          <span>Clockwise: up a fifth, one more ♯</span>
          <span>Counterclockwise: down a fifth, one more ♭</span>
          {rings === 3 && (
            <span>
              Inside out: diminished (vii°), minor (relative), major. Tap a sector to pick its key
            </span>
          )}
          <span className="legend legend--nearby">
            The key's six diatonic major and minor chords
          </span>
        </figcaption>
      </figure>
      <KeyDetails value={selected} onChange={setSelected} onOpenChord={onOpenChord} />
    </div>
  );
}

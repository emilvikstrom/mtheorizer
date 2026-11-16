import { useState } from "react";
import type { ChordQualityId, Key, Note } from "../theory";
import { CircleOfFifths, type ClickAction, type RingCount } from "./CircleOfFifths";
import { KeyDetails } from "./KeyDetails";

const RING_OPTIONS: readonly { count: RingCount; label: string }[] = [
  { count: 1, label: "Major" },
  { count: 2, label: "Major + minor" },
  { count: 3, label: "Major, minor + diminished" },
];

const CLICK_OPTIONS: readonly { action: ClickAction; label: string }[] = [
  { action: "key", label: "Select key" },
  { action: "chord", label: "Open chord" },
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
  const [stepRing, setStepRing] = useState(true);
  const [clickAction, setClickAction] = useState<ClickAction>("key");
  const minor = selected.mode === "minor";
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
          <button
            type="button"
            className="toggle"
            aria-pressed={stepRing}
            onClick={() => setStepRing(!stepRing)}
          >
            Step ring
          </button>
        </div>
        <div className="circle-view__rings" role="group" aria-label="Clicking a chord">
          {CLICK_OPTIONS.map(({ action, label }) => (
            <button
              key={action}
              type="button"
              className="toggle"
              aria-pressed={clickAction === action}
              onClick={() => setClickAction(action)}
            >
              {label}
            </button>
          ))}
        </div>
        <CircleOfFifths
          value={selected}
          onChange={setSelected}
          rings={rings}
          stepRing={stepRing}
          clickAction={clickAction}
          onOpenChord={onOpenChord}
        />
        <figcaption className="circle-view__legend">
          <span>Clockwise: up a fifth, one more ♯</span>
          <span>Counterclockwise: down a fifth, one more ♭</span>
          {rings === 3 && (
            <span>
              Inside out: diminished (vii°), minor (relative), major. Tap a sector to pick its key
            </span>
          )}
          {stepRing && (
            <span>
              Step ring in the middle: turned so that I (i in minor) sits on the key's tonic
            </span>
          )}
          <span className="legend legend--block">
            The key's seven chords, with step numbers (I–vii°)
          </span>
          <span className="legend legend--tonic">T tonic (I)</span>
          <span className="legend legend--subdominant">S subdominant (IV)</span>
          <span className="legend legend--dominant">D dominant (V)</span>
          {minor && (
            <span className="legend legend--harmonic">
              Dashed: V and vii° of harmonic minor, outside the block
            </span>
          )}
        </figcaption>
      </figure>
      <KeyDetails value={selected} onChange={setSelected} onOpenChord={onOpenChord} />
    </div>
  );
}

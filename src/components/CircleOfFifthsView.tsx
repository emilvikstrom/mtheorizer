import type { ChordQualityId, Key, Note } from "../theory";
import { CircleOfFifths } from "./CircleOfFifths";
import { KeyDetails } from "./KeyDetails";

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
  return (
    <div className="circle-view">
      <figure className="circle-view__figure">
        <CircleOfFifths value={selected} onChange={setSelected} />
        <figcaption className="circle-view__legend">
          <span>Clockwise: up a fifth, one more ♯</span>
          <span>Counterclockwise: down a fifth, one more ♭</span>
          <span className="legend legend--nearby">
            The key's six diatonic major and minor chords
          </span>
        </figcaption>
      </figure>
      <KeyDetails value={selected} onChange={setSelected} onOpenChord={onOpenChord} />
    </div>
  );
}

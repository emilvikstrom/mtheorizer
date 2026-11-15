import { useState } from 'react';
import { type Key, key, note } from '../theory';
import { CircleOfFifths } from './CircleOfFifths';
import { KeyDetails } from './KeyDetails';

/** Pick a key on the circle and see its signature, scale and chords. */
export function CircleOfFifthsView() {
  const [selected, setSelected] = useState<Key>(key(note('C'), 'major'));

  return (
    <div className="circle-view">
      <figure className="circle-view__figure">
        <CircleOfFifths value={selected} onChange={setSelected} />
        <figcaption className="circle-view__legend">
          <span>Clockwise: up a fifth, one more ♯</span>
          <span>Counterclockwise: down a fifth, one more ♭</span>
          <span className="legend legend--nearby">The key's six diatonic major and minor chords</span>
        </figcaption>
      </figure>
      <KeyDetails value={selected} onChange={setSelected} />
    </div>
  );
}

import { useState } from 'react';
import { type ChordQualityId, chordOnPitchClass } from '../theory';
import { ChordInfo } from './ChordInfo';
import { Piano } from './Piano';
import { QualityPicker } from './QualityPicker';
import { RootPicker } from './RootPicker';

/** Pick a root and a quality, see the chord and where it sits on the piano. */
export function ChordLookup() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>('major');
  const chord = chordOnPitchClass(rootPitchClass, quality);

  return (
    <>
      <section className="controls" aria-label="Choose a chord">
        <RootPicker value={rootPitchClass} onChange={setRootPitchClass} />
        <QualityPicker value={quality} onChange={setQuality} />
      </section>

      <ChordInfo chord={chord} />
      <Piano chord={chord} />
    </>
  );
}

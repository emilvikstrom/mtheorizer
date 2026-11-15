import { useState } from 'react';
import { ChordInfo } from './components/ChordInfo';
import { Piano } from './components/Piano';
import { QualityPicker } from './components/QualityPicker';
import { RootPicker } from './components/RootPicker';
import { type ChordQualityId, chordOnPitchClass } from './theory';

export function App() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>('major');
  const chord = chordOnPitchClass(rootPitchClass, quality);

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">Pick a root and a quality to see the chord.</p>
      </header>

      <section className="controls" aria-label="Choose a chord">
        <RootPicker value={rootPitchClass} onChange={setRootPitchClass} />
        <QualityPicker value={quality} onChange={setQuality} />
      </section>

      <ChordInfo chord={chord} />
      <Piano chord={chord} />
    </main>
  );
}

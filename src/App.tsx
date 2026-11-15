import { useState } from 'react';
import { ChordInfo } from './components/ChordInfo';
import { Fretboard } from './components/Fretboard';
import { type Instrument, InstrumentPicker } from './components/InstrumentPicker';
import { Piano } from './components/Piano';
import { QualityPicker } from './components/QualityPicker';
import { RootPicker } from './components/RootPicker';
import { type ChordQualityId, chordOnPitchClass } from './theory';

export function App() {
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>('major');
  const [instrument, setInstrument] = useState<Instrument>('piano');
  const chord = chordOnPitchClass(rootPitchClass, quality);

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">Pick a root and a quality to see the chord.</p>
      </header>

      <section className="controls" aria-label="Choose a chord">
        <RootPicker value={rootPitchClass} onChange={setRootPitchClass} />
        <div className="controls__row">
          <QualityPicker value={quality} onChange={setQuality} />
          <InstrumentPicker value={instrument} onChange={setInstrument} />
        </div>
      </section>

      <ChordInfo chord={chord} />
      {instrument === 'piano' ? <Piano chord={chord} /> : <Fretboard chord={chord} />}
    </main>
  );
}

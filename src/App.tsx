import { useState } from 'react';
import { ChordInfo } from './components/ChordInfo';
import { OptionPicker, type PickerOption } from './components/OptionPicker';
import { Piano } from './components/Piano';
import { RootPicker } from './components/RootPicker';
import { ScaleInfo } from './components/ScaleInfo';
import {
  type ChordQualityId,
  type ScaleId,
  chordOnKeyboard,
  chordOnPitchClass,
  scaleOnKeyboard,
  scaleOnPitchClass,
} from './theory';

type View = 'chord' | 'scale';

const VIEW_OPTIONS: readonly PickerOption<View>[] = [
  { value: 'chord', label: 'Chord' },
  { value: 'scale', label: 'Scale' },
];

const QUALITY_OPTIONS: readonly PickerOption<ChordQualityId>[] = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
];

const SCALE_OPTIONS: readonly PickerOption<ScaleId>[] = [
  { value: 'major', label: 'Major' },
  { value: 'naturalMinor', label: 'Natural minor' },
];

/**
 * The chord quality and the scale share one major/minor choice, so switching
 * between "A minor" and "the A natural minor scale" keeps the selection.
 */
const SCALE_FOR_QUALITY: Record<ChordQualityId, ScaleId> = { major: 'major', minor: 'naturalMinor' };
const QUALITY_FOR_SCALE: Record<ScaleId, ChordQualityId> = { major: 'major', naturalMinor: 'minor' };

export function App() {
  const [view, setView] = useState<View>('chord');
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>('major');

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">
          {view === 'chord' ? 'Pick a root and a quality to see the chord.' : 'Pick a tonic and a scale to see it.'}
        </p>
      </header>

      <section className="controls" aria-label={view === 'chord' ? 'Choose a chord' : 'Choose a scale'}>
        <OptionPicker legend="Show" name="view" options={VIEW_OPTIONS} value={view} onChange={setView} />
        <RootPicker
          legend={view === 'chord' ? 'Root' : 'Tonic'}
          value={rootPitchClass}
          onChange={setRootPitchClass}
        />
        {view === 'chord' ? (
          <OptionPicker
            legend="Quality"
            name="quality"
            options={QUALITY_OPTIONS}
            value={quality}
            onChange={setQuality}
          />
        ) : (
          <OptionPicker
            legend="Scale"
            name="scale"
            options={SCALE_OPTIONS}
            value={SCALE_FOR_QUALITY[quality]}
            onChange={(scaleId) => setQuality(QUALITY_FOR_SCALE[scaleId])}
          />
        )}
      </section>

      {view === 'chord' ? (
        <ChordView pc={rootPitchClass} quality={quality} />
      ) : (
        <ScaleView pc={rootPitchClass} scaleId={SCALE_FOR_QUALITY[quality]} />
      )}
    </main>
  );
}

function ChordView({ pc, quality }: { pc: number; quality: ChordQualityId }) {
  const chord = chordOnPitchClass(pc, quality);
  return (
    <>
      <ChordInfo chord={chord} />
      <Piano tones={chordOnKeyboard(chord)} name={chord.name} legend={{ root: 'Root', tone: 'Chord tone' }} />
    </>
  );
}

function ScaleView({ pc, scaleId }: { pc: number; scaleId: ScaleId }) {
  const scale = scaleOnPitchClass(pc, scaleId);
  return (
    <>
      <ScaleInfo scale={scale} />
      <Piano tones={scaleOnKeyboard(scale)} name={scale.name} legend={{ root: 'Tonic', tone: 'Scale tone' }} />
    </>
  );
}

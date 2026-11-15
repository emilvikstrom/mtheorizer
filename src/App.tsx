import { useState } from 'react';
import { ChordInfo } from './components/ChordInfo';
import { Fretboard } from './components/Fretboard';
import { OptionPicker, type PickerOption } from './components/OptionPicker';
import { Piano } from './components/Piano';
import { RootPicker } from './components/RootPicker';
import { ScaleInfo } from './components/ScaleInfo';
import {
  type ChordQualityId,
  type HighlightTone,
  type KeyboardTone,
  type ScaleId,
  chordHighlights,
  chordOnKeyboard,
  chordOnPitchClass,
  scaleHighlights,
  scaleOnKeyboard,
  scaleOnPitchClass,
} from './theory';

type View = 'chord' | 'scale';
type Instrument = 'piano' | 'guitar';

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

const INSTRUMENT_OPTIONS: readonly PickerOption<Instrument>[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' },
];

/**
 * The chord quality and the scale share one major/minor choice, so switching
 * between "A minor" and "the A natural minor scale" keeps the selection.
 */
const SCALE_FOR_QUALITY: Record<ChordQualityId, ScaleId> = { major: 'major', minor: 'naturalMinor' };
const QUALITY_FOR_SCALE: Record<ScaleId, ChordQualityId> = { major: 'major', naturalMinor: 'minor' };

const CHORD_LEGEND = { root: 'Root', tone: 'Chord tone' };
const SCALE_LEGEND = { root: 'Tonic', tone: 'Scale tone' };

export function App() {
  const [view, setView] = useState<View>('chord');
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>('major');
  const [instrument, setInstrument] = useState<Instrument>('piano');

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">mtheorizer</h1>
        <p className="app__tagline">
          {view === 'chord' ? 'Pick a root and a quality to see the chord.' : 'Pick a tonic and a scale to see it.'}
        </p>
      </header>

      <section className="controls" aria-label={view === 'chord' ? 'Choose a chord' : 'Choose a scale'}>
        <OptionPicker legend="Look up" name="view" options={VIEW_OPTIONS} value={view} onChange={setView} />
        <RootPicker
          legend={view === 'chord' ? 'Root' : 'Tonic'}
          value={rootPitchClass}
          onChange={setRootPitchClass}
        />
        <div className="controls__row">
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
          <OptionPicker
            legend="Show on"
            name="instrument"
            options={INSTRUMENT_OPTIONS}
            value={instrument}
            onChange={setInstrument}
          />
        </div>
      </section>

      {view === 'chord' ? (
        <ChordView pc={rootPitchClass} quality={quality} instrument={instrument} />
      ) : (
        <ScaleView pc={rootPitchClass} scaleId={SCALE_FOR_QUALITY[quality]} instrument={instrument} />
      )}
    </main>
  );
}

interface InstrumentViewProps {
  instrument: Instrument;
  name: string;
  legend: { root: string; tone: string };
  /** Each tone once, for the guitar neck. */
  tones: readonly HighlightTone[];
  /** The tones voiced on the keyboard. */
  keys: readonly KeyboardTone[];
}

function InstrumentView({ instrument, name, legend, tones, keys }: InstrumentViewProps) {
  return instrument === 'piano' ? (
    <Piano tones={keys} name={name} legend={legend} />
  ) : (
    <Fretboard tones={tones} name={name} legend={legend} />
  );
}

function ChordView({ pc, quality, instrument }: { pc: number; quality: ChordQualityId; instrument: Instrument }) {
  const chord = chordOnPitchClass(pc, quality);
  return (
    <>
      <ChordInfo chord={chord} />
      <InstrumentView
        instrument={instrument}
        name={chord.name}
        legend={CHORD_LEGEND}
        tones={chordHighlights(chord)}
        keys={chordOnKeyboard(chord)}
      />
    </>
  );
}

function ScaleView({ pc, scaleId, instrument }: { pc: number; scaleId: ScaleId; instrument: Instrument }) {
  const scale = scaleOnPitchClass(pc, scaleId);
  return (
    <>
      <ScaleInfo scale={scale} />
      <InstrumentView
        instrument={instrument}
        name={scale.name}
        legend={SCALE_LEGEND}
        tones={scaleHighlights(scale)}
        keys={scaleOnKeyboard(scale)}
      />
    </>
  );
}

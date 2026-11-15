import { useMemo, useRef } from 'react';
import { ChordInfo } from './ChordInfo';
import { ChordQualityPicker } from './ChordQualityPicker';
import { Fretboard } from './Fretboard';
import { OptionPicker, type PickerOption } from './OptionPicker';
import { Piano } from './Piano';
import { RootPicker } from './RootPicker';
import { type ChordRoute, type Instrument, type LookupRoute, type ScaleRoute } from '../route';
import { ScaleInfo } from './ScaleInfo';
import {
  CHORD_QUALITIES,
  type Chord,
  type ChordQualityId,
  type HighlightTone,
  type KeyboardTone,
  type NeckView,
  type Note,
  SCALES,
  type ScaleId,
  buildChord,
  chordHighlights,
  inversionCount,
  inversionName,
  chordOnKeyboard,
  chordShapes,
  commonSpellings,
  formatNote,
  noteEquals,
  pitchClass,
  preferredRootSpelling,
  preferredTonicSpelling,
  scaleHighlights,
  scaleOnKeyboard,
  scalePositions,
  spellScale,
} from '../theory';

type View = 'chord' | 'scale';

const VIEW_OPTIONS: readonly PickerOption<View>[] = [
  { value: 'chord', label: 'Chord' },
  { value: 'scale', label: 'Scale' },
];

const SCALE_OPTIONS: readonly PickerOption<ScaleId>[] = [
  { value: 'major', label: 'Major' },
  { value: 'naturalMinor', label: 'Natural minor' },
];

const INSTRUMENT_OPTIONS: readonly PickerOption<Instrument>[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' },
];

/** A scale choice that matches no chord picks the plain triad of that scale. */
const TRIAD_FOR_SCALE: Record<ScaleId, ChordQualityId> = { major: 'major', naturalMinor: 'minor' };

const CHORD_LEGEND = { root: 'Root', tone: 'Chord tone' };
const SCALE_LEGEND = { root: 'Tonic', tone: 'Scale tone' };

/** The root as the app would spell it by itself for this chord or scale. */
function preferredRoot(route: LookupRoute, pc: number): Note {
  return route.page === 'chord'
    ? preferredRootSpelling(pc, route.quality)
    : preferredTonicSpelling(pc, SCALES[route.scaleId]);
}

/**
 * `next` replaces `from`. A root the app spelled by itself is spelled again for
 * the new chord or scale (D♭ major, then C♯ minor); one the user picked stays.
 */
function follow(from: LookupRoute, next: LookupRoute): LookupRoute {
  const pc = pitchClass(from.root);
  const wasAutomatic = noteEquals(from.root, preferredRoot(from, pc));
  return wasAutomatic ? { ...next, root: preferredRoot(next, pc) } : next;
}

interface LookupProps {
  route: LookupRoute;
  onChange: (route: LookupRoute) => void;
}

/** Look up a chord or a scale and see it on the piano or the guitar neck. */
export function Lookup({ route, onChange }: LookupProps) {
  const { root, instrument } = route;
  const pc = pitchClass(root);

  // Switching to a scale and back returns to the same chord and inversion.
  const lastChord = useRef<ChordRoute | undefined>(undefined);
  if (route.page === 'chord') lastChord.current = route;

  const showView = (view: View) => {
    if (view === route.page) return;
    if (route.page === 'chord') {
      onChange(follow(route, { page: 'scale', root, scaleId: CHORD_QUALITIES[route.quality].keyScale.id, instrument }));
      return;
    }
    const before = lastChord.current;
    const chord: ChordRoute =
      before && CHORD_QUALITIES[before.quality].keyScale.id === route.scaleId
        ? { ...before, root, instrument }
        : { page: 'chord', root, quality: TRIAD_FOR_SCALE[route.scaleId], inversion: 0, instrument };
    onChange(follow(route, chord));
  };

  const spellings = commonSpellings(pc);
  const rootAndSpelling = (
    <>
      <RootPicker
        legend={route.page === 'chord' ? 'Root' : 'Tonic'}
        value={pc}
        onChange={(newPc) => onChange({ ...route, root: preferredRoot(route, newPc) })}
      />
      {spellings.length > 1 && (
        <OptionPicker
          legend="Spelling"
          name="spelling"
          options={spellings.map((n) => ({ value: formatNote(n), label: formatNote(n) }))}
          value={formatNote(root)}
          onChange={(name) => {
            const chosen = spellings.find((n) => formatNote(n) === name);
            if (chosen) onChange({ ...route, root: chosen });
          }}
        />
      )}
    </>
  );

  const instrumentPicker = (
    <OptionPicker
      legend="Show on"
      name="instrument"
      options={INSTRUMENT_OPTIONS}
      value={instrument}
      onChange={(value) => onChange({ ...route, instrument: value })}
    />
  );

  return (
    <>
      <section className="controls" aria-label={route.page === 'chord' ? 'Choose a chord' : 'Choose a scale'}>
        <OptionPicker legend="Look up" name="view" options={VIEW_OPTIONS} value={route.page} onChange={showView} />
        {rootAndSpelling}
        {route.page === 'chord' ? (
          <>
            <ChordQualityPicker
              root={root}
              value={route.quality}
              onChange={(quality) => onChange(follow(route, { ...route, quality }))}
            />
            {instrumentPicker}
            {instrument === 'piano' && (
              <InversionPicker
                chord={buildChord(root, route.quality)}
                value={route.inversion}
                onChange={(inversion) => onChange({ ...route, inversion })}
              />
            )}
          </>
        ) : (
          <div className="controls__row">
            <OptionPicker
              legend="Scale"
              name="scale"
              options={SCALE_OPTIONS}
              value={route.scaleId}
              onChange={(scaleId) => onChange(follow(route, { ...route, scaleId }))}
            />
            {instrumentPicker}
          </div>
        )}
      </section>

      {route.page === 'chord' ? <ChordView route={route} /> : <ScaleView route={route} />}
    </>
  );
}

interface InstrumentViewProps {
  instrument: Instrument;
  name: string;
  legend: { root: string; tone: string };
  /** Each tone once. */
  tones: readonly HighlightTone[];
  /** The tones voiced on the keyboard. */
  keys: readonly KeyboardTone[];
  /** Chord shapes or scale positions on the guitar neck. */
  neck: { kind: 'shape' | 'position'; views: readonly NeckView[] };
}

function InstrumentView({ instrument, name, legend, tones, keys, neck }: InstrumentViewProps) {
  return instrument === 'piano' ? (
    <Piano tones={keys} name={name} legend={legend} />
  ) : (
    <Fretboard views={neck.views} kind={neck.kind} tones={tones} name={name} legend={legend} />
  );
}

function InversionPicker({
  chord,
  value,
  onChange,
}: {
  chord: Chord;
  value: number;
  onChange: (inversion: number) => void;
}) {
  const count = inversionCount(chord);
  const options = Array.from({ length: count + 1 }, (_, i) => ({ value: String(i), label: inversionName(i) }));
  return (
    <OptionPicker
      legend="Inversion"
      name="inversion"
      options={options}
      value={String(Math.min(value, count))}
      onChange={(v) => onChange(Number(v))}
    />
  );
}

function ChordView({ route }: { route: ChordRoute }) {
  const { root, quality, instrument } = route;
  const chord = useMemo(() => buildChord(root, quality), [root, quality]);
  const tones = useMemo(() => chordHighlights(chord), [chord]);
  const shapes = useMemo(() => chordShapes(tones), [tones]);
  // The inversion is clamped to what this chord has: a triad has no third inversion.
  const inversion = Math.min(route.inversion, inversionCount(chord));
  return (
    <>
      <ChordInfo chord={chord} />
      <InstrumentView
        instrument={instrument}
        name={chord.name}
        legend={CHORD_LEGEND}
        tones={tones}
        keys={chordOnKeyboard(chord, 4, inversion)}
        neck={{ kind: 'shape', views: shapes }}
      />
    </>
  );
}

function ScaleView({ route }: { route: ScaleRoute }) {
  const scale = spellScale(route.root, route.scaleId);
  const tones = scaleHighlights(scale);
  return (
    <>
      <ScaleInfo scale={scale} />
      <InstrumentView
        instrument={route.instrument}
        name={scale.name}
        legend={SCALE_LEGEND}
        tones={tones}
        keys={scaleOnKeyboard(scale)}
        neck={{ kind: 'position', views: scalePositions(tones) }}
      />
    </>
  );
}

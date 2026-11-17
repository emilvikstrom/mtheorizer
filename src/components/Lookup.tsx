import { useEffect, useMemo, useRef } from "react";
import { ChordInfo } from "./ChordInfo";
import { ChordBuilder } from "./ChordBuilder";
import { ChordSymbolField } from "./ChordSymbolField";
import { Fretboard } from "./Fretboard";
import { OptionPicker, type PickerOption } from "./OptionPicker";
import { Piano } from "./Piano";
import { PlayButtons } from "./PlayButtons";
import { ShareExport } from "./ShareExport";
import { RootPicker } from "./RootPicker";
import {
  type ChordRoute,
  guitarOptions,
  type Instrument,
  type LookupRoute,
  type ScaleRoute,
} from "../route";
import { ScaleInfo } from "./ScaleInfo";
import { ScalePicker } from "./ScalePicker";
import {
  CHORD_QUALITIES,
  type Chord,
  type ChordQualityId,
  type ChordSpec,
  type HighlightTone,
  type KeyboardTone,
  type NeckView,
  type Note,
  type Tuning,
  SCALES,
  type ScaleId,
  TUNINGS,
  TUNING_IDS,
  type TuningId,
  chordFromSpec,
  chordHighlights,
  inversionCount,
  inversionName,
  inversionSymbol,
  chordOnKeyboard,
  chordShapes,
  commonSpellings,
  formatNote,
  nearestQuality,
  noteEquals,
  pitchClass,
  preferredRootSpelling,
  preferredTonicSpelling,
  scaleHighlights,
  scaleOnKeyboard,
  scalePositions,
  specOf,
  spellScale,
} from "../theory";

type View = "chord" | "scale";

const VIEW_OPTIONS: readonly PickerOption<View>[] = [
  { value: "chord", label: "Chord" },
  { value: "scale", label: "Scale" },
];

const INSTRUMENT_OPTIONS: readonly PickerOption<Instrument>[] = [
  { value: "piano", label: "Piano" },
  { value: "guitar", label: "Guitar" },
];

const HAND_OPTIONS: readonly PickerOption<"right" | "left">[] = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];

/** A scale choice that matches no chord picks the plain triad of that scale. */
const TRIAD_FOR_SCALE: Record<ScaleId, ChordQualityId> = {
  major: "major",
  naturalMinor: "minor",
  harmonicMinor: "minor",
  melodicMinor: "minor",
  dorian: "minor",
  phrygian: "minor",
  lydian: "major",
  mixolydian: "major",
  locrian: "diminished",
  majorPentatonic: "major",
  minorPentatonic: "minor",
  minorBlues: "minor",
  majorBlues: "major",
};

const CHORD_LEGEND = { root: "Root", tone: "Chord tone" };
const SCALE_LEGEND = { root: "Tonic", tone: "Scale tone" };

/** The root as the app would spell it by itself for this chord or scale. */
function preferredRoot(route: LookupRoute, pc: number): Note {
  return route.page === "chord"
    ? preferredRootSpelling(pc, nearestQuality(route.spec))
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

  const build = (spec: ChordSpec) => {
    if (route.page === "chord") onChange(follow(route, { ...route, spec }));
  };

  // Switching to a scale and back returns to the same chord and inversion.
  const lastChord = useRef<ChordRoute | undefined>(undefined);
  useEffect(() => {
    if (route.page === "chord") lastChord.current = route;
  }, [route]);

  const showView = (view: View) => {
    if (view === route.page) return;
    if (route.page === "chord") {
      onChange(
        follow(route, {
          page: "scale",
          root,
          scaleId: CHORD_QUALITIES[nearestQuality(route.spec)].keyScale.id,
          instrument,
          ...guitarOptions(route),
        }),
      );
      return;
    }
    const before = lastChord.current;
    const chord: ChordRoute =
      before && CHORD_QUALITIES[nearestQuality(before.spec)].keyScale.id === route.scaleId
        ? { ...before, root, instrument, ...guitarOptions(route) }
        : {
            page: "chord",
            root,
            spec: specOf(TRIAD_FOR_SCALE[route.scaleId]),
            inversion: 0,
            instrument,
            ...guitarOptions(route),
          };
    onChange(follow(route, chord));
  };

  const spellings = commonSpellings(pc);
  const rootAndSpelling = (
    <>
      <RootPicker
        legend={route.page === "chord" ? "Root" : "Tonic"}
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

  const tuningId: TuningId = route.tuning ?? "standard";
  // Standard tuning and the right hand are left out of the route (and so of the link).
  const withGuitar = (change: { tuning?: TuningId; left?: boolean }): LookupRoute => {
    const options = guitarOptions({ ...route, ...change });
    const rest = { ...route };
    delete rest.tuning;
    delete rest.left;
    return { ...rest, ...options };
  };
  const guitarPickers = instrument === "guitar" && (
    <>
      <OptionPicker
        legend="Tuning"
        name="tuning"
        options={TUNING_IDS.map((id) => ({ value: id, label: TUNINGS[id].label }))}
        value={tuningId}
        onChange={(tuning) => onChange(withGuitar({ tuning }))}
      />
      <OptionPicker
        legend="Hand"
        name="hand"
        options={HAND_OPTIONS}
        value={route.left ? "left" : "right"}
        onChange={(hand) => onChange(withGuitar({ left: hand === "left" }))}
      />
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
      <section
        className="controls"
        aria-label={route.page === "chord" ? "Choose a chord" : "Choose a scale"}
      >
        <OptionPicker
          legend="Look up"
          name="view"
          options={VIEW_OPTIONS}
          value={route.page}
          onChange={showView}
        />
        {rootAndSpelling}
        {route.page === "chord" ? (
          <>
            <ChordSymbolField
              root={root}
              spec={route.spec}
              inversion={route.inversion}
              onJump={(newRoot, spec, inversion) =>
                onChange({ ...route, root: newRoot, spec, inversion })
              }
            />
            <ChordBuilder root={root} spec={route.spec} onChange={build} />
            {instrumentPicker}
            {guitarPickers}
            {instrument === "piano" && (
              <InversionPicker
                chord={chordFromSpec(root, route.spec)}
                value={route.inversion}
                onChange={(inversion) => onChange({ ...route, inversion })}
              />
            )}
          </>
        ) : (
          <>
            <ScalePicker
              value={route.scaleId}
              onChange={(scaleId) => onChange(follow(route, { ...route, scaleId }))}
            />
            <div className="controls__row">
              {instrumentPicker}
              {guitarPickers}
            </div>
          </>
        )}
      </section>

      {route.page === "chord" ? (
        <ChordView route={route} spec={route.spec} />
      ) : (
        <ScaleView route={route} />
      )}
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
  neck: { kind: "shape" | "position"; views: readonly NeckView[] };
  tuning: Tuning;
  left: boolean;
}

function InstrumentView({
  instrument,
  name,
  legend,
  tones,
  keys,
  neck,
  tuning,
  left,
}: InstrumentViewProps) {
  return instrument === "piano" ? (
    <Piano tones={keys} name={name} legend={legend} />
  ) : (
    <Fretboard
      views={neck.views}
      kind={neck.kind}
      tones={tones}
      name={name}
      legend={legend}
      tuning={tuning}
      left={left}
    />
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
  const options = Array.from({ length: count + 1 }, (_, i) => ({
    value: String(i),
    label: inversionName(i),
  }));
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

function ChordView({ route, spec }: { route: ChordRoute; spec: ChordSpec }) {
  const { root, instrument } = route;
  const chord = useMemo(() => chordFromSpec(root, spec), [root, spec]);
  const tones = useMemo(() => chordHighlights(chord), [chord]);
  const tuning = TUNINGS[route.tuning ?? "standard"];
  const shapes = useMemo(() => chordShapes(tones, tuning.strings), [tones, tuning]);
  // The inversion is clamped to what this chord has: a triad has no third inversion.
  const inversion = Math.min(route.inversion, inversionCount(chord));
  const keys = chordOnKeyboard(chord, 4, inversion);
  return (
    <>
      <ChordInfo chord={chord} symbol={inversionSymbol(chord, inversion)} />
      <PlayButtons midis={keys.map((k) => k.midi)} kind="chord" name={chord.name} />
      <ShareExport key={chord.name} title={chord.name} notes={chord.tones.map((t) => t.note)} />
      <InstrumentView
        instrument={instrument}
        name={chord.name}
        legend={CHORD_LEGEND}
        tones={tones}
        keys={keys}
        neck={{ kind: "shape", views: shapes }}
        tuning={tuning}
        left={route.left === true}
      />
    </>
  );
}

function ScaleView({ route }: { route: ScaleRoute }) {
  const scale = spellScale(route.root, route.scaleId);
  const tones = scaleHighlights(scale);
  const keys = scaleOnKeyboard(scale);
  const tuning = TUNINGS[route.tuning ?? "standard"];
  return (
    <>
      <ScaleInfo scale={scale} />
      <PlayButtons midis={keys.map((k) => k.midi)} kind="scale" name={scale.name} />
      <ShareExport key={scale.name} title={scale.name} notes={scale.tones.map((t) => t.note)} />
      <InstrumentView
        instrument={route.instrument}
        name={scale.name}
        legend={SCALE_LEGEND}
        tones={tones}
        keys={keys}
        neck={{ kind: "position", views: scalePositions(tones, tuning.strings) }}
        tuning={tuning}
        left={route.left === true}
      />
    </>
  );
}

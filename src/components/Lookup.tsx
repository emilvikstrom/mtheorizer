import { useMemo, useState } from "react";
import { ChordInfo } from "./ChordInfo";
import { ChordQualityPicker } from "./ChordQualityPicker";
import { Fretboard } from "./Fretboard";
import { OptionPicker, type PickerOption } from "./OptionPicker";
import { Piano } from "./Piano";
import { RootPicker } from "./RootPicker";
import { ScaleInfo } from "./ScaleInfo";
import {
  CHORD_QUALITIES,
  type ChordQualityId,
  type HighlightTone,
  type KeyboardTone,
  type NeckView,
  type ScaleId,
  chordHighlights,
  chordOnKeyboard,
  chordOnPitchClass,
  chordShapes,
  scaleHighlights,
  scaleOnKeyboard,
  scaleOnPitchClass,
  scalePositions,
} from "../theory";

type View = "chord" | "scale";
type Instrument = "piano" | "guitar";

const VIEW_OPTIONS: readonly PickerOption<View>[] = [
  { value: "chord", label: "Chord" },
  { value: "scale", label: "Scale" },
];

const SCALE_OPTIONS: readonly PickerOption<ScaleId>[] = [
  { value: "major", label: "Major" },
  { value: "naturalMinor", label: "Natural minor" },
];

const INSTRUMENT_OPTIONS: readonly PickerOption<Instrument>[] = [
  { value: "piano", label: "Piano" },
  { value: "guitar", label: "Guitar" },
];

/** A scale choice that matches no chord picks the plain triad of that scale. */
const TRIAD_FOR_SCALE: Record<ScaleId, ChordQualityId> = { major: "major", naturalMinor: "minor" };

const CHORD_LEGEND = { root: "Root", tone: "Chord tone" };
const SCALE_LEGEND = { root: "Tonic", tone: "Scale tone" };

/** Look up a chord or a scale and see it on the piano or the guitar neck. */
export function Lookup() {
  const [view, setView] = useState<View>("chord");
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState<ChordQualityId>("major");
  const [scaleId, setScaleId] = useState<ScaleId>("major");
  const [instrument, setInstrument] = useState<Instrument>("piano");

  // Chord and scale follow each other, so "A minor seventh" turns into the A
  // natural minor scale, and back again to the same chord.
  const chooseQuality = (id: ChordQualityId) => {
    setQuality(id);
    setScaleId(CHORD_QUALITIES[id].keyScale.id);
  };
  const chooseScale = (id: ScaleId) => {
    setScaleId(id);
    if (CHORD_QUALITIES[quality].keyScale.id !== id) setQuality(TRIAD_FOR_SCALE[id]);
  };

  const instrumentPicker = (
    <OptionPicker
      legend="Show on"
      name="instrument"
      options={INSTRUMENT_OPTIONS}
      value={instrument}
      onChange={setInstrument}
    />
  );

  return (
    <>
      <section
        className="controls"
        aria-label={view === "chord" ? "Choose a chord" : "Choose a scale"}
      >
        <OptionPicker
          legend="Look up"
          name="view"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
        />
        <RootPicker
          legend={view === "chord" ? "Root" : "Tonic"}
          value={rootPitchClass}
          onChange={setRootPitchClass}
        />
        {view === "chord" ? (
          <>
            <ChordQualityPicker
              rootPitchClass={rootPitchClass}
              value={quality}
              onChange={chooseQuality}
            />
            {instrumentPicker}
          </>
        ) : (
          <div className="controls__row">
            <OptionPicker
              legend="Scale"
              name="scale"
              options={SCALE_OPTIONS}
              value={scaleId}
              onChange={chooseScale}
            />
            {instrumentPicker}
          </div>
        )}
      </section>

      {view === "chord" ? (
        <ChordView pc={rootPitchClass} quality={quality} instrument={instrument} />
      ) : (
        <ScaleView pc={rootPitchClass} scaleId={scaleId} instrument={instrument} />
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
}

function InstrumentView({ instrument, name, legend, tones, keys, neck }: InstrumentViewProps) {
  return instrument === "piano" ? (
    <Piano tones={keys} name={name} legend={legend} />
  ) : (
    <Fretboard views={neck.views} kind={neck.kind} tones={tones} name={name} legend={legend} />
  );
}

function ChordView({
  pc,
  quality,
  instrument,
}: {
  pc: number;
  quality: ChordQualityId;
  instrument: Instrument;
}) {
  const chord = useMemo(() => chordOnPitchClass(pc, quality), [pc, quality]);
  const tones = useMemo(() => chordHighlights(chord), [chord]);
  const shapes = useMemo(() => chordShapes(tones), [tones]);
  return (
    <>
      <ChordInfo chord={chord} />
      <InstrumentView
        instrument={instrument}
        name={chord.name}
        legend={CHORD_LEGEND}
        tones={tones}
        keys={chordOnKeyboard(chord)}
        neck={{ kind: "shape", views: shapes }}
      />
    </>
  );
}

function ScaleView({
  pc,
  scaleId,
  instrument,
}: {
  pc: number;
  scaleId: ScaleId;
  instrument: Instrument;
}) {
  const scale = scaleOnPitchClass(pc, scaleId);
  const tones = scaleHighlights(scale);
  return (
    <>
      <ScaleInfo scale={scale} />
      <InstrumentView
        instrument={instrument}
        name={scale.name}
        legend={SCALE_LEGEND}
        tones={tones}
        keys={scaleOnKeyboard(scale)}
        neck={{ kind: "position", views: scalePositions(tones) }}
      />
    </>
  );
}

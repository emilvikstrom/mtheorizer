import { useEffect, useMemo, useState } from "react";
import { stopPlayback } from "../audio/playback";
import { useSounding } from "../audio/sounding";
import { ChordInfo } from "./ChordInfo";
import { ChordsThatFit, ScalesThatFit } from "./ChordScaleFit";
import { ChordBuilder } from "./ChordBuilder";
import { ChordCompare, ChordScaleCompare } from "./ChordCompare";
import { ChordSymbolField } from "./ChordSymbolField";
import { Fretboard } from "./Fretboard";
import { OptionPicker, type PickerOption } from "./OptionPicker";
import { Piano } from "./Piano";
import { Notation } from "./Staff";
import { PlayButtons } from "./PlayButtons";
import { ShareExport } from "./ShareExport";
import { RootPicker } from "./RootPicker";
import { ToneDisplayPicker } from "./ToneDisplayPicker";
import { SameNotesAsChord, SameNotesAsScale } from "./SameNotes";
import { TritoneSubstitute } from "./TritoneSubstitute";
import {
  type ChordRoute,
  type ChordVs,
  displayOptions,
  formatRoute,
  guitarOptions,
  type Instrument,
  type LookupRoute,
  type ScaleRoute,
  storedToneDisplay,
  withNeck,
} from "../route";
import { storedNeck } from "../neck";
import type { ToneDisplay } from "../toneLabels";
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
  tuningFor,
  describeTuning,
  presetFor,
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
  scaleSignature,
  specOf,
  spellScale,
} from "../theory";

export type View = "chord" | "scale";

/** The piano, or the fretted instrument set up on the settings page. */
const INSTRUMENT_OPTIONS: readonly PickerOption<"piano" | "neck">[] = [
  { value: "piano", label: "Piano" },
  { value: "neck", label: "Fretboard" },
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
  lydianDominant: "major",
  altered: "diminished",
  wholeTone: "augmented",
  diminishedWholeHalf: "diminished",
  diminishedHalfWhole: "major",
  majorPentatonic: "major",
  minorPentatonic: "minor",
  minorBlues: "minor",
  majorBlues: "major",
  dorianFlat2: "minor",
  lydianAugmented: "augmented",
  mixolydianFlat6: "major",
  locrianNatural2: "diminished",
  phrygianDominant: "major",
  hungarianMinor: "minor",
  doubleHarmonic: "major",
  bebopDominant: "major",
  hirajoshi: "minor",
  inSen: "major",
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

/**
 * The chord or scale on the same root that the other tab shows. A chord becomes its parent scale
 * and a scale becomes the chord it came from (`lastChord`, if it is that scale's chord) or its
 * plain triad, so going to the scales and back lands on the same chord and inversion.
 */
export function switchView(
  route: LookupRoute,
  view: View,
  lastChord: ChordRoute | undefined,
): LookupRoute {
  if (view === route.page) return route;
  const { root, instrument } = route;
  if (route.page === "chord") {
    return follow(route, {
      page: "scale",
      root,
      scaleId: CHORD_QUALITIES[nearestQuality(route.spec)].keyScale.id,
      instrument,
      ...guitarOptions(route),
      ...displayOptions(route),
    });
  }
  const chord: ChordRoute =
    lastChord && CHORD_QUALITIES[nearestQuality(lastChord.spec)].keyScale.id === route.scaleId
      ? { ...lastChord, root, instrument, ...guitarOptions(route), ...displayOptions(route) }
      : {
          page: "chord",
          root,
          spec: specOf(TRIAD_FOR_SCALE[route.scaleId]),
          inversion: 0,
          instrument,
          ...guitarOptions(route),
          ...displayOptions(route),
        };
  return follow(route, chord);
}

interface LookupProps {
  route: LookupRoute;
  onChange: (route: LookupRoute) => void;
}

/** Look up a chord or a scale and see it on the piano or the guitar neck. */
export function Lookup({ route, onChange }: LookupProps) {
  const { root, instrument } = route;
  const pc = pitchClass(root);

  // What the keys and frets say. With the labels off, the answer is shown on request
  // and hidden again as soon as the chord, scale or anything else changes.
  const display: ToneDisplay = route.show ?? storedToneDisplay();
  const linkNow = formatRoute(route);
  const [revealedFor, setRevealedFor] = useState<string | undefined>(undefined);
  const revealed = revealedFor === linkNow;
  const shown: ToneDisplay = display === "none" && revealed ? "names" : display;
  const displayPicker = (
    <ToneDisplayPicker
      value={display}
      onChange={(show) => onChange({ ...route, show })}
      revealed={revealed}
      onToggleReveal={() => setRevealedFor(revealed ? undefined : linkNow)}
    />
  );

  const build = (spec: ChordSpec) => {
    if (route.page === "chord") onChange(follow(route, { ...route, spec }));
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

  const neckTuning = tuningFor(
    instrument === "piano" ? "guitar" : instrument,
    route.tuning,
    route.strings,
  );
  const instrumentPicker = (
    <OptionPicker
      legend="Show on"
      name="instrument"
      options={INSTRUMENT_OPTIONS}
      value={instrument === "piano" ? "piano" : "neck"}
      onChange={(value) =>
        onChange(
          value === "piano" ? { ...route, instrument: "piano" } : withNeck(route, storedNeck()),
        )
      }
    />
  );
  const neckSummary = instrument !== "piano" && (
    <p className="controls__note">
      {presetFor(neckTuning.strings)?.label ?? `${neckTuning.strings.length} strings`}:{" "}
      {describeTuning(neckTuning.strings)}.{" "}
      <a href="#/settings">Change the strings or tuning in Settings</a>
    </p>
  );

  return (
    <>
      <section
        className="controls"
        aria-label={route.page === "chord" ? "Choose a chord" : "Choose a scale"}
      >
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
            {neckSummary}
            {displayPicker}
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
              {displayPicker}
            </div>
            {neckSummary}
          </>
        )}
      </section>

      {route.page === "chord" ? (
        <ChordView
          route={route}
          spec={route.spec}
          display={shown}
          onCompare={(vs) => {
            const rest = { ...route };
            delete rest.vs;
            onChange(vs ? { ...rest, vs } : rest);
          }}
          onOpenRoot={(newRoot) => onChange({ ...route, root: newRoot, inversion: 0 })}
          onOpenScale={(scaleId) =>
            onChange({
              page: "scale",
              root,
              scaleId,
              instrument,
              ...guitarOptions(route),
              ...displayOptions(route),
            })
          }
        />
      ) : (
        <ScaleView
          route={route}
          display={shown}
          onOpenRoot={(newRoot) => onChange({ ...route, root: newRoot })}
          onOpenChord={(chordRoot, quality) =>
            onChange({
              page: "chord",
              root: chordRoot,
              spec: specOf(quality),
              inversion: 0,
              instrument,
              ...guitarOptions(route),
              ...displayOptions(route),
            })
          }
        />
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
  display: ToneDisplay;
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
  display,
}: InstrumentViewProps) {
  const sounding = useSounding();
  // Choosing another chord or scale ends the sound of the old one, so nothing stays lit.
  useEffect(() => stopPlayback, [name]);
  return instrument === "piano" ? (
    <Piano tones={keys} name={name} legend={legend} display={display} sounding={sounding} />
  ) : (
    <Fretboard
      views={neck.views}
      kind={neck.kind}
      tones={tones}
      name={name}
      legend={legend}
      tuning={tuning}
      left={left}
      display={display}
      sounding={sounding}
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

function ChordView({
  route,
  spec,
  display,
  onOpenRoot,
  onOpenScale,
  onCompare,
}: {
  route: ChordRoute;
  spec: ChordSpec;
  display: ToneDisplay;
  onCompare: (vs: ChordVs | undefined) => void;
  onOpenRoot: (root: Note) => void;
  onOpenScale: (scaleId: ScaleId) => void;
}) {
  const { root, instrument } = route;
  const chord = useMemo(() => chordFromSpec(root, spec), [root, spec]);
  const tones = useMemo(() => chordHighlights(chord), [chord]);
  const tuning = tuningFor(
    instrument === "piano" ? "guitar" : instrument,
    route.tuning,
    route.strings,
  );
  const shapes = useMemo(
    () =>
      chordShapes(tones, tuning.strings, {
        rootInBass: tuning.rootInBass,
        openChordMaxFret: tuning.openChordMaxFret,
      }),
    [tones, tuning],
  );
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
        display={display}
      />
      <Notation tones={keys} kind="chord" name={chord.name} hidden={display === "none"} />
      <ChordCompare
        root={root}
        spec={spec}
        inversion={inversion}
        vs={route.vs}
        onChange={onCompare}
        display={display}
        neck={instrument === "piano" ? undefined : { tuning, left: route.left === true }}
      />
      <ChordScaleCompare key={`scale-${chord.name}`} chord={chord} />
      <TritoneSubstitute chord={chord} onOpen={onOpenRoot} />
      <SameNotesAsChord chord={chord} onOpen={onOpenRoot} />
      <ScalesThatFit chord={chord} onOpen={onOpenScale} />
    </>
  );
}

function ScaleView({
  route,
  display,
  onOpenRoot,
  onOpenChord,
}: {
  route: ScaleRoute;
  display: ToneDisplay;
  onOpenRoot: (root: Note) => void;
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}) {
  const scale = spellScale(route.root, route.scaleId);
  const tones = scaleHighlights(scale);
  const keys = scaleOnKeyboard(scale);
  const tuning = tuningFor(
    route.instrument === "piano" ? "guitar" : route.instrument,
    route.tuning,
    route.strings,
  );
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
        display={display}
      />
      <Notation
        tones={keys}
        kind="scale"
        signature={scaleSignature(scale)}
        name={scale.name}
        hidden={display === "none"}
      />
      <SameNotesAsScale tonic={scale.tonic} scaleId={route.scaleId} onOpen={onOpenRoot} />
      <ChordsThatFit scale={scale} onOpen={onOpenChord} />
    </>
  );
}

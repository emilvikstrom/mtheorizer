import { useMemo, useState } from "react";
import { audioSupported, planProgression, playNotes } from "../audio/playback";
import type { ChordVs } from "../route";
import type { ToneDisplay } from "../toneLabels";
import {
  type Chord,
  type ChordSpec,
  type Note,
  type ScaleId,
  type Tuning,
  SCALE_GROUPS,
  SCALES,
  chordFromSpec,
  chordHighlights,
  chordOnKeyboard,
  chordShapes,
  compareChordWithScale,
  compareChords,
  formatCommonTone,
  formatNote,
  nearestQuality,
  pitchClass,
  preferredRootSpelling,
  scaleLabel,
  scaleOnKeyboard,
  scaleOnPitchClass,
  scalesForChord,
} from "../theory";
import { ChordSymbolField } from "./ChordSymbolField";
import { Fretboard } from "./Fretboard";
import { Piano } from "./Piano";

interface ChordCompareProps {
  /** The chord that is open. */
  root: Note;
  spec: ChordSpec;
  inversion: number;
  /** The chord compared with it, or undefined while nothing is compared. */
  vs: ChordVs | undefined;
  onChange: (vs: ChordVs | undefined) => void;
  display: ToneDisplay;
  /** A string instrument to show the chords on instead of the keyboard (the piano when absent). */
  neck?: { tuning: Tuning; left: boolean };
}

const LEGEND = { root: "Root", tone: "Chord tone" };

/** The chord a fifth up (C → G), the starting point when a comparison is opened. */
function startingChord(root: Note, spec: ChordSpec): ChordVs {
  return {
    root: preferredRootSpelling((pitchClass(root) + 7) % 12, nearestQuality(spec)),
    spec,
  };
}

function ToneList({
  chord,
  shared,
  label,
}: {
  chord: Chord;
  shared: ReadonlySet<number>;
  label: string;
}) {
  return (
    <li className="compare__chord">
      <span className="compare__name">{label}</span>
      <ul className="compare__tones" aria-label={`Tones of ${chord.name}`}>
        {chord.tones.map((tone) => {
          const common = shared.has(pitchClass(tone.note));
          return (
            <li
              key={tone.role}
              className={`compare__tone${common ? " compare__tone--common" : ""}`}
              data-common={common ? "true" : undefined}
            >
              {formatNote(tone.note)}
              {common && <span className="compare__mark"> (common)</span>}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** A chord on the neck, with the tones it shares with the other chord marked. */
function NeckOf({
  chord,
  shared,
  neck,
  display,
}: {
  chord: Chord;
  shared: ReadonlySet<number>;
  neck: { tuning: Tuning; left: boolean };
  display: ToneDisplay;
}) {
  const tones = useMemo(() => chordHighlights(chord), [chord]);
  const { tuning } = neck;
  const shapes = useMemo(
    () => chordShapes(tones, tuning.strings, { rootInBass: tuning.rootInBass }),
    [tones, tuning],
  );
  return (
    <Fretboard
      views={shapes}
      kind="shape"
      tones={tones}
      name={chord.name}
      legend={LEGEND}
      tuning={tuning}
      left={neck.left}
      display={display}
      shared={shared}
    />
  );
}

/**
 * Compare the open chord with a second one: which tones they share (matched on the key they
 * press, so E♭ and D♯ count as the same, and said so), as a list and as dots on two keyboards.
 */
export function ChordCompare({
  root,
  spec,
  inversion,
  vs,
  onChange,
  display,
  neck,
}: ChordCompareProps) {
  if (!vs) {
    return (
      <section className="compare" aria-labelledby="compare-title">
        <h3 id="compare-title" className="compare__title">
          Compare chords
        </h3>
        <div className="compare__actions">
          <button
            type="button"
            className="play__button"
            onClick={() => onChange(startingChord(root, spec))}
          >
            Compare with another chord
          </button>
        </div>
      </section>
    );
  }

  const first = chordFromSpec(root, spec);
  const second = chordFromSpec(vs.root, vs.spec);
  const { common, sharedPitchClasses } = compareChords(first, second);
  const firstKeys = chordOnKeyboard(first, 4, inversion);
  const secondKeys = chordOnKeyboard(second, 4);
  const spelledDifferently = common.filter((tone) => !tone.sameSpelling);

  return (
    <section className="compare" aria-labelledby="compare-title">
      <h3 id="compare-title" className="compare__title">
        Compare chords
      </h3>
      <ChordSymbolField
        label="Compare with"
        root={vs.root}
        spec={vs.spec}
        inversion={0}
        onJump={(newRoot, newSpec) => onChange({ root: newRoot, spec: newSpec })}
      />
      <p className="compare__summary" aria-live="polite">
        {common.length === 0 ? (
          <>
            {first.symbol} and {second.symbol} have no tone in common.
          </>
        ) : (
          <>
            {first.symbol} and {second.symbol} share{" "}
            <strong>{common.map(formatCommonTone).join(", ")}</strong>
            {common.length === 1 ? " (1 tone)" : ` (${common.length} tones)`}.
          </>
        )}
        {spelledDifferently.length > 0 && (
          <>
            {" "}
            {spelledDifferently
              .map((tone) => formatCommonTone(tone).replace(" / ", " and "))
              .join("; ")}{" "}
            {spelledDifferently.length === 1 ? "is" : "are"} spelled differently but{" "}
            {spelledDifferently.length === 1 ? "is" : "are"} the same key.
          </>
        )}
      </p>
      <ul className="compare__list">
        <ToneList chord={first} shared={sharedPitchClasses} label={first.symbol} />
        <ToneList chord={second} shared={sharedPitchClasses} label={second.symbol} />
      </ul>
      {neck ? (
        <>
          <NeckOf chord={first} shared={sharedPitchClasses} neck={neck} display={display} />
          <NeckOf chord={second} shared={sharedPitchClasses} neck={neck} display={display} />
        </>
      ) : (
        <>
          <Piano
            tones={firstKeys}
            name={first.name}
            legend={LEGEND}
            display={display}
            shared={sharedPitchClasses}
          />
          <Piano
            tones={secondKeys}
            name={second.name}
            legend={LEGEND}
            display={display}
            shared={sharedPitchClasses}
          />
        </>
      )}
      <div className="compare__actions">
        {audioSupported() && (
          <button
            type="button"
            className="play__button"
            aria-label={`Play ${first.symbol} then ${second.symbol}`}
            onClick={() =>
              playNotes(
                planProgression([firstKeys.map((k) => k.midi), secondKeys.map((k) => k.midi)]),
              )
            }
          >
            ▶ Play {first.symbol} → {second.symbol}
          </button>
        )}
        <button type="button" className="play__button" onClick={() => onChange(undefined)}>
          Stop comparing
        </button>
      </div>
    </section>
  );
}

const SCALE_LEGEND = { root: "Tonic", tone: "Scale tone" };
const TONICS = Array.from({ length: 12 }, (_, pc) => pc);

/** Starting scale: the first one listed for the chord, on the chord's own root. */
function startingScale(chord: Chord): { pc: number; id: ScaleId } {
  return { pc: pitchClass(chord.root), id: scalesForChord(chord)[0] ?? "major" };
}

/**
 * Hold the open chord against a scale: which of the chord's tones the scale has, as a sentence,
 * a list marked in words, and the scale on a keyboard with the chord's keys marked.
 */
export function ChordScaleCompare({ chord }: { chord: Chord }) {
  const [pick, setPick] = useState<{ pc: number; id: ScaleId } | undefined>(undefined);
  if (!pick) {
    return (
      <section className="compare" aria-labelledby="compare-scale-title">
        <h3 id="compare-scale-title" className="compare__title">
          Compare with a scale
        </h3>
        <div className="compare__actions">
          <button
            type="button"
            className="play__button"
            onClick={() => setPick(startingScale(chord))}
          >
            Compare with a scale
          </button>
        </div>
      </section>
    );
  }

  const scale = scaleOnPitchClass(pick.pc, pick.id);
  const result = compareChordWithScale(chord, scale);
  const keys = scaleOnKeyboard(scale, 4);
  const outside = result.outside.map((t) => formatNote(t.tone.note));
  const optionalOutside = result.outside.every((t) => t.tone.optional);
  return (
    <section className="compare" aria-labelledby="compare-scale-title">
      <h3 id="compare-scale-title" className="compare__title">
        Compare with a scale
      </h3>
      <div className="compare__scale-pick">
        <label className="compare__field">
          <span>Scale tonic</span>
          <select
            className="pivots__select"
            value={pick.pc}
            onChange={(e) => setPick({ ...pick, pc: Number(e.target.value) })}
          >
            {TONICS.map((pc) => (
              <option key={pc} value={pc}>
                {formatNote(scaleOnPitchClass(pc, pick.id).tonic)}
              </option>
            ))}
          </select>
        </label>
        <label className="compare__field">
          <span>Scale</span>
          <select
            className="pivots__select"
            value={pick.id}
            onChange={(e) => setPick({ ...pick, id: e.target.value as ScaleId })}
          >
            {SCALE_GROUPS.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.scales.map((id) => (
                  <option key={id} value={id}>
                    {scaleLabel(SCALES[id])}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <p className="compare__summary" aria-live="polite">
        {result.outside.length === 0 ? (
          <>
            All {result.tones.length} tones of {chord.symbol} are in {scale.name}.
          </>
        ) : (
          <>
            {result.inside.length} of {result.tones.length} tones of {chord.symbol} are in{" "}
            {scale.name}; <strong>{outside.join(", ")}</strong>{" "}
            {result.outside.length === 1 ? "is" : "are"} not.
            {result.fits &&
              optionalOutside &&
              " The chord still fits, since that tone is optional."}
          </>
        )}
      </p>
      <ul className="compare__list">
        <li className="compare__chord">
          <span className="compare__name">{chord.symbol}</span>
          <ul className="compare__tones" aria-label={`Tones of ${chord.name} against the scale`}>
            {result.tones.map(({ tone, inScale, scaleNote, sameSpelling }) => (
              <li
                key={tone.role}
                className={`compare__tone${inScale ? " compare__tone--common" : ""}`}
                data-in-scale={inScale ? "true" : "false"}
              >
                {formatNote(tone.note)}
                <span className="compare__mark">
                  {inScale
                    ? sameSpelling || !scaleNote
                      ? " (in scale)"
                      : ` (in scale, as ${formatNote(scaleNote)})`
                    : " (not in scale)"}
                </span>
              </li>
            ))}
          </ul>
        </li>
      </ul>
      <Piano
        tones={keys}
        name={scale.name}
        legend={SCALE_LEGEND}
        display="names"
        shared={result.sharedPitchClasses}
      />
      <div className="compare__actions">
        <button type="button" className="play__button" onClick={() => setPick(undefined)}>
          Stop comparing with a scale
        </button>
      </div>
    </section>
  );
}

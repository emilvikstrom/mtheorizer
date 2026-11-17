import { audioSupported, planProgression, playNotes } from "../audio/playback";
import type { ChordVs } from "../route";
import type { ToneDisplay } from "../toneLabels";
import {
  type Chord,
  type ChordSpec,
  type Note,
  chordFromSpec,
  chordOnKeyboard,
  compareChords,
  formatCommonTone,
  formatNote,
  nearestQuality,
  pitchClass,
  preferredRootSpelling,
} from "../theory";
import { ChordSymbolField } from "./ChordSymbolField";
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

/**
 * Compare the open chord with a second one: which tones they share (matched on the key they
 * press, so E♭ and D♯ count as the same, and said so), as a list and as dots on two keyboards.
 */
export function ChordCompare({ root, spec, inversion, vs, onChange, display }: ChordCompareProps) {
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

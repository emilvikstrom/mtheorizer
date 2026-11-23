import { useEffect, useRef, useState } from "react";
import { audioSupported, planProgression, playNotes, stopPlayback } from "../audio/playback";
import {
  type BuilderChord,
  type BuilderSize,
  type ChordQualityId,
  type Key,
  type KeyMode,
  MAJOR_SCALE,
  MAX_BUILDER_CHORDS,
  NATURAL_MINOR_SCALE,
  type Note,
  addBuilderChord,
  builderChord,
  builderChords,
  chordOnKeyboard,
  diatonicSevenths,
  diatonicTriads,
  formatKey,
  formatNote,
  key,
  keyScale,
  moveBuilderChord,
  pitchClass,
  preferredTonicSpelling,
  removeBuilderChord,
} from "../theory";
import { OptionPicker } from "./OptionPicker";
import { RootPicker } from "./RootPicker";
import { SoundSettings } from "./SoundSettings";

interface ProgressionBuilderProps {
  keyValue: Key;
  steps: readonly BuilderChord[];
  onChange: (key: Key, steps: readonly BuilderChord[]) => void;
  /** Open a chord of the progression in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
  /** Go back to the ready-made progressions. */
  onBack: () => void;
}

const MODES: readonly { value: KeyMode; label: string }[] = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
];

const SIZES: readonly { value: BuilderSize; label: string }[] = [
  { value: "triad", label: "Triads" },
  { value: "seventh", label: "Sevenths" },
];

/** The key with this tonic pitch class and the fewest accidentals. */
const keyOnPitchClass = (pc: number, mode: KeyMode): Key =>
  key(preferredTonicSpelling(pc, mode === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE), mode);

/**
 * Builds a progression from the key's own chords: pick chords from the key, then move or remove
 * them. Every chord shows its step number and tones, and the whole list is in the link.
 */
export function ProgressionBuilder({
  keyValue,
  steps,
  onChange,
  onOpenChord,
  onBack,
}: ProgressionBuilderProps) {
  const [size, setSize] = useState<BuilderSize>("triad");
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const loopRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const chords = builderChords(keyValue, steps);
  const palette = size === "seventh" ? diatonicSevenths(keyValue) : diatonicTriads(keyValue);
  const full = steps.length >= MAX_BUILDER_CHORDS;

  const halt = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    stopPlayback();
    setPlaying(false);
  };

  // Stop when the page is left, and when the progression changes under the sound.
  useEffect(() => halt, []);
  useEffect(() => {
    if (timer.current !== undefined) halt();
  }, [keyValue, steps]);

  const run = () => {
    const seconds = playNotes(
      planProgression(chords.map(({ chord }) => chordOnKeyboard(chord).map((t) => t.midi))),
    );
    setPlaying(true);
    // The tempo setting scales the plan, so the pause before the next round is the length played.
    timer.current = setTimeout(
      () => {
        if (loopRef.current) run();
        else halt();
      },
      Math.max(seconds, 0.5) * 1000,
    );
  };

  const toggleLoop = () => {
    loopRef.current = !loop;
    setLoop(!loop);
  };

  const change = (next: readonly BuilderChord[]) => onChange(keyValue, next);

  return (
    <div className="builder">
      <div className="progression__pickers">
        <OptionPicker
          legend="Mode"
          name="builder-mode"
          options={MODES}
          value={keyValue.mode}
          onChange={(mode) => onChange(keyOnPitchClass(pitchClass(keyValue.tonic), mode), steps)}
        />
        <RootPicker
          legend="Tonic"
          value={pitchClass(keyValue.tonic)}
          onChange={(pc) => onChange(keyOnPitchClass(pc, keyValue.mode), steps)}
        />
      </div>

      <section className="progression__result" aria-labelledby="builder-name">
        <header>
          <p className="key-details__eyebrow">Your progression</p>
          <h2 id="builder-name" className="key-details__name" aria-live="polite">
            {steps.length === 0
              ? `Build a progression in ${formatKey(keyValue)}`
              : chords.map(({ step }) => step.roman).join("–")}
          </h2>
          <p className="progression__scale">
            Key scale: {keyScale(keyValue).map(formatNote).join(" ")}
          </p>
        </header>

        <fieldset className="builder__palette">
          <legend className="picker__legend">Add a chord from {formatKey(keyValue)}</legend>
          <OptionPicker
            legend="Chord size"
            name="builder-size"
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <ul className="builder__choices">
            {palette.map((choice) => (
              <li key={choice.degree}>
                <button
                  type="button"
                  className="triad"
                  disabled={full}
                  aria-label={`Add ${choice.symbol} (${choice.roman})`}
                  onClick={() => change(addBuilderChord(steps, { degree: choice.degree, size }))}
                >
                  <span className="triad__roman">{choice.roman}</span>
                  <span className="triad__symbol">{choice.symbol}</span>
                </button>
              </li>
            ))}
          </ul>
          {full && (
            <p className="builder__hint">The progression is full ({MAX_BUILDER_CHORDS} chords).</p>
          )}
        </fieldset>

        {steps.length === 0 ? (
          <p className="builder__hint">No chords yet. Add some from the key above.</p>
        ) : (
          <ol className="builder__list" aria-label="Chords of your progression">
            {steps.map((item, i) => {
              const { step, chord } = builderChord(keyValue, item);
              const label = `${chord.symbol}, chord ${i + 1} of ${steps.length}`;
              return (
                <li key={`${i}-${item.degree}-${item.size}`} className="builder__item">
                  <span className="builder__number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    className="triad builder__chord"
                    aria-label={`Open ${chord.symbol} in Chords`}
                    onClick={() => onOpenChord(chord.root, step.quality)}
                  >
                    <span className="triad__roman">{step.roman}</span>
                    <span className="triad__symbol">{chord.symbol}</span>
                  </button>
                  <span className="builder__tones">
                    {chord.tones.map((t) => formatNote(t.note)).join(" ")}
                  </span>
                  <span className="builder__actions">
                    <button
                      type="button"
                      className="play__button"
                      aria-label={`Move ${label} earlier`}
                      disabled={i === 0}
                      onClick={() => change(moveBuilderChord(steps, i, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="play__button"
                      aria-label={`Move ${label} later`}
                      disabled={i === steps.length - 1}
                      onClick={() => change(moveBuilderChord(steps, i, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="play__button"
                      aria-label={`Remove ${label}`}
                      onClick={() => change(removeBuilderChord(steps, i))}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="builder__footer">
          {steps.length > 0 && (
            <button type="button" className="play__button" onClick={() => change([])}>
              Clear all
            </button>
          )}
          <button type="button" className="play__button" onClick={onBack}>
            Ready-made progressions
          </button>
        </div>

        {audioSupported() && steps.length > 0 && (
          <div className="play" role="group" aria-label="Listen">
            <button
              type="button"
              className="play__button"
              aria-label={
                playing
                  ? "Stop your progression"
                  : `Play your progression in ${formatKey(keyValue)}`
              }
              onClick={playing ? halt : run}
            >
              {playing ? "■ Stop" : "▶ Play progression"}
            </button>
            <button type="button" className="play__button" aria-pressed={loop} onClick={toggleLoop}>
              Loop
            </button>
            <SoundSettings />
          </div>
        )}
      </section>
    </div>
  );
}

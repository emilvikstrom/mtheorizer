import { useEffect, useRef, useState } from "react";
import { audioSupported, planProgression, playNotes, stopPlayback } from "../audio/playback";
import {
  type BuilderChord,
  type BuilderSize,
  type ChordQualityId,
  MAX_BUILDER_CHORDS,
  NEXT_REASONS,
  type Note,
  TONALITY_DESCRIPTIONS,
  type Tonality,
  addBuilderChord,
  builderChord,
  builderChords,
  characteristic,
  chordOnKeyboard,
  formatNote,
  formatTonality,
  moveBuilderChord,
  nextChords,
  removeBuilderChord,
  retune,
  tonality,
  tonalityName,
  tonalityScale,
  tonalitySevenths,
  tonalityTriads,
} from "../theory";
import { OptionPicker } from "./OptionPicker";
import { SoundSettings } from "./SoundSettings";
import { TonalityPicker, TonicPicker } from "./TonalityPicker";

interface ProgressionBuilderProps {
  value: Tonality;
  steps: readonly BuilderChord[];
  onChange: (tonality: Tonality, steps: readonly BuilderChord[]) => void;
  /** Open a chord of the progression in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
  /** Go back to the ready-made progressions. */
  onBack: () => void;
}

const SIZES: readonly { value: BuilderSize; label: string }[] = [
  { value: "triad", label: "Triads" },
  { value: "seventh", label: "Sevenths" },
];

/**
 * Builds a progression from a tonality's own chords: pick a major or minor key or a mode, add its
 * chords, then move or remove them. The chords that carry the mode's colour are marked, and a row
 * of suggestions offers chords that follow well after the last one.
 */
export function ProgressionBuilder({
  value,
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

  const chords = builderChords(value, steps);
  const palette = size === "seventh" ? tonalitySevenths(value) : tonalityTriads(value);
  const colour = characteristic(value.scale);
  const full = steps.length >= MAX_BUILDER_CHORDS;
  const name = formatTonality(value);
  const ideas = nextChords(value, steps.at(-1)?.degree);

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
  }, [value, steps]);

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

  const change = (next: readonly BuilderChord[]) => onChange(value, next);
  const add = (degree: number) => change(addBuilderChord(steps, { degree, size }));

  return (
    <div className="builder">
      <div className="progression__pickers">
        <TonalityPicker
          name="builder-tonality"
          value={value.scale}
          onChange={(id) => id && onChange(retune(value, id), steps)}
        />
        <TonicPicker
          name="builder-spelling"
          value={value}
          onChange={(tonic) => onChange(tonality(tonic, value.scale), steps)}
        />
      </div>

      <section className="progression__result" aria-labelledby="builder-name">
        <header>
          <p className="key-details__eyebrow">Your progression</p>
          <h2 id="builder-name" className="key-details__name" aria-live="polite">
            {steps.length === 0
              ? `Build a progression in ${name}`
              : chords.map(({ step }) => step.roman).join("–")}
          </h2>
          <p className="progression__scale">
            {name} scale: {tonalityScale(value).map(formatNote).join(" ")}
          </p>
          <p className="progression__description">
            {TONALITY_DESCRIPTIONS[value.scale]}
            {colour.labels.length > 0 &&
              ` Its colour against ${colour.reference === "major" ? "major" : "natural minor"}: ${colour.labels.join(", ")}.`}
          </p>
        </header>

        <fieldset className="builder__palette">
          <legend className="picker__legend">Add a chord from {name}</legend>
          <OptionPicker
            legend="Chord size"
            name="builder-size"
            options={SIZES}
            value={size}
            onChange={setSize}
          />
          <ul className="builder__choices">
            {palette.map((choice) => {
              const coloured = colour.chordDegrees.includes(choice.degree);
              return (
                <li key={choice.degree}>
                  <button
                    type="button"
                    className={`triad${coloured ? " triad--colour" : ""}`}
                    disabled={full}
                    aria-label={`Add ${choice.symbol} (${choice.roman})${coloured ? `, holds the ${tonalityName(value.scale)} colour` : ""}`}
                    onClick={() => add(choice.degree)}
                  >
                    <span className="triad__roman">{choice.roman}</span>
                    <span className="triad__symbol">{choice.symbol}</span>
                    <span className="triad__function" aria-hidden="true">
                      {coloured ? "colour" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {colour.chordDegrees.length > 0 && (
            <p className="builder__hint">
              Chords marked “colour” hold {colour.labels.join(" or ")}, the note that sets{" "}
              {tonalityName(value.scale)} apart. Use them to make the tonality heard.
            </p>
          )}
          {full && (
            <p className="builder__hint">The progression is full ({MAX_BUILDER_CHORDS} chords).</p>
          )}
        </fieldset>

        {!full && (
          <section className="builder__ideas" aria-labelledby="builder-ideas">
            <h3 id="builder-ideas" className="cadences__title">
              {steps.length === 0
                ? "Where to start"
                : `What could come after ${chords.at(-1)?.chord.symbol ?? ""}?`}
            </h3>
            <ul className="builder__idea-list">
              {ideas.map((idea) => {
                const chord = palette[idea.degree - 1];
                if (!chord) return null;
                return (
                  <li key={idea.degree} className="builder__idea">
                    <button
                      type="button"
                      className="triad"
                      aria-label={`Add ${chord.symbol} (${chord.roman}) next`}
                      onClick={() => add(idea.degree)}
                    >
                      <span className="triad__roman">{chord.roman}</span>
                      <span className="triad__symbol">{chord.symbol}</span>
                    </button>
                    <span className="builder__idea-reason">{NEXT_REASONS[idea.reason]}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {steps.length === 0 ? (
          <p className="builder__hint">No chords yet. Add some from {name} above.</p>
        ) : (
          <ol className="builder__list" aria-label="Chords of your progression">
            {steps.map((item, i) => {
              const { step, chord } = builderChord(value, item);
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
              aria-label={playing ? "Stop your progression" : `Play your progression in ${name}`}
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

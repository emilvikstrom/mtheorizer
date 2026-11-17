import type { CSSProperties } from "react";
import { audioSupported, planProgression, playNotes } from "../audio/playback";
import {
  CADENCES,
  CADENCE_IDS,
  type Cadence,
  type ChordQualityId,
  type KeyMode,
  type Note,
  PROGRESSIONS,
  PROGRESSION_IDS,
  type ProgressionId,
  chordOnKeyboard,
  commonSpellings,
  type Key,
  formatKey,
  formatNote,
  keyScale,
  keysAt,
  cadenceChords,
  circlePosition,
  noteEquals,
  pitchClass,
  progressionChords,
  progressionKey,
  progressionKeyOn,
} from "../theory";
import { OptionPicker } from "./OptionPicker";
import { RootPicker } from "./RootPicker";

interface ProgressionViewProps {
  tonic: Note;
  id: ProgressionId;
  onChange: (tonic: Note, id: ProgressionId) => void;
  /** Open a chord of the progression in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
}

/** The spellings of this tonic that are keys on the circle of fifths (so not D♯ major). */
function keySpellings(pc: number, mode: KeyMode): Note[] {
  return commonSpellings(pc).filter((n) =>
    keysAt(circlePosition({ tonic: n, mode }), mode).some((k) => noteEquals(k.tonic, n)),
  );
}

/** The four cadences in the key of the shown progression, each with its own play button. */
function Cadences({ k }: { k: Key }) {
  const play = (cadence: Cadence) =>
    playNotes(
      planProgression(
        cadenceChords(cadence, k).map(({ chord }) => chordOnKeyboard(chord).map((t) => t.midi)),
      ),
    );
  return (
    <section className="cadences" aria-labelledby="cadences-title">
      <h3 id="cadences-title" className="cadences__title">
        Cadences in {formatKey(k)}
      </h3>
      <ul className="cadences__list">
        {CADENCE_IDS.map((cid) => {
          const cadence = CADENCES[cid];
          const chords = cadenceChords(cadence, k);
          return (
            <li key={cid} className="cadence">
              <p className="cadence__name">{cadence.name}</p>
              <p className="cadence__chords">
                {chords.map(({ step }) => step.roman).join("–")}
                {": "}
                {chords.map(({ chord }) => chord.symbol).join(" → ")}
              </p>
              <p className="cadence__description">{cadence.description}</p>
              {audioSupported() && (
                <button
                  type="button"
                  className="play__button"
                  aria-label={`Play ${cadence.name.toLowerCase()} cadence in ${formatKey(k)}`}
                  onClick={() => play(cadence)}
                >
                  ▶ Play
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Common chord progressions put in a key, with step numbers; each chord opens in the chord view. */
export function ProgressionView({ tonic, id, onChange, onOpenChord }: ProgressionViewProps) {
  const progression = PROGRESSIONS[id];
  const k = progressionKeyOn(progression, tonic);
  const chords = progressionChords(progression, k);
  const pc = pitchClass(tonic);
  const spellings = keySpellings(pc, progression.mode);

  const play = () =>
    playNotes(
      planProgression(chords.map(({ chord }) => chordOnKeyboard(chord).map((t) => t.midi))),
    );

  return (
    <div className="progression">
      <div className="progression__pickers">
        <OptionPicker
          legend="Progression"
          name="progression"
          options={PROGRESSION_IDS.map((pid) => ({ value: pid, label: PROGRESSIONS[pid].name }))}
          value={id}
          onChange={(next) =>
            onChange(
              // Keep the tonic when the new progression is in the same mode, otherwise respell it.
              PROGRESSIONS[next].mode === progression.mode
                ? tonic
                : progressionKey(PROGRESSIONS[next], pc).tonic,
              next,
            )
          }
        />
        <RootPicker
          legend="Tonic"
          value={pc}
          onChange={(newPc) => onChange(progressionKey(progression, newPc).tonic, id)}
        />
        {spellings.length > 1 && (
          <OptionPicker
            legend="Spelling"
            name="progression-spelling"
            options={spellings.map((n) => ({ value: formatNote(n), label: formatNote(n) }))}
            value={formatNote(tonic)}
            onChange={(name) => {
              const chosen = spellings.find((n) => formatNote(n) === name);
              if (chosen) onChange(chosen, id);
            }}
          />
        )}
      </div>

      <section className="progression__result" aria-labelledby="progression-name">
        <header>
          <p className="key-details__eyebrow">Chord progression</p>
          <h2 id="progression-name" className="key-details__name" aria-live="polite">
            {progression.name} in {formatKey(k)}
          </h2>
          <p className="progression__description">{progression.description}</p>
          <p className="progression__scale">Key scale: {keyScale(k).map(formatNote).join(" ")}</p>
        </header>

        <ol
          className="progression__chords"
          aria-label="Chords of the progression"
          style={{ "--per-row": progression.perRow } as CSSProperties}
        >
          {chords.map(({ step, chord }, i) => (
            <li key={i}>
              <button
                type="button"
                className="triad"
                aria-label={`Open ${chord.symbol} in Chords & scales`}
                onClick={() => onOpenChord(chord.root, step.quality)}
              >
                <span className="triad__roman">{step.roman}</span>
                <span className="triad__symbol">{chord.symbol}</span>
              </button>
            </li>
          ))}
        </ol>

        {audioSupported() && (
          <div className="play" role="group" aria-label="Listen">
            <button
              type="button"
              className="play__button"
              aria-label={`Play ${progression.name} in ${formatKey(k)}`}
              onClick={play}
            >
              ▶ Play progression
            </button>
          </div>
        )}
      </section>

      <Cadences k={k} />
    </div>
  );
}

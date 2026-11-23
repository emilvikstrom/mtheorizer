import { type CSSProperties, useState } from "react";
import { audioSupported, planProgression, playNotes } from "../audio/playback";
import {
  type BuilderChord,
  CADENCES,
  CADENCE_IDS,
  type Cadence,
  type ChordQualityId,
  type Note,
  PROGRESSIONS,
  PROGRESSION_TAGS,
  type ProgressionId,
  type ProgressionTag,
  TONALITY_DESCRIPTIONS,
  type Tonality,
  type TonalityId,
  builderStepsFor,
  cadenceChords,
  chordOnKeyboard,
  describeVoiceLeading,
  findProgressions,
  formatKey,
  formatNote,
  formatTonality,
  type Key,
  progressionChords,
  progressionTonalityOn,
  retune,
  tonalityKey,
  tonalityLabel,
  tonalityScale,
  voiceProgression,
} from "../theory";
import { ChromaticChords } from "./ChromaticChords";
import { LeadingToneChords } from "./LeadingToneChords";
import { SoundSettings } from "./SoundSettings";
import { TonalityPicker, TonicPicker } from "./TonalityPicker";
import { VoiceLeadingPiano } from "./VoiceLeadingPiano";

interface ProgressionViewProps {
  tonic: Note;
  id: ProgressionId;
  onChange: (tonic: Note, id: ProgressionId) => void;
  /** Open the builder in this tonality, with these chords (empty to start from scratch). */
  onBuild?: (tonality: Tonality, steps: readonly BuilderChord[]) => void;
  /** Open a chord of the progression in the chord view. */
  onOpenChord: (root: Note, quality: ChordQualityId) => void;
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

interface FinderProps {
  selected: ProgressionId;
  onPick: (id: ProgressionId) => void;
}

/** Keywords and a tonality to narrow the list of ready-made progressions down, then the matches. */
function ProgressionFinder({ selected, onPick }: FinderProps) {
  const [tags, setTags] = useState<readonly ProgressionTag[]>([]);
  const [only, setOnly] = useState<TonalityId | undefined>(undefined);
  const found = findProgressions(tags, only);
  const toggle = (tag: ProgressionTag) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );

  return (
    <section className="finder" aria-labelledby="finder-title">
      <h3 id="finder-title" className="cadences__title">
        Find a progression
      </h3>
      <div className="finder__tags" role="group" aria-label="Keywords">
        {PROGRESSION_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className="finder__tag"
            aria-pressed={tags.includes(tag)}
            onClick={() => toggle(tag)}
          >
            {tag}
          </button>
        ))}
        {tags.length > 0 && (
          <button type="button" className="finder__tag finder__clear" onClick={() => setTags([])}>
            Clear keywords
          </button>
        )}
      </div>
      <details className="finder__tonality">
        <summary>
          Tonality: {only === undefined ? "any" : tonalityLabel(only).toLowerCase()}
        </summary>
        <TonalityPicker
          name="finder-tonality"
          legend="Only progressions in"
          value={only}
          onChange={setOnly}
          anyLabel="Any"
        />
      </details>
      <p className="finder__count" aria-live="polite">
        {found.length === 0
          ? "No progression has all of these keywords. Try fewer."
          : `${found.length} progression${found.length === 1 ? "" : "s"}`}
      </p>
      <ul className="finder__list" aria-label="Progressions">
        {found.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="finder__item"
              aria-label={`${p.title}: ${p.name}, ${tonalityLabel(p.tonality).toLowerCase()}`}
              aria-pressed={p.id === selected}
              onClick={() => onPick(p.id)}
            >
              <span className="finder__title">{p.title}</span>
              <span className="finder__name">{p.name}</span>
              <span className="finder__meta">
                {tonalityLabel(p.tonality)} · {p.tags.join(", ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Common chord progressions in major, minor and the modes, found by keyword or tonality and put
 * on any tonic. Each chord opens in the chord view.
 */
export function ProgressionView({
  tonic,
  id,
  onChange,
  onBuild,
  onOpenChord,
}: ProgressionViewProps) {
  const progression = PROGRESSIONS[id];
  const t = progressionTonalityOn(progression, tonic);
  const chords = progressionChords(progression, t);
  const name = formatTonality(t);
  const k: Key | undefined = tonalityKey(t);
  const editable = builderStepsFor(progression);

  // Smooth voicing: each chord in the inversion and octave that keeps the movement small.
  const [smooth, setSmooth] = useState(false);
  const voiced = smooth ? voiceProgression(chords.map(({ chord }) => chord)) : undefined;

  const play = () =>
    playNotes(
      planProgression(
        voiced
          ? voiced.voicings.map((tones) => tones.map((x) => x.midi))
          : chords.map(({ chord }) => chordOnKeyboard(chord).map((x) => x.midi)),
      ),
    );

  return (
    <div className="progression">
      <ProgressionFinder
        selected={id}
        onPick={(next) => onChange(retune(t, PROGRESSIONS[next].tonality).tonic, next)}
      />

      <div className="progression__pickers">
        <TonicPicker
          name="progression-spelling"
          value={t}
          onChange={(next) => onChange(next, id)}
        />
      </div>

      <section className="progression__result" aria-labelledby="progression-name">
        <header>
          <p className="key-details__eyebrow">{progression.title}</p>
          <h2 id="progression-name" className="key-details__name" aria-live="polite">
            {progression.name} in {name}
          </h2>
          <p className="progression__description">{progression.description}</p>
          <p className="progression__scale">
            {name} scale: {tonalityScale(t).map(formatNote).join(" ")}
          </p>
          {progression.tonality !== "major" && (
            <p className="progression__scale">{TONALITY_DESCRIPTIONS[progression.tonality]}</p>
          )}
          <ul className="progression__tags" aria-label="Keywords">
            {progression.tags.map((tag) => (
              <li key={tag} className="progression__tag">
                {tag}
              </li>
            ))}
          </ul>
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
                aria-label={`Open ${chord.symbol} in Chords`}
                onClick={() => onOpenChord(chord.root, step.quality)}
              >
                <span className="triad__roman">{step.roman}</span>
                <span className="triad__symbol">{chord.symbol}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="voicing-toggle">
          <button
            type="button"
            className="play__button"
            aria-pressed={smooth}
            onClick={() => setSmooth((on) => !on)}
          >
            Smooth voicing
          </button>
          <span className="voicing-toggle__hint">
            {smooth
              ? "Each chord takes the inversion that moves the least from the one before."
              : "Chords are played in root position."}
          </span>
        </div>

        {voiced && (
          <ol className="voice-leading" aria-label="Voice leading between the chords">
            {voiced.transitions.map((transition, i) => (
              <li key={i} className="voice-leading__step">
                <span className="voice-leading__chords">
                  {chords[i]?.chord.symbol} → {chords[i + 1]?.chord.symbol}
                </span>
                <span className="voice-leading__text">{describeVoiceLeading(transition)}</span>
                <details className="voice-leading__piano">
                  <summary>
                    Show on the piano: {chords[i]?.chord.symbol} → {chords[i + 1]?.chord.symbol}
                  </summary>
                  <VoiceLeadingPiano
                    leading={transition}
                    names={[chords[i]?.chord.symbol ?? "", chords[i + 1]?.chord.symbol ?? ""]}
                  />
                </details>
              </li>
            ))}
          </ol>
        )}

        {audioSupported() && (
          <div className="play" role="group" aria-label="Listen">
            <button
              type="button"
              className="play__button"
              aria-label={`Play ${progression.name} in ${name}${smooth ? " with smooth voicing" : ""}`}
              onClick={play}
            >
              ▶ Play progression
            </button>
            <SoundSettings />
          </div>
        )}

        {onBuild && (
          <div className="builder__footer">
            {editable && (
              <button type="button" className="play__button" onClick={() => onBuild(t, editable)}>
                Edit this progression
              </button>
            )}
            <button type="button" className="play__button" onClick={() => onBuild(t, [])}>
              Build your own progression in {name}
            </button>
          </div>
        )}
      </section>

      {k && <Cadences k={k} />}

      {k && (
        <section className="key-details chromatic-harmony" aria-labelledby="chromatic-harmony">
          <h3 id="chromatic-harmony" className="key-details__name">
            Chromatic chords in {formatKey(k)}
          </h3>
          <p className="key-details__text">
            Chords from outside the key that lead into one of its chords by a half step. Use them to
            colour a progression. Click one to open it.
          </p>
          <LeadingToneChords value={k} onOpenChord={onOpenChord} />
          <ChromaticChords value={k} onOpenChord={onOpenChord} />
        </section>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { audioSupported, planPlayback, playNotes, stopPlayback } from "../audio/playback";
import { type QuizRoute } from "../route";
import {
  type ChordQualityId,
  DEFAULT_LISTENING_LEVEL,
  LISTENING_LEVELS,
  type ListeningLevelId,
  type ListeningQuestion,
  gradeListening,
  inversionName,
  listeningChoices,
  listeningChord,
  listeningDeck,
  listeningKeys,
} from "../theory";
import { Piano } from "./Piano";

const SEED_LIMIT = 1_000_000_000;
const randomSeed = () => Math.floor(Math.random() * SEED_LIMIT);

const LEGEND = { root: "Root", tone: "Chord tone" };

/** Plays the chord of the question, all tones at once. */
function play(question: ListeningQuestion) {
  stopPlayback();
  playNotes(
    planPlayback(
      listeningKeys(question).map((k) => k.midi),
      "together",
    ),
  );
}

interface DrillProps {
  seed: number;
  level: ListeningLevelId;
  inversions: boolean;
  onNewSet: () => void;
}

function Drill({ seed, level, inversions, onNewSet }: DrillProps) {
  const deck = useMemo(() => listeningDeck(seed, level, inversions), [seed, level, inversions]);
  const [index, setIndex] = useState(0);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [answer, setAnswer] = useState<ChordQualityId | undefined>();
  const question = deck[index];
  const sound = audioSupported();

  // Nothing keeps sounding when the drill goes away.
  useEffect(() => stopPlayback, []);

  if (!question) {
    return (
      <div className="quiz__feedback">
        <p className="quiz__verdict">
          That was every question in this set: {right} of {asked} right.
        </p>
        <button type="button" className="quiz__next" onClick={onNewSet}>
          New set
        </button>
      </div>
    );
  }

  const choose = (id: ChordQualityId) => {
    if (answer !== undefined) return;
    setAnswer(id);
    setAsked(asked + 1);
    if (gradeListening(question, id)) setRight(right + 1);
  };

  const next = () => {
    const following = deck[index + 1];
    setIndex(index + 1);
    setAnswer(undefined);
    // Pressing the button counts as the click a browser wants before it lets sound play.
    if (following && sound) play(following);
    else stopPlayback();
  };

  const chord = listeningChord(question);
  const correct = answer !== undefined && gradeListening(question, answer);

  return (
    <>
      <p className="quiz__score" aria-live="polite">
        {asked === 0 ? "Nothing answered yet." : `${right} of ${asked} right.`} Question {index + 1}{" "}
        of {deck.length}.
      </p>

      <p className="quiz__question">What kind of chord is this?</p>

      {sound ? (
        <button
          type="button"
          className="play__button listening__play"
          onClick={() => play(question)}
        >
          ▶ {answer === undefined && index === 0 && asked === 0 ? "Play the chord" : "Play again"}
        </button>
      ) : (
        <p className="spelling__hint">
          This browser cannot play sound, so this drill needs one that can.
        </p>
      )}

      <div className="listening__choices" role="group" aria-label="The chord is">
        {listeningChoices(level).map(({ id, name }) => {
          const state =
            answer === undefined
              ? ""
              : id === question.qualityId
                ? " quiz__choice--right"
                : id === answer
                  ? " quiz__choice--wrong"
                  : "";
          return (
            <button
              key={id}
              type="button"
              className={`quiz__choice${state}`}
              disabled={answer !== undefined}
              onClick={() => choose(id)}
            >
              {name}
            </button>
          );
        })}
      </div>

      {answer !== undefined && (
        <div className="quiz__feedback" role="status">
          <p className={`quiz__verdict quiz__verdict--${correct ? "right" : "wrong"}`}>
            {correct ? "Right." : "Not quite."} It was {chord.symbol} ({chord.name})
            {question.inversion > 0
              ? `, in ${inversionName(question.inversion).toLowerCase()}`
              : ""}
            .
          </p>
          <Piano
            tones={listeningKeys(question)}
            name={`${chord.name}${question.inversion > 0 ? `, ${inversionName(question.inversion).toLowerCase()}` : ""}`}
            legend={LEGEND}
          />
          <button type="button" className="quiz__next" onClick={next}>
            Next question
          </button>
        </div>
      )}
    </>
  );
}

interface ListeningQuizProps {
  route: QuizRoute;
  onChange: (route: QuizRoute, options?: { replace?: boolean }) => void;
}

/**
 * Listening practice: a chord is played and the quality is picked from a list. The link carries
 * the seed of the set, the level and whether chords are turned over, so a set can be repeated.
 * The chord's name is not on the page until it has been answered.
 */
export function ListeningQuiz({ route, onChange }: ListeningQuizProps) {
  const [fallbackSeed] = useState(randomSeed);
  const seed = route.seed ?? fallbackSeed;
  const level = route.level ?? DEFAULT_LISTENING_LEVEL;
  const inversions = route.inversions === true;

  // Put the seed in the link, replacing the entry so that Back does not come to a link without one.
  useEffect(() => {
    if (route.seed === undefined) onChange({ ...route, seed: fallbackSeed }, { replace: true });
  }, [route, fallbackSeed, onChange]);

  const change = (next: { seed?: number; level?: ListeningLevelId; inversions?: boolean }) => {
    const nextLevel = next.level ?? level;
    const nextInversions = next.inversions ?? inversions;
    onChange({
      page: "quiz",
      mode: "listening",
      seed: next.seed ?? seed,
      ...(nextLevel !== DEFAULT_LISTENING_LEVEL ? { level: nextLevel } : {}),
      ...(nextInversions ? { inversions: true as const } : {}),
    });
  };

  return (
    <section className="quiz" aria-labelledby="listening-heading">
      <h2 id="listening-heading" className="quiz__heading">
        Listening
      </h2>

      <div className="practice__modes" role="group" aria-label="Chords to tell apart">
        {LISTENING_LEVELS.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            className="practice__mode"
            aria-pressed={level === id}
            onClick={() => level !== id && change({ level: id })}
          >
            {name}
          </button>
        ))}
      </div>
      <label className="spelling__group">
        <input
          type="checkbox"
          checked={inversions}
          onChange={() => change({ inversions: !inversions })}
        />
        Turn the chords over (inversions)
      </label>
      <p className="spelling__hint">
        Set {seed}. The link asks the same questions in the same order.{" "}
        <button
          type="button"
          className="spelling__link"
          onClick={() => change({ seed: randomSeed() })}
        >
          New set
        </button>
      </p>

      <Drill
        key={`${seed}:${level}:${inversions}`}
        seed={seed}
        level={level}
        inversions={inversions}
        onNewSet={() => change({ seed: randomSeed() })}
      />
    </section>
  );
}

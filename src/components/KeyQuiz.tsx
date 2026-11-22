import { useEffect, useMemo, useState } from "react";
import { type QuizRoute } from "../route";
import {
  type Key,
  type KeyMode,
  type KeyQuestion,
  type KeyQuizOptions,
  MAX_ACCIDENTALS,
  type MissLog,
  type Note,
  type Random,
  type SignatureAnswer,
  SIGNATURES,
  answerTonics,
  formatKey,
  formatNote,
  isCorrect,
  keyDeck,
  keySignature,
  keysFor,
  missedKeys,
  newDeck,
  overLimit,
  recordResult,
  signatureOf,
  tonicOverLimit,
} from "../theory";
import { loadMissLog, saveMissLog } from "../keyQuizLog";
import { CircleOfFifths } from "./CircleOfFifths";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "no sharps or flats", "1 sharp", "3 flats". */
export function describeSignature({ kind, count }: SignatureAnswer): string {
  if (kind === "none" || count === 0) return "no sharps or flats";
  return plural(count, kind === "sharps" ? "sharp" : "flat");
}

const questionText = (q: KeyQuestion) =>
  q.type === "count"
    ? `How many sharps or flats does ${formatKey(q.key)} have?`
    : `Which ${q.mode} key has ${describeSignature(q.signature)}?`;

/** What the key's signature is made of: "3 sharps (F♯ C♯ G♯)". */
function spelledOut(k: Key): string {
  const { accidentals } = keySignature(k);
  const list = accidentals.map(formatNote).join(" ");
  return `${describeSignature(signatureOf(k))}${list ? ` (${list})` : ""}`;
}

interface Given {
  readonly answer: SignatureAnswer | Note;
  readonly right: boolean;
}

const OVER_NOTE_ID = "quiz-over-note";

interface DrillProps {
  seed: number;
  options: KeyQuizOptions;
  random?: Random;
  /** Called with the key asked and whether it was answered right. */
  onResult?: (key: Key, correct: boolean) => void;
}

/** The questions, one deck after another; the first deck is the one the seed gives. */
function Drill({ seed, options, random, onResult }: DrillProps) {
  const limit = options.maxAccidentals ?? MAX_ACCIDENTALS;
  const [round, setRound] = useState(0);
  const [deck, setDeck] = useState(() =>
    random ? newDeck(random, options) : keyDeck(seed, 0, options),
  );
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [given, setGiven] = useState<Given | undefined>();
  const question = deck[0];
  if (!question) return null;

  function answer(a: SignatureAnswer | Note) {
    if (given || !question) return;
    const correct = isCorrect(question, a);
    setGiven({ answer: a, right: correct });
    setAsked(asked + 1);
    if (correct) setRight(right + 1);
    onResult?.(question.key, correct);
  }

  function next() {
    const rest = deck.slice(1);
    if (rest.length > 0) {
      setDeck(rest);
    } else {
      setDeck(random ? newDeck(random, options) : keyDeck(seed, round + 1, options));
      setRound(round + 1);
    }
    setGiven(undefined);
  }

  const mode: KeyMode = question.type === "find" ? question.mode : question.key.mode;
  const unique = (list: readonly SignatureAnswer[], kind: SignatureAnswer["kind"]) =>
    list.filter((s) => s.kind === kind);
  const choose = (s: SignatureAnswer) =>
    given && isCorrect(question, s)
      ? "quiz__choice quiz__choice--right"
      : given && !given.right && given.answer === s
        ? "quiz__choice quiz__choice--wrong"
        : overLimit(s, limit)
          ? "quiz__choice quiz__choice--over"
          : "quiz__choice";
  // A greyed answer stays in the tab order and is read as unavailable; choosing it does nothing.
  const overProps = (over: boolean) =>
    over ? { "aria-disabled": true, "aria-describedby": OVER_NOTE_ID } : {};

  return (
    <>
      <p className="quiz__score" aria-live="polite">
        {asked === 0 ? "Nothing answered yet." : `${right} of ${asked} right.`}
      </p>

      <p className="quiz__question">{questionText(question)}</p>

      {limit < MAX_ACCIDENTALS && (
        <p id={OVER_NOTE_ID} className="quiz__over-note">
          Greyed answers (dashed outline) have more than {plural(limit, "accidental")}, so they
          cannot be right in this set. They stay here so the choices look the same in every set.
        </p>
      )}

      {question.type === "count" ? (
        <div className="quiz__answers" role="group" aria-label="Answers">
          <div className="quiz__row">
            {unique(SIGNATURES, "none").map((s) => (
              <button
                key="none"
                type="button"
                className={choose(s)}
                disabled={given !== undefined}
                onClick={() => !overLimit(s, limit) && answer(s)}
                {...overProps(overLimit(s, limit))}
              >
                None
              </button>
            ))}
          </div>
          {(["sharps", "flats"] as const).map((kind) => (
            <div key={kind} className="quiz__row">
              {unique(SIGNATURES, kind).map((s) => (
                <button
                  key={`${kind}-${s.count}`}
                  type="button"
                  className={choose(s)}
                  disabled={given !== undefined}
                  onClick={() => !overLimit(s, limit) && answer(s)}
                  {...overProps(overLimit(s, limit))}
                >
                  {describeSignature(s)}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="quiz__answers" role="group" aria-label="Answers">
          <div className="quiz__row quiz__row--tonics">
            {answerTonics(mode).map((tonic) => {
              const isRight = given !== undefined && isCorrect(question, tonic);
              const isWrong = given !== undefined && !given.right && given.answer === tonic;
              const over = !isRight && !isWrong && tonicOverLimit(tonic, mode, limit);
              return (
                <button
                  key={formatNote(tonic)}
                  type="button"
                  className={`quiz__choice${isRight ? " quiz__choice--right" : ""}${isWrong ? " quiz__choice--wrong" : ""}${over ? " quiz__choice--over" : ""}`}
                  aria-label={`${formatNote(tonic)} ${mode}`}
                  disabled={given !== undefined}
                  onClick={() => !tonicOverLimit(tonic, mode, limit) && answer(tonic)}
                  {...overProps(over)}
                >
                  {formatNote(tonic)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {given && (
        <div className="quiz__feedback" role="status">
          <p className={`quiz__verdict quiz__verdict--${given.right ? "right" : "wrong"}`}>
            {given.right ? "Right." : "Not quite."} {formatKey(question.key)} has{" "}
            {spelledOut(question.key)}.
          </p>
          <figure className="quiz__circle">
            <CircleOfFifths value={question.key} onChange={() => undefined} rings={2} />
            <figcaption className="quiz__caption">
              On the circle of fifths: {formatKey(question.key)} sits at the highlighted segment,
              with its signature on the outside.
            </figcaption>
          </figure>
          <button type="button" className="quiz__next" onClick={next}>
            Next question
          </button>
        </div>
      )}
    </>
  );
}

const SEED_LIMIT = 1_000_000_000;
const randomSeed = () => Math.floor(Math.random() * SEED_LIMIT);

const KEY_CHOICES: readonly { readonly id: KeyMode | "all"; readonly label: string }[] = [
  { id: "all", label: "Major and minor" },
  { id: "major", label: "Major" },
  { id: "minor", label: "Minor" },
];

interface KeyQuizProps {
  route?: QuizRoute;
  onChange?: (route: QuizRoute, options?: { replace?: boolean }) => void;
  /** Where the order of the questions comes from instead of the seed; for tests. */
  random?: Random;
}

/**
 * Key-signature practice: how many sharps or flats a key has, and which key has a given
 * signature. Every key is asked both ways before any is repeated. The circle of fifths
 * shows the answer afterwards. The link carries the seed of the set and what to practise
 * (major or minor keys, and up to so many accidentals), so the same set can be asked again.
 */
export function KeyQuiz({ route = { page: "quiz" }, onChange, random }: KeyQuizProps) {
  const [fallbackSeed] = useState(randomSeed);
  const seed = route.seed ?? fallbackSeed;
  const upTo = route.upTo ?? MAX_ACCIDENTALS;

  // Put the seed in the link, replacing the entry so that Back does not come to a link without one.
  useEffect(() => {
    if (route.seed === undefined) onChange?.({ ...route, seed: fallbackSeed }, { replace: true });
  }, [route, fallbackSeed, onChange]);

  // The keys answered wrong, remembered between visits. Practising them again takes a copy,
  // so the set does not shrink under the drill as the keys are answered right.
  const [log, setLog] = useState<MissLog>(loadMissLog);
  const [redo, setRedo] = useState<readonly Key[] | undefined>();

  const options = useMemo<KeyQuizOptions>(
    () => ({
      ...(route.keys ? { mode: route.keys } : {}),
      maxAccidentals: upTo,
      ...(redo ? { only: redo } : {}),
    }),
    [route.keys, upTo, redo],
  );
  const missedHere = keysFor({
    ...(route.keys ? { mode: route.keys } : {}),
    maxAccidentals: upTo,
    only: missedKeys(log),
  });

  const record = (k: Key, correct: boolean) => {
    const next = recordResult(log, k, correct);
    setLog(next);
    saveMissLog(next);
  };

  const change = (next: { seed?: number; keys?: KeyMode | "all"; upTo?: number }) => {
    const keys = next.keys === undefined ? route.keys : next.keys === "all" ? undefined : next.keys;
    const limit = next.upTo ?? upTo;
    // The copy of the missed keys was made for the old choices.
    if (next.keys !== undefined || next.upTo !== undefined) setRedo(undefined);
    onChange?.({
      page: "quiz",
      seed: next.seed ?? seed,
      ...(keys ? { keys } : {}),
      ...(limit < MAX_ACCIDENTALS ? { upTo: limit } : {}),
    });
  };

  const count = keysFor(options).length * 2;
  const missedNames = missedKeys(log).map(formatKey);

  return (
    <section className="quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="quiz__heading">
        Key signatures
      </h2>

      <fieldset className="spelling__groups">
        <legend>Practise</legend>
        {KEY_CHOICES.map(({ id, label }) => (
          <label key={id} className="spelling__group">
            <input
              type="radio"
              name="quiz-keys"
              checked={(route.keys ?? "all") === id}
              onChange={() => change({ keys: id })}
            />
            {label}
          </label>
        ))}
        <label className="spelling__group">
          Signatures
          <select
            className="quiz__limit"
            value={upTo}
            onChange={(event) => change({ upTo: Number(event.target.value) })}
          >
            <option value={MAX_ACCIDENTALS}>Any number of accidentals</option>
            <option value={0}>No sharps or flats</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Up to {n} {n === 1 ? "accidental" : "accidentals"}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <p className="spelling__hint">
        Set {seed}, {count} questions. The link asks the same questions in the same order.{" "}
        <button
          type="button"
          className="spelling__link"
          onClick={() => change({ seed: randomSeed() })}
        >
          New set
        </button>
      </p>

      <p className="spelling__hint">
        {missedNames.length === 0
          ? "No keys answered wrong yet."
          : `Answered wrong: ${missedNames.join(", ")}.`}{" "}
        <label className="spelling__group">
          <input
            type="checkbox"
            checked={redo !== undefined}
            disabled={redo === undefined && missedHere.length === 0}
            onChange={(event) => setRedo(event.target.checked ? missedHere : undefined)}
          />
          Practise only the keys answered wrong
        </label>
        {redo === undefined && missedNames.length > 0 && missedHere.length === 0 && (
          <> None of them fit the choices above.</>
        )}
      </p>

      <Drill
        key={`${seed}:${route.keys ?? "all"}:${upTo}:${redo ? redo.map(formatKey).join() : ""}`}
        seed={seed}
        options={options}
        random={random}
        onResult={record}
      />
    </section>
  );
}

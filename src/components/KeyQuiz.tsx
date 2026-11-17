import { useState } from "react";
import {
  type Key,
  type KeyMode,
  type KeyQuestion,
  type Note,
  type Random,
  type SignatureAnswer,
  SIGNATURES,
  answerTonics,
  formatKey,
  formatNote,
  isCorrect,
  keySignature,
  newDeck,
  signatureOf,
} from "../theory";
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

/**
 * Key-signature practice: how many sharps or flats a key has, and which key has a given
 * signature. Every key is asked both ways before any is repeated. The circle of fifths
 * shows the answer afterwards.
 */
export function KeyQuiz({ random }: { random?: Random }) {
  const [deck, setDeck] = useState(() => newDeck(random));
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
  }

  function next() {
    const rest = deck.slice(1);
    setDeck(rest.length > 0 ? rest : newDeck(random));
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
        : "quiz__choice";

  return (
    <section className="quiz" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="quiz__heading">
        Key signatures
      </h2>
      <p className="quiz__score" aria-live="polite">
        {asked === 0 ? "Nothing answered yet." : `${right} of ${asked} right.`}
      </p>

      <p className="quiz__question">{questionText(question)}</p>

      {question.type === "count" ? (
        <div className="quiz__answers" role="group" aria-label="Answers">
          <div className="quiz__row">
            {unique(SIGNATURES, "none").map((s) => (
              <button
                key="none"
                type="button"
                className={choose(s)}
                disabled={given !== undefined}
                onClick={() => answer(s)}
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
                  onClick={() => answer(s)}
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
              return (
                <button
                  key={formatNote(tonic)}
                  type="button"
                  className={`quiz__choice${isRight ? " quiz__choice--right" : ""}${isWrong ? " quiz__choice--wrong" : ""}`}
                  aria-label={`${formatNote(tonic)} ${mode}`}
                  disabled={given !== undefined}
                  onClick={() => answer(tonic)}
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
    </section>
  );
}

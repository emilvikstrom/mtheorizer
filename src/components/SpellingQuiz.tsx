import { useEffect, useMemo, useState } from "react";
import { type QuizRoute } from "../route";
import {
  ALL_SPELLING_GROUPS,
  type KeyboardTone,
  type Note,
  SPELLING_GROUPS,
  type SpellingGrade,
  type SpellingGroupId,
  allSpellings,
  expectedNotes,
  formatNote,
  gradeSpelling,
  midiOf,
  note,
  noteEquals,
  parseSpelledNotes,
  pitchClass,
  pitchClassLabel,
  spellingDeck,
  spellingTitle,
} from "../theory";
import { Piano } from "./Piano";

const WHITE_KEYS = new Set([0, 2, 4, 5, 7, 9, 11]);
const SEED_LIMIT = 1_000_000_000;

const randomSeed = () => Math.floor(Math.random() * SEED_LIMIT);
const spelledList = (notes: readonly Note[]) => notes.map(formatNote).join("–");

/** The keys that are pressed, each with the spelling chosen for it (a white key starts as itself). */
type Pressed = ReadonlyMap<number, Note | undefined>;

interface Checked {
  readonly grade: SpellingGrade;
}

interface DrillProps {
  seed: number;
  groups: readonly SpellingGroupId[];
  onNewSet: () => void;
}

function Drill({ seed, groups, onNewSet }: DrillProps) {
  const deck = useMemo(() => spellingDeck(seed, groups), [seed, groups]);
  const [index, setIndex] = useState(0);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [method, setMethod] = useState<"piano" | "type">("piano");
  const [pressed, setPressed] = useState<Pressed>(new Map());
  const [typed, setTyped] = useState("");
  const [unreadable, setUnreadable] = useState(false);
  const [checked, setChecked] = useState<Checked | undefined>();
  const question = deck[index];

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

  const pitchClasses = [...pressed.keys()].sort((a, b) => a - b);
  const chosen = pitchClasses.map((pc) => pressed.get(pc));
  const allChosen = pitchClasses.length > 0 && chosen.every((n) => n !== undefined);
  const canCheck =
    checked === undefined && (method === "piano" ? allChosen : typed.trim().length > 0);

  function toggleKey(midi: number) {
    if (checked) return;
    const pc = midi % 12;
    const next = new Map(pressed);
    if (next.has(pc)) next.delete(pc);
    else next.set(pc, WHITE_KEYS.has(pc) ? allSpellings(pc)[0] : undefined);
    setPressed(next);
  }

  function spell(pc: number, spelling: Note) {
    if (checked) return;
    setPressed(new Map(pressed).set(pc, spelling));
  }

  function check() {
    if (!question || !canCheck) return;
    const answer =
      method === "piano"
        ? chosen.filter((n): n is Note => n !== undefined)
        : parseSpelledNotes(typed);
    if (!answer) {
      setUnreadable(true);
      return;
    }
    setUnreadable(false);
    const grade = gradeSpelling(question, answer);
    setChecked({ grade });
    setAsked(asked + 1);
    if (grade.right) setRight(right + 1);
  }

  function next() {
    setIndex(index + 1);
    setPressed(new Map());
    setTyped("");
    setUnreadable(false);
    setChecked(undefined);
  }

  // Both octaves of the keyboard show a pressed key, so it does not matter which one was clicked.
  const tones: KeyboardTone[] = pitchClasses.flatMap((pc) =>
    [4, 5].map((octave) => ({
      note: pressed.get(pc) ?? allSpellings(pc)[0] ?? note("C"),
      midi: midiOf(pc, octave),
      isRoot: false,
      role: "pressed",
    })),
  );

  const { required, optional } = expectedNotes(question);
  const outcome = checked?.grade;

  return (
    <>
      <p className="quiz__score" aria-live="polite">
        {asked === 0 ? "Nothing answered yet." : `${right} of ${asked} right.`} Question {index + 1}{" "}
        of {deck.length}.
      </p>

      <p className="quiz__question">Spell {spellingTitle(question)}</p>

      <div className="practice__modes" role="group" aria-label="Answer with">
        {(["piano", "type"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="practice__mode"
            aria-pressed={method === m}
            disabled={checked !== undefined}
            onClick={() => setMethod(m)}
          >
            {m === "piano" ? "Piano" : "Type"}
          </button>
        ))}
      </div>

      {method === "piano" ? (
        <>
          <Piano
            tones={tones}
            name="the keys you pressed"
            legend={{ root: "", tone: "Pressed key" }}
            display="none"
            {...(checked ? {} : { onToggleKey: toggleKey })}
          />
          {pitchClasses.length > 0 && (
            <div className="spelling__choices">
              {pitchClasses.map((pc) => (
                <fieldset key={pc} className="spelling__choice">
                  <legend>Spell the {pitchClassLabel(pc)} key</legend>
                  <div className="spelling__options">
                    {allSpellings(pc).map((spelling) => {
                      const current = pressed.get(pc);
                      return (
                        <button
                          key={formatNote(spelling)}
                          type="button"
                          className="quiz__choice"
                          aria-pressed={current !== undefined && noteEquals(current, spelling)}
                          disabled={checked !== undefined}
                          onClick={() => spell(pc, spelling)}
                        >
                          {formatNote(spelling)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          {pitchClasses.length > 0 && !allChosen && (
            <p className="spelling__hint">
              A key does not say how it is spelled: choose a name for each key you pressed.
            </p>
          )}
        </>
      ) : (
        <label className="spelling__type">
          <span>Notes, for example Eb G Bb</span>
          <input
            type="text"
            className="spelling__input"
            value={typed}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={checked !== undefined}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && check()}
          />
        </label>
      )}
      {unreadable && (
        <p className="spelling__hint" role="alert">
          Write each note as a letter with # or b after it (F#, Bb, Ebb), or with ♯, ♭, 𝄪 or 𝄫.
        </p>
      )}

      {!checked && (
        <button type="button" className="quiz__next" disabled={!canCheck} onClick={check}>
          Check
        </button>
      )}

      {checked && outcome && (
        <div className="quiz__feedback" role="status">
          <p className={`quiz__verdict quiz__verdict--${outcome.right ? "right" : "wrong"}`}>
            {outcome.right ? "Right." : "Not quite."} {spellingTitle(question)} is{" "}
            {spelledList(required)}
            {optional.length > 0 ? ` (the ${spelledList(optional)} may be left out)` : ""}.
          </p>
          {outcome.wrong.map((n) => {
            const should = outcome.missing.find((m) => pitchClass(m) === pitchClass(n));
            return (
              <p key={formatNote(n)} className="spelling__note">
                {should
                  ? `${formatNote(n)} is the right key but is spelled ${formatNote(should)} here.`
                  : `${formatNote(n)} is not in it.`}
              </p>
            );
          })}
          {outcome.missing
            .filter((m) => !outcome.wrong.some((n) => pitchClass(n) === pitchClass(m)))
            .map((n) => (
              <p key={formatNote(n)} className="spelling__note">
                {formatNote(n)} is missing.
              </p>
            ))}
          <button type="button" className="quiz__next" onClick={next}>
            Next question
          </button>
        </div>
      )}
    </>
  );
}

interface SpellingQuizProps {
  route: QuizRoute;
  onChange: (route: QuizRoute, options?: { replace?: boolean }) => void;
}

/**
 * Spelling practice: "Spell E♭m7". Press the keys on the piano and choose how each is spelled,
 * or type the notes. The link carries the seed of the set and the question groups, so the same
 * set can be asked again.
 */
export function SpellingQuiz({ route, onChange }: SpellingQuizProps) {
  const [fallbackSeed] = useState(randomSeed);
  const seed = route.seed ?? fallbackSeed;
  const groups = route.groups ?? ALL_SPELLING_GROUPS;

  // Put the seed in the link, replacing the entry so that Back does not come to a link without one.
  useEffect(() => {
    if (route.seed === undefined) onChange({ ...route, seed: fallbackSeed }, { replace: true });
  }, [route, fallbackSeed, onChange]);

  const newSet = () => onChange({ ...route, mode: "spelling", seed: randomSeed() });

  function toggleGroup(id: SpellingGroupId) {
    const next = groups.includes(id) ? groups.filter((g) => g !== id) : [...groups, id];
    if (next.length === 0) return;
    const ordered = ALL_SPELLING_GROUPS.filter((g) => next.includes(g));
    const all = ordered.length === ALL_SPELLING_GROUPS.length;
    onChange({ page: "quiz", mode: "spelling", seed, ...(all ? {} : { groups: ordered }) });
  }

  return (
    <section className="quiz" aria-labelledby="spelling-heading">
      <h2 id="spelling-heading" className="quiz__heading">
        Spelling
      </h2>

      <fieldset className="spelling__groups">
        <legend>Questions about</legend>
        {SPELLING_GROUPS.map(({ id, name }) => (
          <label key={id} className="spelling__group">
            <input type="checkbox" checked={groups.includes(id)} onChange={() => toggleGroup(id)} />
            {name}
          </label>
        ))}
      </fieldset>
      <p className="spelling__hint">
        Set {seed}. The link asks the same questions in the same order.{" "}
        <button type="button" className="spelling__link" onClick={newSet}>
          New set
        </button>
      </p>

      <Drill key={`${seed}:${groups.join(",")}`} seed={seed} groups={groups} onNewSet={newSet} />
    </section>
  );
}

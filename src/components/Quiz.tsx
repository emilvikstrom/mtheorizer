import { type QuizRoute } from "../route";
import { KeyQuiz } from "./KeyQuiz";
import { SpellingQuiz } from "./SpellingQuiz";

interface QuizProps {
  route: QuizRoute;
  onChange: (route: QuizRoute, options?: { replace?: boolean }) => void;
}

const MODES = [
  { id: "signatures", label: "Key signatures" },
  { id: "spelling", label: "Spelling" },
] as const;

/** Practice: a choice between the key-signature quiz and the spelling drill. */
export function Quiz({ route, onChange }: QuizProps) {
  const mode = route.mode === "spelling" ? "spelling" : "signatures";
  return (
    <div className="practice">
      <div className="practice__modes" role="group" aria-label="Practice">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="practice__mode"
            aria-pressed={mode === id}
            onClick={() =>
              mode !== id &&
              onChange(id === "spelling" ? { page: "quiz", mode: "spelling" } : { page: "quiz" })
            }
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "spelling" ? <SpellingQuiz route={route} onChange={onChange} /> : <KeyQuiz />}
    </div>
  );
}

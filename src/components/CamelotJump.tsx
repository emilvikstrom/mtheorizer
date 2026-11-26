import { useId, useState } from "react";
import { type Key, camelotCode, formatKey, keyForCamelot } from "../theory";

interface CamelotJumpProps {
  /** The selected key; the field shows its code. */
  value: Key;
  onChange: (key: Key) => void;
}

/** What the user typed, and the code of the key that was selected when (or because) they typed it. */
interface Draft {
  readonly text: string;
  readonly code: string;
  readonly error?: boolean;
}

/**
 * Type a Camelot code ("8B", "2a") and the circle jumps to its key, as a DJ would look it up.
 * The key changes as soon as the code is valid; until then the message says what a code is.
 * When the key is picked some other way, the field shows that key's code.
 */
export function CamelotJump({ value, onChange }: CamelotJumpProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [draft, setDraft] = useState<Draft | undefined>(undefined);
  const current = camelotCode(value).label;
  // A draft belongs to one key: once another one is selected, the field follows it.
  const active = draft && draft.code === current ? draft : undefined;

  const read = (text: string) => {
    const found = text.trim() === "" ? undefined : keyForCamelot(text, value);
    if (!found) {
      setDraft({ text, code: current, error: text.trim() !== "" });
      return;
    }
    setDraft({ text, code: camelotCode(found).label });
    onChange(found);
  };

  return (
    <form className="symbol-field camelot-jump" onSubmit={(event) => event.preventDefault()}>
      <label className="picker__legend" htmlFor={`${id}-input`}>
        Go to Camelot code
      </label>
      <input
        id={`${id}-input`}
        className="symbol-field__input"
        type="text"
        value={active ? active.text : current}
        placeholder="8B"
        maxLength={4}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={active?.error === true}
        aria-describedby={messageId}
        onChange={(event) => read(event.target.value)}
      />
      <p
        id={messageId}
        className={`symbol-field__message symbol-field__message--${active?.error ? "error" : "none"}`}
        aria-live="polite"
      >
        {active?.error
          ? "A code is a number 1–12 and A (minor) or B (major), like 8B."
          : `${current} is ${formatKey(value)}.`}
      </p>
    </form>
  );
}

import { useId, useState } from "react";
import {
  type ChordSpec,
  type Note,
  chordFromSpec,
  chordSymbolFor,
  formatNote,
  inversionCount,
  inversionSymbol,
  parseChordSymbol,
} from "../theory";

interface ChordSymbolFieldProps {
  /** The chord that is open now. The field shows its symbol. */
  root: Note;
  spec: ChordSpec;
  inversion: number;
  /** Called with the chord a valid symbol names. Nothing is called while the symbol is not valid. */
  onJump: (root: Note, spec: ChordSpec, inversion: number) => void;
}

/** What the user typed, and the chord that was open when (or because) they typed it. */
interface Draft {
  readonly text: string;
  readonly key: string;
  readonly message?: { readonly kind: "error" | "note"; readonly text: string };
}

/** Identifies a chord with its spelling and inversion, so a change made elsewhere shows. */
const keyOf = (root: Note, spec: ChordSpec, inversion: number) =>
  `${chordSymbolFor(root, spec)}|${inversion}`;

/**
 * A text field above the chord builder: type a chord symbol (`F#m7b5/C`) and the
 * chord opens. The chord only changes once the symbol is valid; until then the
 * message under the field says what is wrong. When the chord is changed some
 * other way (the builder, a link), the field shows that chord's own symbol.
 */
export function ChordSymbolField({ root, spec, inversion, onJump }: ChordSymbolFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [draft, setDraft] = useState<Draft | undefined>(undefined);

  const chord = chordFromSpec(root, spec);
  const currentKey = keyOf(root, spec, inversion);
  // A draft belongs to one chord: once another one is open, the field follows it.
  const active = draft && draft.key === currentKey ? draft : undefined;
  const text = active ? active.text : inversionSymbol(chord, inversion);

  const read = (value: string) => {
    if (value.trim() === "") {
      setDraft({ text: value, key: currentKey });
      return;
    }
    const result = parseChordSymbol(value);
    if (!result.ok) {
      setDraft({ text: value, key: currentKey, message: { kind: "error", text: result.error } });
      return;
    }
    const parsed = result.chord;
    const named = chordFromSpec(parsed.root, parsed.spec);
    const wanted = parsed.inversion ?? 0;
    const next = Math.min(wanted, inversionCount(named));
    const message =
      parsed.bass && parsed.inversion === null
        ? {
            kind: "note" as const,
            text: `${formatNote(parsed.bass)} is not a tone of ${named.symbol}, so it opens in root position.`,
          }
        : undefined;
    setDraft({ text: value, key: keyOf(parsed.root, parsed.spec, next), message });
    onJump(parsed.root, parsed.spec, next);
  };

  return (
    <form className="symbol-field" onSubmit={(event) => event.preventDefault()}>
      <label className="picker__legend" htmlFor={`${id}-input`}>
        Chord symbol
      </label>
      <input
        id={`${id}-input`}
        className="symbol-field__input"
        type="text"
        value={text}
        placeholder="F♯m7♭5/C"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={active?.message?.kind === "error"}
        aria-describedby={messageId}
        onChange={(event) => read(event.target.value)}
      />
      <p
        id={messageId}
        className={`symbol-field__message symbol-field__message--${active?.message?.kind ?? "none"}`}
        aria-live="polite"
      >
        {active?.message?.text ?? ""}
      </p>
    </form>
  );
}

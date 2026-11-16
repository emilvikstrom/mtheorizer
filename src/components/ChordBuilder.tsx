import { useEffect, useRef } from "react";
import {
  CHORD_BASES,
  type ChordBase,
  type ChordModifier,
  type ChordSpec,
  type Note,
  availableQualities,
  chordNameFor,
  chordSymbolFor,
  nearestQuality,
  noteEquals,
  pitchClass,
  preferredRootSpelling,
  withBase,
  withQuality,
  withoutQuality,
} from "../theory";

interface ChordBuilderProps {
  /** The chosen root, so each base chord can show its symbol (C♯m, D♭sus4). */
  root: Note;
  spec: ChordSpec;
  onChange: (spec: ChordSpec) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const GROUPS: readonly { id: string; name: string; modifiers: readonly ChordModifier[] }[] = [
  { id: "seventh", name: "Seventh", modifiers: ["7", "maj7", "dim7"] },
  { id: "sixth", name: "Sixth", modifiers: ["6"] },
  { id: "extensions", name: "Extensions", modifiers: ["9", "11", "13"] },
  { id: "altered", name: "Altered", modifiers: ["flat5", "flat9", "sharp9", "sharp11", "flat13"] },
  { id: "added", name: "Added", modifiers: ["add2", "add4", "add9", "add11"] },
];

/** What each modifier is called on its button, and what it means (shown as a tooltip). */
const LABELS: Record<ChordModifier, { text: string; title: string }> = {
  "7": { text: "7", title: "Minor seventh" },
  maj7: { text: "maj7", title: "Major seventh" },
  dim7: { text: "°7", title: "Diminished seventh" },
  "6": { text: "6", title: "Major sixth" },
  "9": { text: "9", title: "Ninth" },
  "11": { text: "11", title: "Eleventh" },
  "13": { text: "13", title: "Thirteenth" },
  flat5: { text: "♭5", title: "Flat fifth" },
  flat9: { text: "♭9", title: "Flat ninth" },
  sharp9: { text: "♯9", title: "Sharp ninth" },
  sharp11: { text: "♯11", title: "Sharp eleventh" },
  flat13: { text: "♭13", title: "Flat thirteenth" },
  add2: { text: "add2", title: "Added second" },
  add4: { text: "add4", title: "Added fourth" },
  add9: { text: "add9", title: "Added ninth" },
  add11: { text: "add11", title: "Added eleventh" },
};

/**
 * Builds a chord from a base chord and the qualities laid on top of it. Only the
 * qualities that fit the chord as it looks now are offered, and a group with
 * nothing to offer is left out.
 */
export function ChordBuilder({ root, spec, onChange }: ChordBuilderProps) {
  const pc = pitchClass(root);
  // A root the app spelled by itself is spelled per chord (D♭ but C♯m); one the user picked is used as is.
  const automatic = noteEquals(root, preferredRootSpelling(pc, nearestQuality(spec)));
  const available = availableQualities(spec);
  const visible = (modifier: ChordModifier) =>
    spec.qualities.includes(modifier) || available.includes(modifier);

  // When the button you pressed disappears from the page, focus moves to its group instead of being lost.
  const qualities = useRef<HTMLFieldSetElement>(null);
  const pressed = useRef<{ button: HTMLElement; group: string } | undefined>(undefined);
  useEffect(() => {
    const last = pressed.current;
    pressed.current = undefined;
    if (!last || last.button.isConnected) return;
    const target =
      qualities.current?.querySelector<HTMLElement>(`[data-group="${last.group}"]`) ??
      qualities.current;
    target?.focus();
  });

  const bases = CHORD_BASES.map((base) => {
    const bare: ChordSpec = { base, qualities: [] };
    return {
      base,
      name: capitalize(chordNameFor(bare)),
      symbol: chordSymbolFor(automatic ? preferredRootSpelling(pc, base) : root, bare),
    };
  });
  const groups = GROUPS.map((group) => ({
    ...group,
    modifiers: group.modifiers.filter(visible),
  })).filter((group) => group.modifiers.length > 0);

  return (
    <div className="builder">
      <fieldset className="picker">
        <legend className="picker__legend">Base chord</legend>
        <div className="picker__options picker__options--bases">
          {bases.map(({ base, name, symbol }) => (
            <label key={base} className="picker__option" title={name}>
              <input
                type="radio"
                name="base"
                value={base}
                aria-label={name}
                checked={spec.base === base}
                onChange={() => onChange(withBase(spec, base as ChordBase))}
              />
              <span>{symbol}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="picker builder__qualities" ref={qualities} tabIndex={-1}>
        <legend className="picker__legend">Qualities</legend>
        {groups.length === 0 ? (
          <p className="builder__none">A power chord has no qualities to add.</p>
        ) : (
          <div className="quality-groups">
            {groups.map((group) => (
              <div
                key={group.id}
                className="quality-group"
                role="group"
                aria-labelledby={`quality-group-${group.id}`}
                data-group={group.id}
                tabIndex={-1}
              >
                <span id={`quality-group-${group.id}`} className="quality-group__name">
                  {group.name}
                </span>
                <div className="quality-group__options">
                  {group.modifiers.map((modifier) => {
                    const on = spec.qualities.includes(modifier);
                    return (
                      <button
                        key={modifier}
                        type="button"
                        className="quality-toggle"
                        aria-pressed={on}
                        title={LABELS[modifier].title}
                        onClick={(event) => {
                          pressed.current = { button: event.currentTarget, group: group.id };
                          onChange(
                            on ? withoutQuality(spec, modifier) : withQuality(spec, modifier),
                          );
                        }}
                      >
                        {LABELS[modifier].text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}

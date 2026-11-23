import { useState } from "react";
import {
  MAX_STRINGS,
  MIN_STRINGS,
  type OpenString,
  PRESET_GROUPS,
  TUNING_PRESETS,
  commonSpellings,
  describeTuning,
  formatNote,
  noteEquals,
  openStringMidi,
  presetFor,
} from "../theory";
import { type NeckSetup, neckTuning, rememberNeck, setupFor, storedNeck, withHand } from "../neck";
import { OptionPicker } from "./OptionPicker";

const NOTE_NAMES = Array.from({ length: 12 }, (_, pc) => commonSpellings(pc)).flat();
const OCTAVES = [0, 1, 2, 3, 4, 5, 6] as const;
const CUSTOM = "custom";

/** A new string a fourth below the last one, as bass and guitar strings run. */
function addedString(strings: readonly OpenString[]): OpenString {
  const last = strings[strings.length - 1];
  const midi = (last ? openStringMidi(last) : 40) - 5;
  const spelling = commonSpellings(((midi % 12) + 12) % 12)[0];
  if (!spelling) throw new Error("A pitch class always has a spelling");
  // The octave of a pitch class: C4 is MIDI 60, so octave = floor(midi / 12) - 1.
  return { note: spelling, octave: Math.max(0, Math.floor(midi / 12) - 1) };
}

/**
 * The fretted instrument the neck shows: how many strings, how each is tuned, and which hand.
 * Presets fill it in for the usual instruments and tunings. The choice is remembered in the
 * browser and used by every neck in the app.
 */
export function Settings() {
  const [setup, setSetup] = useState<NeckSetup>(storedNeck);
  const tuning = neckTuning(setup);
  const strings = tuning.strings;
  const preset = presetFor(strings);

  const apply = (next: NeckSetup) => {
    setSetup(next);
    rememberNeck(next);
  };
  const retune = (next: readonly OpenString[]) => apply(setupFor(next, setup.left === true));
  const setString = (index: number, change: Partial<OpenString>) =>
    retune(strings.map((s, i) => (i === index ? { ...s, ...change } : s)));

  return (
    <section className="settings" aria-labelledby="settings-neck">
      <h2 id="settings-neck" className="settings__heading">
        Fretted instrument
      </h2>
      <p className="settings__text">
        Chords, scales and “What chord is this?” show a neck set up like this when you choose the
        fretboard instead of the piano. The setting is remembered in this browser.
      </p>

      <label className="settings__field">
        <span className="picker__legend">Preset</span>
        <select
          value={preset?.id ?? CUSTOM}
          onChange={(e) => {
            const chosen = TUNING_PRESETS.find((p) => p.id === e.target.value);
            if (chosen) retune(chosen.strings);
          }}
        >
          {!preset && (
            <option value={CUSTOM} disabled>
              Custom ({describeTuning(strings)})
            </option>
          )}
          {PRESET_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {TUNING_PRESETS.filter((p) => p.group === group).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="settings__count" role="group" aria-label="Number of strings">
        <span className="picker__legend">Strings</span>
        <button
          type="button"
          className="toggle"
          aria-label="Remove a string"
          disabled={strings.length <= MIN_STRINGS}
          onClick={() => retune(strings.slice(0, -1))}
        >
          −
        </button>
        <output className="settings__number" aria-live="polite">
          {strings.length}
        </output>
        <button
          type="button"
          className="toggle"
          aria-label="Add a string"
          disabled={strings.length >= MAX_STRINGS}
          onClick={() => retune([...strings, addedString(strings)])}
        >
          +
        </button>
      </div>

      <fieldset className="picker">
        <legend className="picker__legend">Tuning, string 1 first</legend>
        <ol className="settings__strings">
          {strings.map((open, index) => {
            const number = index + 1;
            return (
              // Strings are told apart by position: two strings can be tuned alike.
              <li key={number} className="settings__string">
                <span className="settings__string-name">String {number}</span>
                <select
                  aria-label={`String ${number} note`}
                  value={formatNote(open.note)}
                  onChange={(e) => {
                    const chosen = NOTE_NAMES.find((n) => formatNote(n) === e.target.value);
                    if (chosen && !noteEquals(chosen, open.note))
                      setString(index, { note: chosen });
                  }}
                >
                  {NOTE_NAMES.map((n) => (
                    <option key={formatNote(n)} value={formatNote(n)}>
                      {formatNote(n)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`String ${number} octave`}
                  value={open.octave}
                  onChange={(e) => setString(index, { octave: Number(e.target.value) })}
                >
                  {OCTAVES.map((octave) => (
                    <option key={octave} value={octave}>
                      {octave}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ol>
        <p className="settings__text">Low to high: {describeTuning(strings)}</p>
      </fieldset>

      <OptionPicker
        legend="Hand"
        name="hand"
        options={[
          { value: "right", label: "Right-handed" },
          { value: "left", label: "Left-handed" },
        ]}
        value={setup.left ? "left" : "right"}
        onChange={(hand) => apply(withHand(setup, hand === "left"))}
      />
    </section>
  );
}

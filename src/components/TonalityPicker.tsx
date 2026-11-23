import {
  type Note,
  type Tonality,
  type TonalityId,
  formatNote,
  noteEquals,
  pitchClass,
  tonalityLabel,
  tonalityOnPitchClass,
  tonalitySpellings,
} from "../theory";
import { OptionPicker } from "./OptionPicker";
import { RootPicker } from "./RootPicker";

/** The tonalities as the picker groups them. */
export const TONALITY_GROUPS: readonly { name: string; ids: readonly TonalityId[] }[] = [
  { name: "Major & minor", ids: ["major", "naturalMinor", "harmonicMinor", "melodicMinor"] },
  { name: "Modes", ids: ["dorian", "phrygian", "lydian", "mixolydian", "locrian"] },
  { name: "More colours", ids: ["phrygianDominant", "lydianDominant", "mixolydianFlat6"] },
];

interface TonalityPickerProps {
  /** Radio group name, unique on the page. */
  name: string;
  legend?: string;
  value: TonalityId | undefined;
  onChange: (id: TonalityId | undefined) => void;
  /** Offer "Any" (value undefined) first, for a filter. */
  anyLabel?: string;
}

/** Major, minor and the modes, grouped like the scale picker. */
export function TonalityPicker({
  name,
  legend = "Tonality",
  value,
  onChange,
  anyLabel,
}: TonalityPickerProps) {
  const option = (id: TonalityId | undefined, label: string) => (
    <label key={id ?? "any"} className="picker__option">
      <input
        type="radio"
        name={name}
        value={id ?? "any"}
        checked={value === id}
        onChange={() => onChange(id)}
      />
      <span>{label}</span>
    </label>
  );
  return (
    <fieldset className="picker">
      <legend className="picker__legend">{legend}</legend>
      <div className="quality-groups">
        {anyLabel !== undefined && (
          <div className="quality-group" role="group" aria-label="All tonalities">
            <span className="quality-group__name">All</span>
            <div className="quality-group__options">{option(undefined, anyLabel)}</div>
          </div>
        )}
        {TONALITY_GROUPS.map((group) => (
          <div key={group.name} className="quality-group" role="group" aria-label={group.name}>
            <span className="quality-group__name" aria-hidden="true">
              {group.name}
            </span>
            <div className="quality-group__options">
              {group.ids.map((id) => option(id, tonalityLabel(id)))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface TonicPickerProps {
  /** Radio group name for the spelling choice, unique on the page. */
  name: string;
  value: Tonality;
  onChange: (tonic: Note) => void;
}

/** The tonic's pitch class, and a choice of spelling (C♯ or D♭) when both read well. */
export function TonicPicker({ name, value, onChange }: TonicPickerProps) {
  const pc = pitchClass(value.tonic);
  const spellings = tonalitySpellings(pc, value.scale);
  return (
    <>
      <RootPicker
        legend="Tonic"
        value={pc}
        onChange={(next) => onChange(tonalityOnPitchClass(next, value.scale).tonic)}
      />
      {spellings.length > 1 && (
        <OptionPicker
          legend="Spelling"
          name={name}
          options={spellings.map((n) => ({ value: formatNote(n), label: formatNote(n) }))}
          value={formatNote(value.tonic)}
          onChange={(label) => {
            const chosen = spellings.find((n) => formatNote(n) === label);
            if (chosen && !noteEquals(chosen, value.tonic)) onChange(chosen);
          }}
        />
      )}
    </>
  );
}

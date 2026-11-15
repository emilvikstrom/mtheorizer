import {
  CHORD_GROUPS,
  type ChordQualityId,
  type Note,
  chordSymbol,
  noteEquals,
  pitchClass,
  preferredRootSpelling,
  qualitiesInGroup,
} from "../theory";

interface ChordQualityPickerProps {
  /** The chosen root, so each choice can show its chord symbol (C♯m, D♭maj7). */
  root: Note;
  value: ChordQualityId;
  onChange: (quality: ChordQualityId) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Every chord quality, grouped by family. Each choice shows the chord symbol on the chosen root. */
export function ChordQualityPicker({ root, value, onChange }: ChordQualityPickerProps) {
  const pc = pitchClass(root);
  // A root the app spelled by itself is spelled per chord (D♭ but C♯m); one the user picked is used as is.
  const automatic = noteEquals(root, preferredRootSpelling(pc, value));
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Quality</legend>
      <div className="quality-groups">
        {CHORD_GROUPS.map((group) => (
          <div
            key={group.id}
            className="quality-group"
            role="group"
            aria-labelledby={`quality-group-${group.id}`}
          >
            <span id={`quality-group-${group.id}`} className="quality-group__name">
              {group.name}
            </span>
            <div className="quality-group__options">
              {qualitiesInGroup(group.id).map((quality) => (
                <label key={quality.id} className="picker__option" title={capitalize(quality.name)}>
                  <input
                    type="radio"
                    name="quality"
                    value={quality.id}
                    aria-label={capitalize(quality.name)}
                    checked={value === quality.id}
                    onChange={() => onChange(quality.id)}
                  />
                  <span>
                    {chordSymbol(
                      automatic ? preferredRootSpelling(pc, quality.id) : root,
                      quality.id,
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

import { CHORD_GROUPS, type ChordQualityId, chordSymbol, preferredRootSpelling, qualitiesInGroup } from '../theory';

interface ChordQualityPickerProps {
  /** Pitch class of the chosen root, so each choice can show its chord symbol (C♯m, D♭maj7). */
  rootPitchClass: number;
  value: ChordQualityId;
  onChange: (quality: ChordQualityId) => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Every chord quality, grouped by family. Each choice shows the chord symbol on the chosen root. */
export function ChordQualityPicker({ rootPitchClass, value, onChange }: ChordQualityPickerProps) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Quality</legend>
      <div className="quality-groups">
        {CHORD_GROUPS.map((group) => (
          <div key={group.id} className="quality-group" role="group" aria-labelledby={`quality-group-${group.id}`}>
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
                  <span>{chordSymbol(preferredRootSpelling(rootPitchClass, quality.id), quality.id)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

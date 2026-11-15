import { CHORD_QUALITIES, type ChordQualityId } from '../theory';

const QUALITY_LABELS: Record<ChordQualityId, string> = {
  major: 'Major',
  minor: 'Minor',
};

const QUALITY_IDS = Object.keys(CHORD_QUALITIES) as ChordQualityId[];

interface QualityPickerProps {
  value: ChordQualityId;
  onChange: (quality: ChordQualityId) => void;
}

export function QualityPicker({ value, onChange }: QualityPickerProps) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Quality</legend>
      <div className="picker__options picker__options--pair">
        {QUALITY_IDS.map((id) => (
          <label key={id} className="picker__option">
            <input
              type="radio"
              name="quality"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span>{QUALITY_LABELS[id]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

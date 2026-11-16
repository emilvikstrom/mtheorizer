import { SCALES, SCALE_GROUPS, type ScaleId, scaleLabel } from "../theory";

interface ScalePickerProps {
  value: ScaleId;
  onChange: (scale: ScaleId) => void;
}

/** Every scale, grouped by family. */
export function ScalePicker({ value, onChange }: ScalePickerProps) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Scale</legend>
      <div className="quality-groups">
        {SCALE_GROUPS.map((group) => (
          <div
            key={group.id}
            className="quality-group"
            role="group"
            aria-labelledby={`scale-group-${group.id}`}
          >
            <span id={`scale-group-${group.id}`} className="quality-group__name">
              {group.name}
            </span>
            <div className="quality-group__options">
              {group.scales.map((id) => (
                <label key={id} className="picker__option">
                  <input
                    type="radio"
                    name="scale"
                    value={id}
                    checked={value === id}
                    onChange={() => onChange(id)}
                  />
                  <span>{scaleLabel(SCALES[id])}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

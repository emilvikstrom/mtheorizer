export interface PickerOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface OptionPickerProps<T extends string> {
  /** Visible group label, also the accessible name of the group. */
  legend: string;
  /** Name of the radio group. */
  name: string;
  options: readonly PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A small set of mutually exclusive choices, shown as a segmented control. */
export function OptionPicker<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: OptionPickerProps<T>) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">{legend}</legend>
      <div className="picker__options picker__options--segmented">
        {options.map((option) => (
          <label key={option.value} className="picker__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

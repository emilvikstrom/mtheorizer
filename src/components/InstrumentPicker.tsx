export type Instrument = 'piano' | 'guitar';

const INSTRUMENTS: readonly { id: Instrument; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'guitar', label: 'Guitar' },
];

interface InstrumentPickerProps {
  value: Instrument;
  onChange: (instrument: Instrument) => void;
}

export function InstrumentPicker({ value, onChange }: InstrumentPickerProps) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Show on</legend>
      <div className="picker__options picker__options--pair">
        {INSTRUMENTS.map(({ id, label }) => (
          <label key={id} className="picker__option">
            <input
              type="radio"
              name="instrument"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

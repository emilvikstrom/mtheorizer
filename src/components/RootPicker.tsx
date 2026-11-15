import { isNatural, pitchClassLabel, spellingsOf } from '../theory';

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

const isBlackKey = (pc: number) => !spellingsOf(pc).some(isNatural);

interface RootPickerProps {
  /** Selected pitch class, 0 = C … 11 = B. */
  value: number;
  onChange: (pitchClass: number) => void;
}

export function RootPicker({ value, onChange }: RootPickerProps) {
  return (
    <fieldset className="picker">
      <legend className="picker__legend">Root</legend>
      <div className="picker__options picker__options--roots">
        {PITCH_CLASSES.map((pc) => (
          <label key={pc} className={`picker__option${isBlackKey(pc) ? ' picker__option--black' : ''}`}>
            <input
              type="radio"
              name="root"
              value={pc}
              checked={value === pc}
              onChange={() => onChange(pc)}
            />
            <span>{pitchClassLabel(pc)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

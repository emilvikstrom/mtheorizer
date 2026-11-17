import { TONE_DISPLAYS, TONE_DISPLAY_LABELS, type ToneDisplay } from "../toneLabels";
import { OptionPicker } from "./OptionPicker";

const OPTIONS = TONE_DISPLAYS.map((value) => ({ value, label: TONE_DISPLAY_LABELS[value] }));

interface ToneDisplayPickerProps {
  /** What the keys and frets say. */
  value: ToneDisplay;
  onChange: (value: ToneDisplay) => void;
  /** In practice mode (`none`): whether the answer is shown. */
  revealed: boolean;
  onToggleReveal: () => void;
}

/**
 * Chooses what is written on the keys and frets: note names, intervals (R 3 5 ♭7),
 * step numbers, or nothing. With nothing written the tones can be checked on request.
 */
export function ToneDisplayPicker({
  value,
  onChange,
  revealed,
  onToggleReveal,
}: ToneDisplayPickerProps) {
  return (
    <div className="tone-display">
      <OptionPicker
        legend="Labels"
        name="tone-display"
        options={OPTIONS}
        value={value}
        onChange={onChange}
      />
      {value === "none" && (
        <button
          type="button"
          className="play__button tone-display__reveal"
          aria-pressed={revealed}
          onClick={onToggleReveal}
        >
          {revealed ? "Hide the notes" : "Show the notes"}
        </button>
      )}
    </div>
  );
}

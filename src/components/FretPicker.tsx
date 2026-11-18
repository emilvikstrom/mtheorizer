import { type FretPick, type Tuning, commonSpellings, formatNote, openStringMidi } from "../theory";

/** Open string and frets 1–12: an octave of the neck. */
const FRETS = Array.from({ length: 13 }, (_, fret) => fret);

interface FretPickerProps {
  tuning: Tuning;
  picks: readonly FretPick[];
  /** Press the place, or let go of it when it is already pressed. */
  onToggle: (pick: FretPick) => void;
  /** What the neck is, for its accessible name: "guitar". */
  name: string;
}

/** The note a place sounds, spelled the more common way (a place can't say C♯ from D♭). */
function soundingName(tuning: Tuning, string: number, fret: number): string {
  const open = tuning.strings[string - 1];
  if (!open) return "";
  const [spelling] = commonSpellings((openStringMidi(open) + fret) % 12);
  return spelling ? formatNote(spelling) : "";
}

/**
 * A neck to press on: one button for every string and fret from the open string to
 * the twelfth fret. String 1 is on top, as in tablature. Each string takes one
 * pressed place, and pressing it again lets go.
 */
export function FretPicker({ tuning, picks, onToggle, name }: FretPickerProps) {
  const fretOn = new Map(picks.map((p) => [p.string, p.fret]));
  return (
    <div className="fret-picker" role="group" aria-label={`Frets of the ${name}`}>
      <div className="fret-picker__grid">
        <span className="fret-picker__corner" aria-hidden="true" />
        {FRETS.map((fret) => (
          <span key={fret} className="fret-picker__fret-number" aria-hidden="true">
            {fret === 0 ? "Open" : fret}
          </span>
        ))}
        {tuning.strings.map((open, index) => {
          const string = index + 1;
          return [
            <span key={`name-${string}`} className="fret-picker__string-name" aria-hidden="true">
              {formatNote(open.note)}
            </span>,
            ...FRETS.map((fret) => {
              const pressed = fretOn.get(string) === fret;
              const note = soundingName(tuning, string, fret);
              return (
                <button
                  key={`${string}-${fret}`}
                  type="button"
                  className="fret-picker__cell"
                  aria-pressed={pressed}
                  aria-label={`String ${string}, ${fret === 0 ? "open" : `fret ${fret}`}, ${note}`}
                  data-string={string}
                  data-fret={fret}
                  onClick={() => onToggle({ string, fret })}
                >
                  {pressed && <span className="fret-picker__dot">{note}</span>}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

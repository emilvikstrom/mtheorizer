import {
  type ChordMatch,
  type KeyboardTone,
  commonSpellings,
  formatNote,
  identifyChords,
} from "../theory";
import { MidiInput } from "./MidiInput";
import { Piano } from "./Piano";

/** Show the best matches only; a cluster of notes can fit dozens of odd chords. */
const MAX_SUGGESTIONS = 12;

interface ChordFinderProps {
  /** MIDI numbers of the pressed keys. */
  selected: readonly number[];
  onChange: (selected: readonly number[]) => void;
  /** Open `match` in the chord tab. */
  onOpen: (match: ChordMatch) => void;
}

/** The notes of a chord as the lookup spells them, "C–E♭–G". */
const spelled = (match: ChordMatch) => match.chord.tones.map((t) => formatNote(t.note)).join("–");

const omittedText = (match: ChordMatch) =>
  match.omitted.length === 0
    ? undefined
    : `Without ${match.omitted.map((t) => `${t.role} (${formatNote(t.note)})`).join(", ")}`;

/**
 * "What chord is this?": press keys on the piano and see which chords the notes
 * form. The lowest key is the bass, so C, E, G and A with C lowest gives Am7/C.
 */
export function ChordFinder({ selected, onChange, onOpen }: ChordFinderProps) {
  const sorted = [...selected].sort((a, b) => a - b);
  const bass = sorted[0];
  const matches = identifyChords(
    sorted.map((midi) => midi % 12),
    bass === undefined ? {} : { bass: bass % 12 },
  );

  // A key can't say whether it is C♯ or D♭, so it shows the more common spelling.
  const tones: KeyboardTone[] = sorted.flatMap((midi) => {
    const [spelling] = commonSpellings(midi % 12);
    return spelling
      ? [{ note: spelling, midi, isRoot: false, isBass: midi === bass, role: "pressed" }]
      : [];
  });

  const toggle = (midi: number) =>
    onChange(selected.includes(midi) ? selected.filter((m) => m !== midi) : [...selected, midi]);

  const pitchClasses = new Set(sorted.map((midi) => midi % 12));
  const count = pitchClasses.size;
  const first = tones[0] ? formatNote(tones[0].note) : undefined;

  return (
    <section className="finder" aria-labelledby="finder-heading">
      <h2 id="finder-heading" className="finder__heading">
        What chord is this?
      </h2>
      <p className="finder__hint">
        Press the keys of the notes you hear or play. The lowest key is taken as the bass.
      </p>

      <MidiInput onUse={onChange} />

      <Piano
        tones={tones}
        name={sorted.length === 0 ? "no keys pressed" : "the pressed keys"}
        legend={{ root: "", tone: "Pressed key" }}
        onToggleKey={toggle}
      />

      <div className="finder__actions">
        <button
          type="button"
          className="finder__clear"
          onClick={() => onChange([])}
          disabled={selected.length === 0}
        >
          Clear keys
        </button>
      </div>

      <div className="finder__results" aria-live="polite">
        {count === 0 ? (
          <p className="finder__empty">Press at least two different notes to find a chord.</p>
        ) : count === 1 ? (
          <p className="finder__empty">
            One note is not a chord yet. Press at least one more key (you pressed {first}).
          </p>
        ) : matches.length === 0 ? (
          <p className="finder__empty">
            No chord in the list has exactly these notes:{" "}
            {tones.map((t) => formatNote(t.note)).join(", ")}. Try removing one.
          </p>
        ) : (
          <>
            <h3 className="finder__count">
              {matches.length === 1 ? "1 chord fits" : `${matches.length} chords fit`}
            </h3>
            <ul className="finder__list">
              {matches.slice(0, MAX_SUGGESTIONS).map((match) => (
                <li key={`${match.symbol}-${match.chord.quality.id}`}>
                  <button type="button" className="suggestion" onClick={() => onOpen(match)}>
                    <span className="suggestion__symbol">{match.symbol}</span>
                    <span className="suggestion__name">{match.chord.name}</span>
                    <span className="suggestion__notes">
                      {spelled(match)}
                      {omittedText(match) ? ` · ${omittedText(match)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > MAX_SUGGESTIONS && (
              <p className="finder__more">
                Showing the {MAX_SUGGESTIONS} simplest of {matches.length}.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

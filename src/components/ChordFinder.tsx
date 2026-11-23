import {
  type ChordMatch,
  FRET_WINDOW,
  FRET_WINDOW_STARTS,
  type FretPick,
  type KeyboardTone,
  STRING_INSTRUMENTS,
  type StringInstrumentId,
  commonSpellings,
  describeTuning,
  presetFor,
  formatNote,
  identifyChords,
  pickedMidi,
  togglePick,
  tuningFor,
} from "../theory";
import type { IdentifyRoute } from "../route";
import { storedNeck } from "../neck";
import { FretPicker } from "./FretPicker";
import { MidiInput } from "./MidiInput";
import { OptionPicker, type PickerOption } from "./OptionPicker";
import { Piano } from "./Piano";

type Source = "piano" | StringInstrumentId;

const WINDOW_OPTIONS: readonly PickerOption<string>[] = FRET_WINDOW_STARTS.map((start) => ({
  value: String(start),
  label: `${start}–${start + FRET_WINDOW - 1}`,
}));

/** The piano, or the fretted instrument set up on the settings page. */
const SOURCE_OPTIONS: readonly PickerOption<"piano" | "neck">[] = [
  { value: "piano", label: "Piano" },
  { value: "neck", label: "Fretboard" },
];

/** Show the best matches only; a cluster of notes can fit dozens of odd chords. */
const MAX_SUGGESTIONS = 12;

interface ChordFinderProps {
  /** The instrument, pressed frets and fret window, which live in the link. */
  route: IdentifyRoute;
  onRoute: (route: IdentifyRoute) => void;
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
 * "What chord is this?": press keys on the piano, or frets on a string instrument,
 * and see which chords the notes form. The lowest note is the bass, so C, E, G and
 * A with C lowest gives Am7/C.
 */
export function ChordFinder({ route, onRoute, selected, onChange, onOpen }: ChordFinderProps) {
  const source: Source = route.instrument ?? "piano";
  const picks: readonly FretPick[] = route.frets ?? [];
  const from = route.from ?? 1;
  const setPicks = (frets: readonly FretPick[]) =>
    onRoute({ ...route, frets: frets.length > 0 ? frets : undefined });
  const strings = source === "piano" ? undefined : tuningFor(source, route.tuning, route.strings);
  const noun = strings ? "frets" : "keys";

  // The pressed keys, or the notes the pressed frets sound in the instrument's tuning.
  const sorted = strings ? pickedMidi(picks, strings.strings) : [...selected].sort((a, b) => a - b);
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
  // Two strings can sound the same note, so list each note once.
  const noteNames = [...new Set(tones.map((t) => formatNote(t.note)))];

  return (
    <section className="finder" aria-labelledby="finder-heading">
      <h2 id="finder-heading" className="finder__heading">
        What chord is this?
      </h2>
      <OptionPicker
        legend="Play it on"
        name="finder-instrument"
        options={SOURCE_OPTIONS}
        value={source === "piano" ? "piano" : "neck"}
        onChange={(value) => {
          // Another instrument has other strings, so the pressed frets don't carry over.
          const { instrument, tuning, strings: open } = storedNeck();
          onRoute(
            value === "piano"
              ? { page: "identify" }
              : {
                  page: "identify",
                  instrument,
                  ...(tuning ? { tuning } : {}),
                  ...(open ? { strings: open } : {}),
                },
          );
        }}
      />
      {strings && (
        <p className="controls__note">
          {presetFor(strings.strings)?.label ?? `${strings.strings.length} strings`}:{" "}
          {describeTuning(strings.strings)}.{" "}
          <a href="#/settings">Change the strings or tuning in Settings</a>
        </p>
      )}
      <p className="finder__hint">
        {strings
          ? "Press the frets of the notes you play, one per string. Press again to let go. The lowest string you press is taken as the bass."
          : "Press the keys of the notes you hear or play. The lowest key is taken as the bass."}
      </p>

      {strings ? (
        <>
          <OptionPicker
            legend="Frets shown"
            name="finder-frets"
            options={WINDOW_OPTIONS}
            value={String(from)}
            onChange={(start) =>
              onRoute({ ...route, from: Number(start) === 1 ? undefined : Number(start) })
            }
          />
          <FretPicker
            tuning={strings}
            picks={picks}
            from={from}
            onToggle={(pick) => setPicks(togglePick(picks, pick))}
            name={STRING_INSTRUMENTS[strings.instrument].label.toLowerCase()}
          />
          <p className="finder__notes" aria-live="polite">
            {noteNames.length === 0 ? "No frets pressed" : `Notes: ${noteNames.join("–")}`}
          </p>
        </>
      ) : (
        <>
          <MidiInput onUse={onChange} />
          <Piano
            tones={tones}
            name={sorted.length === 0 ? "no keys pressed" : "the pressed keys"}
            legend={{ root: "", tone: "Pressed key" }}
            onToggleKey={toggle}
          />
        </>
      )}

      <div className="finder__actions">
        <button
          type="button"
          className="finder__clear"
          onClick={() => (strings ? setPicks([]) : onChange([]))}
          disabled={(strings ? picks.length : selected.length) === 0}
        >
          Clear {noun}
        </button>
      </div>

      <div className="finder__results" aria-live="polite">
        {count === 0 ? (
          <p className="finder__empty">Press at least two different notes to find a chord.</p>
        ) : count === 1 ? (
          <p className="finder__empty">
            One note is not a chord yet. Press at least one more {strings ? "fret" : "key"} (you
            pressed {first}).
          </p>
        ) : matches.length === 0 ? (
          <p className="finder__empty">
            No chord in the list has exactly these notes: {noteNames.join(", ")}. Try removing one.
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

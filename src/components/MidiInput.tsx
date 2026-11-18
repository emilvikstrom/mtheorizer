import { useEffect, useReducer, useRef, useState } from "react";
import { type KeyboardTone, commonSpellings, formatNote, identifyChords } from "../theory";
import { type MidiConnection, type MidiNavigator, connectMidi, midiSupported } from "../midiAccess";
import { NO_HELD_NOTES, applyNote, parseMidiMessage } from "../midi";
import { Piano } from "./Piano";

const MAX_SUGGESTIONS = 3;

type Status = "idle" | "connecting" | "connected" | "denied" | "failed";

interface MidiInputProps {
  /** Copy the notes on show into the keys of "What chord is this?". */
  onUse: (midis: readonly number[]) => void;
  /** For tests; the browser's own `navigator` by default. */
  nav?: MidiNavigator;
}

/**
 * Play on a connected MIDI keyboard and see the notes on a keyboard and the chords
 * they form. Nothing is changed in the finder until "Use these keys" is pressed.
 */
export function MidiInput({ onUse, nav }: MidiInputProps) {
  const [held, dispatch] = useReducer(applyNote, NO_HELD_NOTES);
  const [status, setStatus] = useState<Status>("idle");
  const [inputs, setInputs] = useState<readonly string[]>([]);
  const connection = useRef<MidiConnection | undefined>(undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      connection.current?.close();
    };
  }, []);

  const environment: MidiNavigator =
    nav ?? (typeof navigator === "undefined" ? {} : (navigator as unknown as MidiNavigator));
  if (!midiSupported(environment)) return null;

  const connect = async () => {
    setStatus("connecting");
    try {
      const next = await connectMidi(
        (data) => {
          const message = parseMidiMessage(data);
          if (message) dispatch(message);
        },
        (names) => {
          if (mounted.current) setInputs(names);
        },
        environment,
      );
      if (!mounted.current) {
        next.close();
        return;
      }
      connection.current = next;
      setStatus("connected");
    } catch (reason) {
      if (mounted.current) setStatus(reason === "denied" ? "denied" : "failed");
    }
  };

  const disconnect = () => {
    connection.current?.close();
    connection.current = undefined;
    setInputs([]);
    setStatus("idle");
  };

  if (status !== "connected") {
    return (
      <div className="midi">
        <button
          type="button"
          className="midi__button"
          onClick={connect}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? "Connecting…" : "Connect a MIDI keyboard"}
        </button>
        <p className="midi__note" role="status">
          {status === "denied"
            ? "The browser did not allow MIDI access. You can still press the keys below."
            : status === "failed"
              ? "MIDI is not available right now. You can still press the keys below."
              : "Your browser will ask for permission first."}
        </p>
      </div>
    );
  }

  const shown = held.shown;
  const bass = shown[0];
  const matches = identifyChords(
    shown.map((midi) => midi % 12),
    bass === undefined ? {} : { bass: bass % 12 },
  );
  const tones: KeyboardTone[] = shown.flatMap((midi) => {
    const [spelling] = commonSpellings(midi % 12);
    return spelling
      ? [{ note: spelling, midi, isRoot: false, isBass: midi === bass, role: "played" }]
      : [];
  });
  const distinct = new Set(shown.map((m) => m % 12)).size;

  return (
    <div className="midi">
      <div className="midi__bar">
        <p className="midi__note" role="status">
          {inputs.length === 0
            ? "No MIDI keyboard is connected. Plug one in and it appears here."
            : `Connected: ${inputs.join(", ")}`}
        </p>
        <button type="button" className="midi__button" onClick={disconnect}>
          Disconnect
        </button>
      </div>

      <Piano
        tones={tones}
        name={shown.length === 0 ? "no notes played" : "the notes played on the MIDI keyboard"}
        legend={{ root: "", tone: "Played note" }}
      />

      <div aria-live="polite" className="midi__result">
        {shown.length === 0 ? (
          <p className="midi__note">Play some notes on your keyboard.</p>
        ) : distinct < 2 ? (
          <p className="midi__note">One note is not a chord yet.</p>
        ) : matches.length === 0 ? (
          <p className="midi__note">
            No chord in the list has exactly these notes:{" "}
            {tones.map((t) => formatNote(t.note)).join(", ")}.
          </p>
        ) : (
          <p className="midi__chords">
            Sounds like{" "}
            {matches.slice(0, MAX_SUGGESTIONS).map((match, i) => (
              <span key={`${match.symbol}-${match.chord.quality.id}`}>
                {i > 0 && ", "}
                <strong>{match.symbol}</strong>
              </span>
            ))}
          </p>
        )}
        <button
          type="button"
          className="midi__button"
          onClick={() => onUse(shown)}
          disabled={shown.length === 0}
        >
          Use these keys
        </button>
      </div>
    </div>
  );
}

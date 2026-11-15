import { audioSupported, planPlayback, playNotes } from "../audio/playback";

interface PlayButtonsProps {
  /** MIDI numbers of the tones to play. */
  midis: readonly number[];
  kind: "chord" | "scale";
  /** What is played, for the accessible names, e.g. "C major". */
  name: string;
}

/** Buttons that play the chord (together or broken) or the scale through Web Audio. */
export function PlayButtons({ midis, kind, name }: PlayButtonsProps) {
  if (!audioSupported()) return null;
  return (
    <div className="play" role="group" aria-label="Listen">
      {kind === "chord" ? (
        <>
          <button
            type="button"
            className="play__button"
            aria-label={`Play ${name} together`}
            onClick={() => playNotes(planPlayback(midis, "together"))}
          >
            ▶ Play chord
          </button>
          <button
            type="button"
            className="play__button"
            aria-label={`Play ${name} broken`}
            onClick={() => playNotes(planPlayback(midis, "broken"))}
          >
            ▶ Play broken
          </button>
        </>
      ) : (
        <button
          type="button"
          className="play__button"
          aria-label={`Play ${name}`}
          onClick={() => playNotes(planPlayback(midis, "broken", "scale"))}
        >
          ▶ Play scale
        </button>
      )}
    </div>
  );
}

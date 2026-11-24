import { type VoicedProgression, describeVoiceLeading } from "../theory";
import { VoiceLeadingPiano } from "./VoiceLeadingPiano";

interface SmoothVoicingProps {
  /** The chord symbols, in order. */
  names: readonly string[];
  smooth: boolean;
  onToggle: () => void;
  /** The voicing of the chords when `smooth` is on. */
  voiced: VoicedProgression | undefined;
}

/**
 * "Smooth voicing": a toggle, and with it on, how each chord moves to the next (in words and on
 * two pianos). Used by the ready-made progressions and by the progression builder.
 */
export function SmoothVoicing({ names, smooth, onToggle, voiced }: SmoothVoicingProps) {
  return (
    <>
      <div className="voicing-toggle">
        <button type="button" className="play__button" aria-pressed={smooth} onClick={onToggle}>
          Smooth voicing
        </button>
        <span className="voicing-toggle__hint">
          {smooth
            ? "Each chord takes the inversion that moves the least from the one before."
            : "Chords are played in root position."}
        </span>
      </div>

      {voiced && voiced.transitions.length > 0 && (
        <ol className="voice-leading" aria-label="Voice leading between the chords">
          {voiced.transitions.map((transition, i) => (
            <li key={i} className="voice-leading__step">
              <span className="voice-leading__chords">
                {names[i]} → {names[i + 1]}
              </span>
              <span className="voice-leading__text">{describeVoiceLeading(transition)}</span>
              <details className="voice-leading__piano">
                <summary>
                  Show on the piano: {names[i]} → {names[i + 1]}
                </summary>
                <VoiceLeadingPiano
                  leading={transition}
                  names={[names[i] ?? "", names[i + 1] ?? ""]}
                />
              </details>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

import { useEffect } from "react";
import { FIFTH_CIRCLE_VOICES, beatRate, planFifthCircle } from "../audio/fifthCircle";
import { audioSupported, midiToFrequency, playNotes, stopPlayback } from "../audio/playback";
import {
  EQUAL_FIFTH_CENTS,
  PURE_FIFTH_CENTS,
  PYTHAGOREAN_COMMA_CENTS,
  type Temperament,
  fifthChain,
} from "../theory";

const STEPS = fifthChain();
const MIDDLE_C = 60;

/** Cents with two decimals and a decimal point: "701.96". */
const fixed = (cents: number) => cents.toFixed(2);

const PLAYS: readonly { temperament: Temperament; label: string; name: string }[] = [
  { temperament: "pure", label: "▶ Play 12 pure fifths", name: "Play twelve pure fifths" },
  {
    temperament: "equal",
    label: "▶ Play 12 equal fifths",
    name: "Play twelve equal-tempered fifths",
  },
];

/**
 * Why the circle of fifths does not close: twelve pure fifths are a little more than seven
 * octaves. Plays the climb in pure and in equal tuning, ending on the start and the note
 * reached together, so the gap is heard as a beat.
 */
export function FifthCircleComma() {
  // The sound stops when the view is left.
  useEffect(() => stopPlayback, []);
  const beats = beatRate(midiToFrequency(MIDDLE_C), PYTHAGOREAN_COMMA_CENTS);

  return (
    <details
      className="comma"
      onToggle={(e) => {
        if (!e.currentTarget.open) stopPlayback();
      }}
    >
      <summary className="comma__summary">The circle that doesn't close</summary>
      <div className="comma__body">
        <p>
          Going up twelve fifths should bring you back to where you started, since the circle of
          fifths has twelve steps. It does not, because a pure fifth (the ratio 3:2,{" "}
          {fixed(PURE_FIFTH_CENTS)} cents) is a little wider than the equal-tempered fifth of a
          piano ({EQUAL_FIFTH_CENTS} cents). Twelve pure fifths overshoot seven octaves by{" "}
          {fixed(PYTHAGOREAN_COMMA_CENTS)} cents, the Pythagorean comma, so B♯ ends up sharp of C.
        </p>
        <p>
          Instruments are tempered to hide this: every fifth is made about 1.96 cents too narrow,
          and twelve of them make exactly seven octaves. Then B♯ is C again, and you can play in
          every key.
        </p>
        {audioSupported() && (
          <div className="play comma__play" role="group" aria-label="Listen to the circle">
            {PLAYS.map(({ temperament, label, name }) => (
              <button
                key={temperament}
                type="button"
                className="play__button"
                aria-label={name}
                onClick={() => {
                  stopPlayback();
                  playNotes(planFifthCircle(temperament, MIDDLE_C), undefined, FIFTH_CIRCLE_VOICES);
                }}
              >
                {label}
              </button>
            ))}
            <button type="button" className="play__button" onClick={stopPlayback}>
              ■ Stop
            </button>
          </div>
        )}
        <p className="comma__note">
          Each one climbs through the twelve fifths, folded into one octave, and ends with the start
          and the note you reached sounding together. With pure fifths they are{" "}
          {fixed(PYTHAGOREAN_COMMA_CENTS)} cents apart and beat about {beats.toFixed(1)} times a
          second. With equal fifths they are the same note.
        </p>
        <div
          className="comma__scroll"
          role="region"
          aria-label="Twelve fifths from C, in cents"
          // The table scrolls sideways on a narrow screen, so it must be reachable by keyboard.
          tabIndex={0}
        >
          <table className="comma__table">
            <caption className="comma__caption">
              Cents above C after each fifth, folded into one octave. The last row is B♯: 0 in equal
              temperament, {fixed(PYTHAGOREAN_COMMA_CENTS)} in pure tuning.
            </caption>
            <thead>
              <tr>
                <th scope="col">Fifths</th>
                <th scope="col">Note</th>
                <th scope="col">Pure</th>
                <th scope="col">Equal</th>
                <th scope="col">Drift</th>
              </tr>
            </thead>
            <tbody>
              {STEPS.map((step) => (
                <tr key={step.count}>
                  <th scope="row">{step.count}</th>
                  <td>{step.label}</td>
                  <td>{fixed(step.pureCents)}</td>
                  <td>{fixed(step.equalCents)}</td>
                  <td>{fixed(step.drift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

import { formatRoute, storedInstrument } from "../route";
import {
  type Key,
  MODE_IDS,
  type ModeOnTonic,
  SCALES,
  formatNote,
  modeKeySignature,
  pitchClass,
  pitchClassLabel,
  scaleLabel,
} from "../theory";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

/** "2♭", "3♯" or "0": the key signature as a count. */
function signatureText({ signature }: ModeOnTonic): string {
  const count = signature.accidentals.length;
  return signature.kind === "sharps" ? `${count}♯` : signature.kind === "flats" ? `${count}♭` : "0";
}

function signatureWords({ signature }: ModeOnTonic): string {
  const count = signature.accidentals.length;
  if (signature.kind === "none") return "no sharps or flats";
  const unit = signature.kind === "sharps" ? "sharp" : "flat";
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * Every mode on every tonic: the key signature it has, as the major key with the same notes
 * and the number of ♯ or ♭. Each mode is the same circle shifted one step, so a row is darker
 * the more ♭ it has. Each cell opens the scale.
 */
export function ModeMap({ selected }: { selected: Key }) {
  const selectedPc = pitchClass(selected.tonic);
  const instrument = storedInstrument();
  return (
    <section className="mode-map" aria-labelledby="mode-map-title">
      <h3 id="mode-map-title" className="mode-map__title">
        Modes on the circle
      </h3>
      <p className="mode-map__intro">
        Every mode has the notes of a major key, so it has that key's signature. C lydian has G
        major's (1♯) and C mixolydian F major's (1♭). Each row is one step darker than the one
        above, with one more ♭ (or one fewer ♯). The column of the selected key's tonic is outlined.
        Open a cell to see the scale.
      </p>
      <div
        className="mode-map__scroll"
        role="region"
        aria-label="Mode map, scrolls sideways on narrow screens"
        tabIndex={0}
      >
        <table className="mode-map__table">
          <caption className="mode-map__caption">
            Major key with the same notes, and its number of sharps (♯) or flats (♭), for each mode
            on each tonic
          </caption>
          <thead>
            <tr>
              <th scope="col">Mode</th>
              {PITCH_CLASSES.map((pc) => (
                <th
                  key={pc}
                  scope="col"
                  className={pc === selectedPc ? "mode-map__selected" : undefined}
                  aria-current={pc === selectedPc ? "true" : undefined}
                >
                  {pitchClassLabel(pc)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODE_IDS.map((mode) => (
              <tr key={mode}>
                <th scope="row">{scaleLabel(SCALES[mode])}</th>
                {PITCH_CLASSES.map((pc) => {
                  const on = modeKeySignature(pc, mode);
                  const scaleName = `${formatNote(on.tonic)} ${SCALES[mode].name.toLowerCase()}`;
                  return (
                    <td key={pc} className={pc === selectedPc ? "mode-map__selected" : undefined}>
                      <a
                        className="mode-map__cell"
                        href={formatRoute({
                          page: "scale",
                          root: on.tonic,
                          scaleId: mode,
                          instrument,
                        })}
                        aria-label={`${scaleName}: same notes as ${formatNote(on.parent.tonic)} major, ${signatureWords(on)}. Open scale`}
                      >
                        <span className="mode-map__key">{formatNote(on.parent.tonic)}</span>
                        <span className="mode-map__signature">{signatureText(on)}</span>
                      </a>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

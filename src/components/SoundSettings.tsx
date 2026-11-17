import { useId, useSyncExternalStore } from "react";
import { audioSupported } from "../audio/playback";
import {
  REFERENCE_RANGE,
  TEMPO_RANGE,
  TIMBRES,
  type Timbre,
  getAudioSettings,
  resetAudioSettings,
  subscribeAudioSettings,
  updateAudioSettings,
} from "../audio/settings";

/** Timbre, tempo, volume and tuning for the listen buttons. Hidden when the browser has no Web Audio. */
export function SoundSettings() {
  const settings = useSyncExternalStore(subscribeAudioSettings, getAudioSettings);
  const id = useId();
  if (!audioSupported()) return null;
  return (
    <details className="sound">
      <summary className="sound__summary">Sound settings</summary>
      <div className="sound__fields">
        <label className="sound__field" htmlFor={`${id}-timbre`}>
          <span>Sound</span>
          <select
            id={`${id}-timbre`}
            value={settings.timbre}
            onChange={(e) => updateAudioSettings({ timbre: e.target.value as Timbre })}
          >
            {TIMBRES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sound__field" htmlFor={`${id}-tempo`}>
          <span>Tempo {Math.round(settings.tempo * 100)}%</span>
          <input
            id={`${id}-tempo`}
            type="range"
            min={TEMPO_RANGE.min}
            max={TEMPO_RANGE.max}
            step={0.05}
            value={settings.tempo}
            onChange={(e) => updateAudioSettings({ tempo: e.target.valueAsNumber })}
          />
        </label>
        <label className="sound__field" htmlFor={`${id}-volume`}>
          <span>Volume {Math.round(settings.volume * 100)}%</span>
          <input
            id={`${id}-volume`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => updateAudioSettings({ volume: e.target.valueAsNumber })}
          />
        </label>
        <label className="sound__field" htmlFor={`${id}-reference`}>
          <span>A4 (Hz)</span>
          <input
            id={`${id}-reference`}
            type="number"
            inputMode="numeric"
            min={REFERENCE_RANGE.min}
            max={REFERENCE_RANGE.max}
            step={1}
            value={settings.reference}
            onChange={(e) => {
              // An empty or half-typed field keeps the tuning it had.
              if (Number.isFinite(e.target.valueAsNumber)) {
                updateAudioSettings({ reference: e.target.valueAsNumber });
              }
            }}
          />
        </label>
        <button type="button" className="sound__reset" onClick={resetAudioSettings}>
          Reset
        </button>
      </div>
    </details>
  );
}

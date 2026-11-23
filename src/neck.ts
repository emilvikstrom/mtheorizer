import {
  type OpenString,
  STRING_INSTRUMENT_IDS,
  type StringInstrumentId,
  TUNING_IDS,
  type Tuning,
  type TuningId,
  formatTune,
  parseTune,
  presetFor,
  tuningFor,
} from "./theory";

/**
 * How the neck is shown. Left out of a route when it is the default (standard tuning,
 * right-handed). Only the guitar has a choice of built-in tuning; a custom setup carries its
 * own `strings`; the other instruments have one tuning each.
 */
export interface GuitarOptions {
  readonly tuning?: TuningId;
  readonly strings?: readonly OpenString[];
  readonly left?: boolean;
}

/** A string instrument and how it is tuned and held: what the settings page edits. */
export interface NeckSetup extends GuitarOptions {
  readonly instrument: StringInstrumentId;
}

export const DEFAULT_NECK: NeckSetup = { instrument: "guitar" };

export const neckTuning = (setup: NeckSetup): Tuning =>
  tuningFor(setup.instrument, setup.tuning, setup.strings);

/**
 * The setup that tunes `strings`. A tuning that is one of the built-in instruments keeps its
 * short link (`on=ukulele`); any other is a custom setup that carries its strings.
 */
export function setupFor(strings: readonly OpenString[], left = false): NeckSetup {
  const builtIn = presetFor(strings)?.builtIn;
  const hand = left ? { left: true } : {};
  if (!builtIn) return { instrument: "custom", strings, ...hand };
  const tuning = builtIn.tuning && builtIn.tuning !== "standard" ? { tuning: builtIn.tuning } : {};
  return { instrument: builtIn.instrument, ...tuning, ...hand };
}

/** `setup` with its hand changed. */
export const withHand = (setup: NeckSetup, left: boolean): NeckSetup => {
  const rest: { -readonly [K in keyof NeckSetup]: NeckSetup[K] } = { ...setup };
  delete rest.left;
  return left ? { ...rest, left: true } : rest;
};

// --- Remembered setup -------------------------------------------------------

const NECK_KEY = "mtheorizer.neck";
/** The key the instrument alone was remembered under, before there was a settings page. */
const INSTRUMENT_KEY = "mtheorizer.instrument";

const isStringInstrument = (value: unknown): value is StringInstrumentId =>
  (STRING_INSTRUMENT_IDS as readonly unknown[]).includes(value);

function parseSetup(text: string | null): NeckSetup | undefined {
  if (!text) return undefined;
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== "object" || raw === null) return undefined;
    const { instrument, tuning, tune, left } = raw as Record<string, unknown>;
    if (!isStringInstrument(instrument)) return undefined;
    const strings = typeof tune === "string" ? parseTune(tune) : undefined;
    return {
      instrument,
      ...(instrument === "guitar" &&
      typeof tuning === "string" &&
      tuning !== "standard" &&
      (TUNING_IDS as readonly string[]).includes(tuning)
        ? { tuning: tuning as TuningId }
        : {}),
      ...(instrument === "custom" && strings ? { strings } : {}),
      ...(left === true ? { left: true } : {}),
    };
  } catch {
    return undefined;
  }
}

/** The setup chosen last (on the settings page or in a link), the guitar in standard tuning at first. */
export function storedNeck(): NeckSetup {
  try {
    const stored = parseSetup(window.localStorage.getItem(NECK_KEY));
    if (stored) return stored;
    const instrument = window.localStorage.getItem(INSTRUMENT_KEY);
    if (isStringInstrument(instrument)) return { instrument };
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return DEFAULT_NECK;
}

export function rememberNeck(setup: NeckSetup) {
  try {
    window.localStorage.setItem(
      NECK_KEY,
      JSON.stringify({
        instrument: setup.instrument,
        ...(setup.tuning ? { tuning: setup.tuning } : {}),
        ...(setup.strings ? { tune: formatTune(setup.strings) } : {}),
        ...(setup.left ? { left: true } : {}),
      }),
    );
  } catch {
    // Not remembering is fine.
  }
}

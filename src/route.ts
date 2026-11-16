import { useMemo, useSyncExternalStore } from "react";
import {
  CHORD_BASES,
  CHORD_MODIFIERS,
  CHORD_QUALITIES,
  type ChordBase,
  type ChordModifier,
  type ChordQualityId,
  type ChordSpec,
  type Key,
  type KeyMode,
  type Letter,
  LETTERS,
  type Note,
  SCALES,
  type ScaleId,
  TUNING_IDS,
  type TuningId,
  circlePosition,
  identifyQuality,
  key,
  keyEquals,
  keysAt,
  normalizeSpec,
  note,
  specOf,
} from "./theory";

/**
 * What the app shows, kept in the URL hash so a link opens the same view:
 *
 *   #/Db/major?on=piano&inv=1      chord (D♭ major, first inversion on the piano)
 *   #/C/minor?with=7,9&on=piano    chord built from a base chord and qualities (Cm9)
 *   #/Cs/minor?with=7&on=guitar    C♯ minor seventh on the guitar
 *   #/A/scale/naturalMinor?on=piano  scale
 *   #/circle/Bb/major              circle of fifths with B♭ major selected
 *
 * The chord is a base chord (`major`, `minor`, `diminished`, `augmented`, `sus2`,
 * `sus4` or `power`) and the qualities in `with`. Qualities that do not fit the
 * base chord are dropped, as in the chord builder. Links from before the builder
 * (`#/C/dominant7Sharp9`) name the whole chord and still open it.
 *
 * Notes are a letter plus `s` (sharp) or `b` (flat). `#` is read as a sharp too.
 */

export type Instrument = "piano" | "guitar";

/** How the guitar is shown. Left out of the route when it is the default (standard tuning, right-handed). */
export interface GuitarOptions {
  readonly tuning?: TuningId;
  readonly left?: boolean;
}

export interface ChordRoute extends GuitarOptions {
  readonly page: "chord";
  readonly root: Note;
  /** Always normalized: every quality fits the base chord. */
  readonly spec: ChordSpec;
  readonly inversion: number;
  readonly instrument: Instrument;
}

export interface ScaleRoute extends GuitarOptions {
  readonly page: "scale";
  readonly root: Note;
  readonly scaleId: ScaleId;
  readonly instrument: Instrument;
}

export type LookupRoute = ChordRoute | ScaleRoute;

export interface CircleRoute {
  readonly page: "circle";
  readonly key: Key;
}

export type Route = LookupRoute | CircleRoute;

const MAX_INVERSION = 3;
const STORAGE_KEY = "mtheorizer.instrument";

// --- Remembered instrument --------------------------------------------------

const isInstrument = (value: unknown): value is Instrument =>
  value === "piano" || value === "guitar";

/** The instrument used last time, for links that do not say. */
export function storedInstrument(): Instrument {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (isInstrument(value)) return value;
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return "piano";
}

function rememberInstrument(instrument: Instrument) {
  try {
    window.localStorage.setItem(STORAGE_KEY, instrument);
  } catch {
    // Not remembering is fine.
  }
}

/** The guitar options of `route`, for carrying them over to another route. */
export function guitarOptions(route: LookupRoute): GuitarOptions {
  return {
    ...(route.tuning && route.tuning !== "standard" ? { tuning: route.tuning } : {}),
    ...(route.left ? { left: true } : {}),
  };
}

// --- Defaults ---------------------------------------------------------------

export const defaultChordRoute = (instrument: Instrument = "piano"): ChordRoute => ({
  page: "chord",
  root: note("C"),
  spec: specOf("major"),
  inversion: 0,
  instrument,
});

export const defaultCircleRoute = (): CircleRoute => ({
  page: "circle",
  key: key(note("C"), "major"),
});

// --- Format -----------------------------------------------------------------

export function formatRouteNote(n: Note): string {
  const accidental = n.accidental >= 0 ? "s".repeat(n.accidental) : "b".repeat(-n.accidental);
  return `${n.letter}${accidental}`;
}

function formatGuitarOptions(route: LookupRoute): string {
  if (route.instrument !== "guitar") return "";
  const { tuning, left } = guitarOptions(route);
  return `${tuning ? `&tuning=${tuning}` : ""}${left ? "&hand=left" : ""}`;
}

/** `minor?with=7,9` style: the base chord, then the qualities. */
function formatChordSpec(spec: ChordSpec): { path: string; params: string } {
  const { base, qualities } = normalizeSpec(spec);
  return { path: base, params: qualities.length > 0 ? `with=${qualities.join(",")}&` : "" };
}

/**
 * The link as it was written before the chord builder, which named the whole
 * chord (`dominant7`). Only chords that have such a name can be written this way.
 */
export function formatLegacyChordRoute(route: ChordRoute): string | undefined {
  const quality: ChordQualityId | undefined = identifyQuality(route.spec);
  if (quality === undefined) return undefined;
  const inversion =
    route.inversion > 0 && route.instrument === "piano" ? `&inv=${route.inversion}` : "";
  return `#/${formatRouteNote(route.root)}/${quality}?on=${route.instrument}${inversion}${formatGuitarOptions(route)}`;
}

export function formatRoute(route: Route): string {
  switch (route.page) {
    case "chord": {
      const inversion =
        route.inversion > 0 && route.instrument === "piano" ? `&inv=${route.inversion}` : "";
      const { path, params } = formatChordSpec(route.spec);
      return `#/${formatRouteNote(route.root)}/${path}?${params}on=${route.instrument}${inversion}${formatGuitarOptions(route)}`;
    }
    case "scale":
      return `#/${formatRouteNote(route.root)}/scale/${route.scaleId}?on=${route.instrument}${formatGuitarOptions(route)}`;
    case "circle":
      return `#/circle/${formatRouteNote(route.key.tonic)}/${route.key.mode}`;
  }
}

// --- Parse ------------------------------------------------------------------

const has = (record: object, id: string) => Object.prototype.hasOwnProperty.call(record, id);

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function parseRouteNote(text: string | undefined): Note | undefined {
  const match = /^([A-G])(s|#|b)?$/.exec(text ?? "");
  if (!match) return undefined;
  const letter = match[1] as Letter;
  if (!LETTERS.includes(letter)) return undefined;
  return note(letter, match[2] === undefined ? 0 : match[2] === "b" ? -1 : 1);
}

function parseCircleKey(
  tonicText: string | undefined,
  modeText: string | undefined,
): Key | undefined {
  const tonic = parseRouteNote(tonicText);
  if (!tonic || (modeText !== "major" && modeText !== "minor")) return undefined;
  const mode: KeyMode = modeText;
  const candidate = key(tonic, mode);
  // Only the spellings the circle offers (not D♯ major, say).
  return keysAt(circlePosition(candidate), mode).some((k) => keyEquals(k, candidate))
    ? candidate
    : undefined;
}

const isBase = (text: string): text is ChordBase =>
  (CHORD_BASES as readonly string[]).includes(text);
const isModifier = (text: string): text is ChordModifier =>
  (CHORD_MODIFIERS as readonly string[]).includes(text);

/** The chord of a link's path part and `with` list, or undefined when the path names no chord. */
function parseChordSpec(part: string | undefined, withParam: string | null): ChordSpec | undefined {
  if (part === undefined) return undefined;
  let spec: ChordSpec;
  if (isBase(part)) spec = { base: part, qualities: [] };
  else if (has(CHORD_QUALITIES, part)) spec = specOf(part as ChordQualityId);
  else return undefined;
  const extra = (withParam ?? "").split(",").filter(isModifier);
  return normalizeSpec({ base: spec.base, qualities: [...spec.qualities, ...extra] });
}

/**
 * The view a hash stands for. A link that makes no sense falls back to C major
 * (or to C major on the circle, for a broken circle link). `fallbackInstrument`
 * is used when the link does not name an instrument.
 */
export function parseRoute(hash: string, fallbackInstrument: Instrument = "piano"): Route {
  return parseLink(hash, fallbackInstrument, false) as Route;
}

/** Like `parseRoute`, but undefined for a link that names no chord, scale or key. */
export function parseRouteStrict(
  hash: string,
  fallbackInstrument: Instrument = "piano",
): Route | undefined {
  return parseLink(hash, fallbackInstrument, true);
}

function parseLink(
  hash: string,
  fallbackInstrument: Instrument,
  strict: boolean,
): Route | undefined {
  const trimmed = hash.replace(/^#\/?/, "");
  const queryAt = trimmed.indexOf("?");
  const path = queryAt === -1 ? trimmed : trimmed.slice(0, queryAt);
  const query = new URLSearchParams(queryAt === -1 ? "" : trimmed.slice(queryAt + 1));
  const parts = path.split("/").filter(Boolean).map(safeDecode);

  if (parts[0] === "circle") {
    const k = parseCircleKey(parts[1], parts[2]);
    return k ? { page: "circle", key: k } : strict ? undefined : defaultCircleRoute();
  }

  const onParam = query.get("on");
  const instrument = isInstrument(onParam) ? onParam : fallbackInstrument;
  const tuningParam = query.get("tuning");
  const options: GuitarOptions = {
    ...(instrument === "guitar" &&
    tuningParam !== null &&
    tuningParam !== "standard" &&
    (TUNING_IDS as string[]).includes(tuningParam)
      ? { tuning: tuningParam as TuningId }
      : {}),
    ...(instrument === "guitar" && query.get("hand") === "left" ? { left: true } : {}),
  };
  const fallback = strict ? undefined : defaultChordRoute(instrument);
  const root = parseRouteNote(parts[0]);
  if (!root) return fallback;

  if (parts[1] === "scale") {
    const scaleId = parts[2];
    return scaleId !== undefined && has(SCALES, scaleId)
      ? { page: "scale", root, scaleId: scaleId as ScaleId, instrument, ...options }
      : fallback;
  }

  const spec = parseChordSpec(parts[1], query.get("with"));
  if (!spec) return fallback;
  const inversion = Number(query.get("inv") ?? 0);
  return {
    page: "chord",
    root,
    spec,
    inversion:
      Number.isInteger(inversion) && inversion >= 0 && inversion <= MAX_INVERSION ? inversion : 0,
    instrument,
    ...options,
  };
}

// --- The URL as app state ---------------------------------------------------

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

const currentHash = () => window.location.hash;

/** Show `route`: adds a history entry, so the back button returns to the previous view. */
export function navigate(route: Route) {
  const hash = formatRoute(route);
  if (route.page !== "circle") rememberInstrument(route.instrument);
  if (hash === window.location.hash) return;
  window.history.pushState(null, "", hash);
  for (const listener of listeners) listener();
}

/** The current route, following the URL (links, back and forward) and `navigate`. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash);
  return useMemo(() => parseRoute(hash, storedInstrument()), [hash]);
}

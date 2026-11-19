import { useMemo, useSyncExternalStore } from "react";
import {
  ALL_SPELLING_GROUPS,
  type BuilderChord,
  DEFAULT_LISTENING_LEVEL,
  type ListeningLevelId,
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
  PROGRESSIONS,
  type ProgressionId,
  SCALES,
  type ScaleId,
  type SpellingGroupId,
  type TriadMode,
  STRING_INSTRUMENT_IDS,
  type StringInstrumentId,
  TUNING_IDS,
  type TuningId,
  circlePosition,
  formatBuilderChords,
  identifyQuality,
  isListeningLevel,
  isProgressionId,
  isSpellingGroup,
  key,
  keyEquals,
  keysAt,
  normalizeSpec,
  note,
  parseBuilderChords,
  specOf,
} from "./theory";
import { DEFAULT_TONE_DISPLAY, type ToneDisplay, isToneDisplay } from "./toneLabels";

/**
 * What the app shows, kept in the URL hash so a link opens the same view:
 *
 *   #/Db/major?on=piano&inv=1      chord (D♭ major, first inversion on the piano)
 *   #/C/minor?with=7,9&on=piano    chord built from a base chord and qualities (Cm9)
 *   #/Cs/minor?with=7&on=guitar    C♯ minor seventh on the guitar
 *   #/A/scale/naturalMinor?on=piano  scale
 *   #/C/major?on=piano&vs=A-minor  C major compared with A minor (`vs=Root-base`, qualities in `vsw`)
 *   #/C/major?on=piano&show=intervals  chord with intervals (R 3 5) on the keys; also names, steps, none
 *   #/circle/Bb/major              circle of fifths with B♭ major selected
 *   #/progression/Ab/pop           the I–V–vi–IV progression in A♭ major
 *   #/build/C/major?c=1,5,6s,4     a progression built from the key's chords (`s` = seventh chord)
 *   #/identify                     "What chord is this?" (the keys you pick are not in the link)
 *   #/tonnetz/C/major              the Tonnetz with the C major triad selected
 *
 * The chord is a base chord (`major`, `minor`, `diminished`, `augmented`, `sus2`,
 * `sus4` or `power`) and the qualities in `with`. Qualities that do not fit the
 * base chord are dropped, as in the chord builder. Links from before the builder
 * (`#/C/dominant7Sharp9`) name the whole chord and still open it.
 *
 * Notes are a letter plus `s` (sharp) or `b` (flat). `#` is read as a sharp too.
 */

/** The piano, or a fretted instrument: `on=guitar`, `on=ukulele`, `on=bass`, `on=bass5`, `on=mandolin`. */
export type Instrument = "piano" | StringInstrumentId;

/**
 * How the neck is shown. Left out of the route when it is the default (standard tuning, right-handed).
 * Only the guitar has a choice of tuning; the other instruments have one each.
 */
export interface GuitarOptions {
  readonly tuning?: TuningId;
  readonly left?: boolean;
}

/**
 * What the keys and frets say. Left out of old links, which then follow the
 * choice remembered last; a link that names it (`show=intervals`) overrides that.
 */
export interface DisplayOptions {
  readonly show?: ToneDisplay;
}

/** The second chord of a comparison (the first is the route's own chord). */
export interface ChordVs {
  readonly root: Note;
  /** Always normalized. */
  readonly spec: ChordSpec;
}

export interface ChordRoute extends GuitarOptions, DisplayOptions {
  readonly page: "chord";
  readonly root: Note;
  /** Always normalized: every quality fits the base chord. */
  readonly spec: ChordSpec;
  readonly inversion: number;
  readonly instrument: Instrument;
  /** A second chord to compare with. Left out when nothing is compared. */
  readonly vs?: ChordVs;
}

export interface ScaleRoute extends GuitarOptions, DisplayOptions {
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

/** A common chord progression put in a key; the key's mode comes from the progression. */
export interface ProgressionRoute {
  readonly page: "progression";
  readonly tonic: Note;
  readonly id: ProgressionId;
}

/**
 * A progression built chord by chord from a key's own chords. `steps` is empty for a new one (and
 * for a link whose chords make no sense).
 */
export interface BuildRoute {
  readonly page: "build";
  readonly key: Key;
  readonly steps: readonly BuilderChord[];
}

export interface IdentifyRoute {
  readonly page: "identify";
}

/**
 * Practice: the key-signature quiz, the spelling drill (`mode: "spelling"`) or the listening
 * drill (`mode: "listening"`). A drill's `seed` repeats a set of questions. The spelling drill's
 * `groups` limit them (all of them when absent); the listening drill has a `level` (triads when
 * absent) and can turn chords over (`inversions`).
 */
export interface QuizRoute {
  readonly page: "quiz";
  readonly mode?: "spelling" | "listening";
  readonly seed?: number;
  readonly groups?: readonly SpellingGroupId[];
  readonly level?: ListeningLevelId;
  readonly inversions?: true;
}

/** The Tonnetz with one triad selected. */
export interface TonnetzRoute {
  readonly page: "tonnetz";
  readonly root: Note;
  readonly mode: TriadMode;
}

export type Route =
  | LookupRoute
  | CircleRoute
  | ProgressionRoute
  | BuildRoute
  | IdentifyRoute
  | QuizRoute
  | TonnetzRoute;

const MAX_INVERSION = 3;
const STORAGE_KEY = "mtheorizer.instrument";
const SHOW_STORAGE_KEY = "mtheorizer.show";

// --- Remembered instrument --------------------------------------------------

const isInstrument = (value: unknown): value is Instrument =>
  value === "piano" || (STRING_INSTRUMENT_IDS as readonly unknown[]).includes(value);

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

/** The tone display used last time, for links that do not say. */
export function storedToneDisplay(): ToneDisplay {
  try {
    const value = window.localStorage.getItem(SHOW_STORAGE_KEY);
    if (isToneDisplay(value)) return value;
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return DEFAULT_TONE_DISPLAY;
}

function rememberToneDisplay(show: ToneDisplay) {
  try {
    window.localStorage.setItem(SHOW_STORAGE_KEY, show);
  } catch {
    // Not remembering is fine.
  }
}

/** The display option of `route`, for carrying it over to another route. */
export function displayOptions(route: LookupRoute): DisplayOptions {
  return route.show ? { show: route.show } : {};
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

export const defaultIdentifyRoute = (): IdentifyRoute => ({ page: "identify" });

export const defaultQuizRoute = (): QuizRoute => ({ page: "quiz" });

export const defaultTonnetzRoute = (): TonnetzRoute => ({
  page: "tonnetz",
  root: note("C"),
  mode: "major",
});

export const defaultCircleRoute = (): CircleRoute => ({
  page: "circle",
  key: key(note("C"), "major"),
});

export const defaultProgressionRoute = (): ProgressionRoute => ({
  page: "progression",
  tonic: note("C"),
  id: "pop",
});

export const defaultBuildRoute = (): BuildRoute => ({
  page: "build",
  key: key(note("C"), "major"),
  steps: [],
});

// --- Format -----------------------------------------------------------------

export function formatRouteNote(n: Note): string {
  const accidental = n.accidental >= 0 ? "s".repeat(n.accidental) : "b".repeat(-n.accidental);
  return `${n.letter}${accidental}`;
}

function formatGuitarOptions(route: LookupRoute): string {
  const show = route.show ? `&show=${route.show}` : "";
  if (route.instrument === "piano") return show;
  const { tuning, left } = guitarOptions(route);
  const tuned = route.instrument === "guitar" && tuning ? `&tuning=${tuning}` : "";
  return `${tuned}${left ? "&hand=left" : ""}${show}`;
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
/** `&vs=Eb-minor&vsw=7`: the compared chord, or nothing. */
function formatVs(vs: ChordVs | undefined): string {
  if (!vs) return "";
  const { base, qualities } = normalizeSpec(vs.spec);
  return `&vs=${formatRouteNote(vs.root)}-${base}${qualities.length > 0 ? `&vsw=${qualities.join(",")}` : ""}`;
}

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
      return `#/${formatRouteNote(route.root)}/${path}?${params}on=${route.instrument}${inversion}${formatVs(route.vs)}${formatGuitarOptions(route)}`;
    }
    case "scale":
      return `#/${formatRouteNote(route.root)}/scale/${route.scaleId}?on=${route.instrument}${formatGuitarOptions(route)}`;
    case "circle":
      return `#/circle/${formatRouteNote(route.key.tonic)}/${route.key.mode}`;
    case "progression":
      return `#/progression/${formatRouteNote(route.tonic)}/${route.id}`;
    case "build": {
      const chords = formatBuilderChords(route.steps);
      return `#/build/${formatRouteNote(route.key.tonic)}/${route.key.mode}${chords ? `?c=${chords}` : ""}`;
    }
    case "identify":
      return "#/identify";
    case "quiz":
      return formatQuiz(route);
    case "tonnetz":
      return `#/tonnetz/${formatRouteNote(route.root)}/${route.mode}`;
  }
}

/**
 * `#/quiz`, `#/quiz/spelling?seed=7&groups=triads,scales` or
 * `#/quiz/listening?seed=7&level=sevenths&inversions=1`.
 */
function formatQuiz(route: QuizRoute): string {
  if (route.mode === "listening") {
    const listening: string[] = [];
    if (route.seed !== undefined) listening.push(`seed=${route.seed}`);
    if (route.level && route.level !== DEFAULT_LISTENING_LEVEL) {
      listening.push(`level=${route.level}`);
    }
    if (route.inversions) listening.push("inversions=1");
    return `#/quiz/listening${listening.length > 0 ? `?${listening.join("&")}` : ""}`;
  }
  if (route.mode !== "spelling") return "#/quiz";
  const params: string[] = [];
  if (route.seed !== undefined) params.push(`seed=${route.seed}`);
  if (route.groups) params.push(`groups=${route.groups.join(",")}`);
  return `#/quiz/spelling${params.length > 0 ? `?${params.join("&")}` : ""}`;
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

/** The chord of `vs=Eb-minor` (and `vsw`), or undefined when the link names none. */
function parseVs(text: string | null, withParam: string | null): ChordVs | undefined {
  if (text === null) return undefined;
  const at = text.indexOf("-");
  if (at === -1) return undefined;
  const root = parseRouteNote(text.slice(0, at));
  const spec = parseChordSpec(text.slice(at + 1), withParam);
  return root && spec ? { root, spec } : undefined;
}

const MAX_SEED = 0xffffffff;

/** The drill's groups in their usual order, or undefined when the link names none, or all. */
function parseQuizGroups(text: string | null): readonly SpellingGroupId[] | undefined {
  const named = (text ?? "").split(",").filter(isSpellingGroup);
  const groups = ALL_SPELLING_GROUPS.filter((id) => named.includes(id));
  return groups.length === 0 || groups.length === ALL_SPELLING_GROUPS.length ? undefined : groups;
}

function parseQuiz(mode: string | undefined, query: URLSearchParams): QuizRoute {
  if (mode !== "spelling" && mode !== "listening") return { page: "quiz" };
  const seedText = query.get("seed");
  const seed = seedText !== null && /^\d+$/.test(seedText) ? Number(seedText) : undefined;
  if (mode === "listening") {
    const levelText = query.get("level") ?? "";
    const level =
      isListeningLevel(levelText) && levelText !== DEFAULT_LISTENING_LEVEL ? levelText : undefined;
    return {
      page: "quiz",
      mode: "listening",
      ...(seed !== undefined && seed <= MAX_SEED ? { seed } : {}),
      ...(level ? { level } : {}),
      ...(query.get("inversions") === "1" ? { inversions: true as const } : {}),
    };
  }
  const groups = parseQuizGroups(query.get("groups"));
  return {
    page: "quiz",
    mode: "spelling",
    ...(seed !== undefined && seed <= MAX_SEED ? { seed } : {}),
    ...(groups ? { groups } : {}),
  };
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

  if (parts[0] === "identify") return { page: "identify" };
  if (parts[0] === "quiz") return parseQuiz(parts[1], query);

  if (parts[0] === "tonnetz") {
    const tonic = parseRouteNote(parts[1]);
    const mode = parts[2];
    if (tonic && (mode === "major" || mode === "minor")) {
      return { page: "tonnetz", root: tonic, mode };
    }
    return strict ? undefined : defaultTonnetzRoute();
  }

  if (parts[0] === "circle") {
    const k = parseCircleKey(parts[1], parts[2]);
    return k ? { page: "circle", key: k } : strict ? undefined : defaultCircleRoute();
  }

  if (parts[0] === "progression") {
    const id = parts[2];
    if (id !== undefined && isProgressionId(id)) {
      const k = parseCircleKey(parts[1], PROGRESSIONS[id].mode);
      if (k) return { page: "progression", tonic: k.tonic, id };
    }
    return strict ? undefined : defaultProgressionRoute();
  }

  if (parts[0] === "build") {
    const k = parseCircleKey(parts[1], parts[2]);
    if (!k) return strict ? undefined : defaultBuildRoute();
    // A list that makes no sense gives an empty progression, not a different key.
    const steps = parseBuilderChords(query.get("c") ?? "");
    if (!steps && strict) return undefined;
    return { page: "build", key: k, steps: steps ?? [] };
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
    ...(instrument !== "piano" && query.get("hand") === "left" ? { left: true } : {}),
  };
  const showParam = query.get("show");
  const display: DisplayOptions = isToneDisplay(showParam) ? { show: showParam } : {};
  const fallback = strict ? undefined : defaultChordRoute(instrument);
  const root = parseRouteNote(parts[0]);
  if (!root) return fallback;

  if (parts[1] === "scale") {
    const scaleId = parts[2];
    return scaleId !== undefined && has(SCALES, scaleId)
      ? { page: "scale", root, scaleId: scaleId as ScaleId, instrument, ...options, ...display }
      : fallback;
  }

  const spec = parseChordSpec(parts[1], query.get("with"));
  if (!spec) return fallback;
  const inversion = Number(query.get("inv") ?? 0);
  const vs = parseVs(query.get("vs"), query.get("vsw"));
  return {
    page: "chord",
    root,
    spec,
    inversion:
      Number.isInteger(inversion) && inversion >= 0 && inversion <= MAX_INVERSION ? inversion : 0,
    instrument,
    ...(vs ? { vs } : {}),
    ...options,
    ...display,
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
export function navigate(route: Route, options: { replace?: boolean } = {}) {
  const hash = formatRoute(route);
  if (route.page === "chord" || route.page === "scale") {
    rememberInstrument(route.instrument);
    if (route.show) rememberToneDisplay(route.show);
  }
  if (hash === window.location.hash) return;
  if (options.replace) window.history.replaceState(null, "", hash);
  else window.history.pushState(null, "", hash);
  for (const listener of listeners) listener();
}

/** The current route, following the URL (links, back and forward) and `navigate`. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash);
  return useMemo(() => parseRoute(hash, storedInstrument()), [hash]);
}

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
  type Tonality,
  TUNING_IDS,
  type TuningId,
  FRET_WINDOW_STARTS,
  type FretPick,
  circlePosition,
  fitBuilderChords,
  formatBuilderChords,
  formatKeys,
  formatPicks,
  formatTune,
  identifyQuality,
  isListeningLevel,
  isProgressionId,
  isReadableTonic,
  isSpellingGroup,
  isTonalityId,
  key,
  keyEquals,
  keysAt,
  normalizeSpec,
  note,
  parseBuilderChords,
  parseKeys,
  parsePicks,
  parseTune,
  specOf,
  tonality,
  tuningFor,
} from "./theory";
import { type GuitarOptions, type NeckSetup, rememberNeck, storedNeck } from "./neck";
import { DEFAULT_TONE_DISPLAY, type ToneDisplay, isToneDisplay } from "./toneLabels";

export type { GuitarOptions } from "./neck";

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
 *   #/circle/A/minor?camelot=1     the same with the Camelot wheel (8A) shown
 *   #/progression/Ab/pop           the I–V–vi–IV progression in A♭ major
 *   #/build/C/major?c=1,5,6s,4     a progression built from the key's chords (`s` = seventh chord)
 *   #/build/D/dorian?c=1,4         the same from any tonality (`minor` is natural minor)
 *   #/build/C/major?c=1,b6,v5/2    with a chord borrowed from the parallel key (`b`) and a
 *                                  secondary dominant (`v5/2` = V7/ii)
 *   #/identify?keys=60,64,67       "What chord is this?" with keys pressed on the piano (MIDI numbers)
 *   #/identify?on=guitar&frets=6.0,5.2,4.2,3.0&from=13  the same on a guitar neck: pressed `string.fret`
 *                                  places, and the first fret shown (13 = frets 13–24)
 *   #/tonnetz/C/major              the Tonnetz with the C major triad selected
 *   #/settings                     the instrument settings (strings, tuning, presets)
 *   #/scale-finder?notes=0,4,7     the scales that hold these pitch classes (0 = C … 11 = B)
 *   #/C/major?on=custom&tune=D4,A3,F3,C3,G2,C2  a neck of any strings: open strings from string 1,
 *                                  letter, `s`/`b`, octave
 *
 * The chord is a base chord (`major`, `minor`, `diminished`, `augmented`, `sus2`,
 * `sus4` or `power`) and the qualities in `with`. Qualities that do not fit the
 * base chord are dropped, as in the chord builder. Links from before the builder
 * (`#/C/dominant7Sharp9`) name the whole chord and still open it.
 *
 * Notes are a letter plus `s` (sharp) or `b` (flat). `#` is read as a sharp too.
 */

/**
 * The piano, or a fretted instrument: `on=guitar`, `on=ukulele`, `on=bass`, `on=bass5`,
 * `on=mandolin`, or `on=custom` with the strings in `tune`.
 */
export type Instrument = "piano" | StringInstrumentId;

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
  /** The circle numbered as the Camelot wheel. */
  readonly camelot?: true;
}

/** A common chord progression put in a key; the key's mode comes from the progression. */
export interface ProgressionRoute {
  readonly page: "progression";
  readonly tonic: Note;
  readonly id: ProgressionId;
}

/**
 * A progression built chord by chord from a tonality's own chords. `steps` is empty for a new one
 * (and for a link whose chords make no sense).
 */
export interface BuildRoute {
  readonly page: "build";
  readonly tonality: Tonality;
  readonly steps: readonly BuilderChord[];
}

/**
 * "What chord is this?". `instrument` is a string instrument when the neck is shown (the piano
 * when absent), `frets` the places pressed on it and `from` the first fret shown (1 when absent).
 * On the piano, `keys` are the pressed keys as MIDI numbers, lowest first.
 */
export interface IdentifyRoute extends Omit<GuitarOptions, "left"> {
  readonly page: "identify";
  readonly keys?: readonly number[];
  readonly instrument?: StringInstrumentId;
  readonly frets?: readonly FretPick[];
  readonly from?: number;
}

/**
 * Practice: the key-signature quiz, the spelling drill (`mode: "spelling"`) or the listening
 * drill (`mode: "listening"`). A drill's `seed` repeats a set of questions. The key-signature
 * quiz can be limited to major or minor `keys` and to signatures of `upTo` accidentals or fewer
 * (no limit when absent). The spelling drill's `groups` limit its questions (all of them when
 * absent); the listening drill has a `level` (triads when absent) and can turn chords over
 * (`inversions`).
 */
export interface QuizRoute {
  readonly page: "quiz";
  readonly mode?: "spelling" | "listening";
  readonly seed?: number;
  readonly keys?: KeyMode;
  readonly upTo?: number;
  readonly groups?: readonly SpellingGroupId[];
  readonly level?: ListeningLevelId;
  readonly inversions?: true;
}

/** Find scales from notes: `notes` are pitch classes (0 = C), in the order they were picked. */
export interface ScaleFinderRoute {
  readonly page: "scaleFinder";
  readonly notes: readonly number[];
}

/** The settings page. What it sets is remembered in the browser, not kept in the link. */
export interface SettingsRoute {
  readonly page: "settings";
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
  | TonnetzRoute
  | SettingsRoute
  | ScaleFinderRoute;

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
    ...(route.instrument === "custom" && route.strings ? { strings: route.strings } : {}),
    ...(route.left ? { left: true } : {}),
  };
}

/** `route` on the neck as `setup` says, or on the piano as it was. */
export function withNeck<R extends LookupRoute>(route: R, setup: NeckSetup): R {
  const next: Record<string, unknown> = { ...route };
  delete next.tuning;
  delete next.strings;
  delete next.left;
  return { ...next, ...setup } as unknown as R;
}

/** The neck of `route`, to remember it for the next link that does not say. */
export function neckOf(route: LookupRoute): NeckSetup | undefined {
  return route.instrument === "piano"
    ? undefined
    : { instrument: route.instrument, ...guitarOptions(route) };
}

// --- Defaults ---------------------------------------------------------------

/** The remembered neck options (tuning, hand) when `instrument` is the remembered neck. */
function storedOptions(instrument: Instrument): GuitarOptions {
  if (instrument === "piano") return {};
  const { instrument: remembered, ...options } = storedNeck();
  return remembered === instrument ? options : {};
}

/** The instrument, and for a neck its tuning and hand, a chord or scale opens on when the link says nothing. */
export function storedLookupSetup(): { instrument: Instrument } & GuitarOptions {
  const instrument = storedInstrument();
  return { instrument, ...storedOptions(instrument) };
}

export const defaultChordRoute = (instrument: Instrument = "piano"): ChordRoute => ({
  page: "chord",
  root: note("C"),
  spec: specOf("major"),
  inversion: 0,
  instrument,
  ...storedOptions(instrument),
});

export const defaultSettingsRoute = (): SettingsRoute => ({ page: "settings" });

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
  tonality: tonality(note("C"), "major"),
  steps: [],
});

// --- Format -----------------------------------------------------------------

export function formatRouteNote(n: Note): string {
  const accidental = n.accidental >= 0 ? "s".repeat(n.accidental) : "b".repeat(-n.accidental);
  return `${n.letter}${accidental}`;
}

/** `&tuning=dropD`, `&tune=D4,A3,…` and `&hand=left`, for the options that are not the default. */
function formatNeckOptions(instrument: Instrument, options: GuitarOptions): string {
  const { tuning, strings, left } = options;
  const tuned = instrument === "guitar" && tuning ? `&tuning=${tuning}` : "";
  const custom = instrument === "custom" && strings ? `&tune=${formatTune(strings)}` : "";
  return `${tuned}${custom}${left ? "&hand=left" : ""}`;
}

function formatGuitarOptions(route: LookupRoute): string {
  const show = route.show ? `&show=${route.show}` : "";
  if (route.instrument === "piano") return show;
  return `${formatNeckOptions(route.instrument, guitarOptions(route))}${show}`;
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
      return `#/circle/${formatRouteNote(route.key.tonic)}/${route.key.mode}${route.camelot ? "?camelot=1" : ""}`;
    case "progression":
      return `#/progression/${formatRouteNote(route.tonic)}/${route.id}`;
    case "build": {
      const chords = formatBuilderChords(route.steps);
      const { tonic, scale } = route.tonality;
      return `#/build/${formatRouteNote(tonic)}/${scale === "naturalMinor" ? "minor" : scale}${chords ? `?c=${chords}` : ""}`;
    }
    case "identify":
      return formatIdentify(route);
    case "quiz":
      return formatQuiz(route);
    case "tonnetz":
      return `#/tonnetz/${formatRouteNote(route.root)}/${route.mode}`;
    case "settings":
      return "#/settings";
    case "scaleFinder":
      return route.notes.length > 0
        ? `#/scale-finder?notes=${route.notes.join(",")}`
        : "#/scale-finder";
  }
}

function formatIdentify(route: IdentifyRoute): string {
  if (!route.instrument) {
    const keys = formatKeys(route.keys ?? []);
    return keys ? `#/identify?keys=${keys}` : "#/identify";
  }
  const parts = [`on=${route.instrument}`];
  const neck = formatNeckOptions(route.instrument, route);
  if (neck) parts.push(neck.slice(1));
  if (route.frets && route.frets.length > 0) parts.push(`frets=${formatPicks(route.frets)}`);
  if (route.from !== undefined && route.from !== 1) parts.push(`from=${route.from}`);
  return `#/identify?${parts.join("&")}`;
}

/** Pitch classes from link text, each once, in order; anything else is dropped. */
function parseNotes(text: string | null): number[] {
  const notes: number[] = [];
  for (const part of (text ?? "").split(",")) {
    if (!/^\d{1,2}$/.test(part)) continue;
    const pc = Number(part);
    if (pc < 12 && !notes.includes(pc)) notes.push(pc);
  }
  return notes;
}

function parseNeckOptions(instrument: Instrument, query: URLSearchParams): GuitarOptions {
  const tuningParam = query.get("tuning");
  const strings = instrument === "custom" ? parseTune(query.get("tune")) : undefined;
  return {
    ...(instrument === "guitar" &&
    tuningParam !== null &&
    tuningParam !== "standard" &&
    (TUNING_IDS as string[]).includes(tuningParam)
      ? { tuning: tuningParam as TuningId }
      : {}),
    ...(strings ? { strings } : {}),
    ...(instrument !== "piano" && query.get("hand") === "left" ? { left: true } : {}),
  };
}

function parseIdentify(query: URLSearchParams): IdentifyRoute {
  const on = query.get("on");
  const instrument = (STRING_INSTRUMENT_IDS as readonly unknown[]).includes(on)
    ? (on as StringInstrumentId)
    : undefined;
  if (!instrument) {
    const keys = parseKeys(query.get("keys"));
    return keys.length > 0 ? { page: "identify", keys } : { page: "identify" };
  }
  const options = parseNeckOptions(instrument, query);
  const frets = parsePicks(
    query.get("frets"),
    tuningFor(instrument, options.tuning, options.strings).strings.length,
  );
  const from = Number(query.get("from"));
  return {
    page: "identify",
    instrument,
    ...(options.tuning ? { tuning: options.tuning } : {}),
    ...(options.strings ? { strings: options.strings } : {}),
    ...(frets.length > 0 ? { frets } : {}),
    ...(FRET_WINDOW_STARTS.includes(from) && from !== 1 ? { from } : {}),
  };
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
  if (route.mode !== "spelling") {
    const signatures: string[] = [];
    if (route.seed !== undefined) signatures.push(`seed=${route.seed}`);
    if (route.keys) signatures.push(`keys=${route.keys}`);
    if (route.upTo !== undefined) signatures.push(`upto=${route.upTo}`);
    return `#/quiz${signatures.length > 0 ? `?${signatures.join("&")}` : ""}`;
  }
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

/** A tonic and tonality from a link, when the spelling reads well (not D♯ major, say). */
function parseTonality(
  tonicText: string | undefined,
  scaleText: string | undefined,
): Tonality | undefined {
  const tonic = parseRouteNote(tonicText);
  if (!tonic || scaleText === undefined || !isTonalityId(scaleText)) return undefined;
  return isReadableTonic(tonic, scaleText) ? tonality(tonic, scaleText) : undefined;
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

/** The most accidentals a link can limit the key-signature quiz to; seven is no limit at all. */
const MAX_UP_TO = 6;

function parseQuiz(mode: string | undefined, query: URLSearchParams): QuizRoute {
  if (mode !== undefined && mode !== "spelling" && mode !== "listening") return { page: "quiz" };
  const seedText = query.get("seed");
  const seed = seedText !== null && /^\d+$/.test(seedText) ? Number(seedText) : undefined;
  if (mode === undefined) {
    const keys = query.get("keys");
    const upToText = query.get("upto");
    const upTo = upToText !== null && /^\d$/.test(upToText) ? Number(upToText) : undefined;
    return {
      page: "quiz",
      ...(seed !== undefined && seed <= MAX_SEED ? { seed } : {}),
      ...(keys === "major" || keys === "minor" ? { keys } : {}),
      ...(upTo !== undefined && upTo <= MAX_UP_TO ? { upTo } : {}),
    };
  }
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

  if (parts[0] === "settings") return { page: "settings" };
  if (parts[0] === "scale-finder")
    return { page: "scaleFinder", notes: parseNotes(query.get("notes")) };
  if (parts[0] === "identify") return parseIdentify(query);
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
    if (!k) return strict ? undefined : defaultCircleRoute();
    return query.get("camelot") === "1"
      ? { page: "circle", key: k, camelot: true }
      : { page: "circle", key: k };
  }

  if (parts[0] === "progression") {
    const id = parts[2];
    if (id !== undefined && isProgressionId(id)) {
      const t = parseTonality(parts[1], PROGRESSIONS[id].tonality);
      if (t) return { page: "progression", tonic: t.tonic, id };
    }
    return strict ? undefined : defaultProgressionRoute();
  }

  if (parts[0] === "build") {
    const t = parseTonality(parts[1], parts[2] === "minor" ? "naturalMinor" : parts[2]);
    if (!t) return strict ? undefined : defaultBuildRoute();
    // A list that makes no sense gives an empty progression, not a different key, and a chord
    // the tonality lacks (a borrowed one in a mode) is left out.
    const steps = parseBuilderChords(query.get("c") ?? "");
    if (!steps && strict) return undefined;
    return { page: "build", tonality: t, steps: fitBuilderChords(t, steps ?? []) };
  }

  const onParam = query.get("on");
  const instrument = isInstrument(onParam) ? onParam : fallbackInstrument;
  const options = parseNeckOptions(instrument, query);
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
    const neck = neckOf(route);
    if (neck) rememberNeck(neck);
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

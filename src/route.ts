import { useMemo, useSyncExternalStore } from 'react';
import {
  CHORD_QUALITIES,
  type ChordQualityId,
  type Key,
  type KeyMode,
  type Letter,
  LETTERS,
  type Note,
  SCALES,
  type ScaleId,
  circlePosition,
  key,
  keyEquals,
  keysAt,
  note,
} from './theory';

/**
 * What the app shows, kept in the URL hash so a link opens the same view:
 *
 *   #/Db/major?on=piano&inv=1      chord (D♭ major, first inversion on the piano)
 *   #/Cs/minor7?on=guitar          chord (C♯ minor seventh on the guitar)
 *   #/A/scale/naturalMinor?on=piano  scale
 *   #/circle/Bb/major              circle of fifths with B♭ major selected
 *
 * Notes are a letter plus `s` (sharp) or `b` (flat). `#` is read as a sharp too.
 */

export type Instrument = 'piano' | 'guitar';

export interface ChordRoute {
  readonly page: 'chord';
  readonly root: Note;
  readonly quality: ChordQualityId;
  readonly inversion: number;
  readonly instrument: Instrument;
}

export interface ScaleRoute {
  readonly page: 'scale';
  readonly root: Note;
  readonly scaleId: ScaleId;
  readonly instrument: Instrument;
}

export type LookupRoute = ChordRoute | ScaleRoute;

export interface CircleRoute {
  readonly page: 'circle';
  readonly key: Key;
}

export type Route = LookupRoute | CircleRoute;

const MAX_INVERSION = 3;
const STORAGE_KEY = 'mtheorizer.instrument';

// --- Remembered instrument --------------------------------------------------

const isInstrument = (value: unknown): value is Instrument => value === 'piano' || value === 'guitar';

/** The instrument used last time, for links that do not say. */
export function storedInstrument(): Instrument {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (isInstrument(value)) return value;
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return 'piano';
}

function rememberInstrument(instrument: Instrument) {
  try {
    window.localStorage.setItem(STORAGE_KEY, instrument);
  } catch {
    // Not remembering is fine.
  }
}

// --- Defaults ---------------------------------------------------------------

export const defaultChordRoute = (instrument: Instrument = 'piano'): ChordRoute => ({
  page: 'chord',
  root: note('C'),
  quality: 'major',
  inversion: 0,
  instrument,
});

export const defaultCircleRoute = (): CircleRoute => ({ page: 'circle', key: key(note('C'), 'major') });

// --- Format -----------------------------------------------------------------

export function formatRouteNote(n: Note): string {
  const accidental = n.accidental >= 0 ? 's'.repeat(n.accidental) : 'b'.repeat(-n.accidental);
  return `${n.letter}${accidental}`;
}

export function formatRoute(route: Route): string {
  switch (route.page) {
    case 'chord': {
      const inversion = route.inversion > 0 && route.instrument === 'piano' ? `&inv=${route.inversion}` : '';
      return `#/${formatRouteNote(route.root)}/${route.quality}?on=${route.instrument}${inversion}`;
    }
    case 'scale':
      return `#/${formatRouteNote(route.root)}/scale/${route.scaleId}?on=${route.instrument}`;
    case 'circle':
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
  const match = /^([A-G])(s|#|b)?$/.exec(text ?? '');
  if (!match) return undefined;
  const letter = match[1] as Letter;
  if (!LETTERS.includes(letter)) return undefined;
  return note(letter, match[2] === undefined ? 0 : match[2] === 'b' ? -1 : 1);
}

function parseCircleKey(tonicText: string | undefined, modeText: string | undefined): Key | undefined {
  const tonic = parseRouteNote(tonicText);
  if (!tonic || (modeText !== 'major' && modeText !== 'minor')) return undefined;
  const mode: KeyMode = modeText;
  const candidate = key(tonic, mode);
  // Only the spellings the circle offers (not D♯ major, say).
  return keysAt(circlePosition(candidate), mode).some((k) => keyEquals(k, candidate)) ? candidate : undefined;
}

/**
 * The view a hash stands for. A link that makes no sense falls back to C major
 * (or to C major on the circle, for a broken circle link). `fallbackInstrument`
 * is used when the link does not name an instrument.
 */
export function parseRoute(hash: string, fallbackInstrument: Instrument = 'piano'): Route {
  const trimmed = hash.replace(/^#\/?/, '');
  const queryAt = trimmed.indexOf('?');
  const path = queryAt === -1 ? trimmed : trimmed.slice(0, queryAt);
  const query = new URLSearchParams(queryAt === -1 ? '' : trimmed.slice(queryAt + 1));
  const parts = path.split('/').filter(Boolean).map(safeDecode);

  if (parts[0] === 'circle') {
    const k = parseCircleKey(parts[1], parts[2]);
    return k ? { page: 'circle', key: k } : defaultCircleRoute();
  }

  const onParam = query.get('on');
  const instrument = isInstrument(onParam) ? onParam : fallbackInstrument;
  const fallback = defaultChordRoute(instrument);
  const root = parseRouteNote(parts[0]);
  if (!root) return fallback;

  if (parts[1] === 'scale') {
    const scaleId = parts[2];
    return scaleId !== undefined && has(SCALES, scaleId)
      ? { page: 'scale', root, scaleId: scaleId as ScaleId, instrument }
      : fallback;
  }

  const quality = parts[1];
  if (quality === undefined || !has(CHORD_QUALITIES, quality)) return fallback;
  const inversion = Number(query.get('inv') ?? 0);
  return {
    page: 'chord',
    root,
    quality: quality as ChordQualityId,
    inversion: Number.isInteger(inversion) && inversion >= 0 && inversion <= MAX_INVERSION ? inversion : 0,
    instrument,
  };
}

// --- The URL as app state ---------------------------------------------------

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}

const currentHash = () => window.location.hash;

/** Show `route`: adds a history entry, so the back button returns to the previous view. */
export function navigate(route: Route) {
  const hash = formatRoute(route);
  if (route.page !== 'circle') rememberInstrument(route.instrument);
  if (hash === window.location.hash) return;
  window.history.pushState(null, '', hash);
  for (const listener of listeners) listener();
}

/** The current route, following the URL (links, back and forward) and `navigate`. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash);
  return useMemo(() => parseRoute(hash, storedInstrument()), [hash]);
}

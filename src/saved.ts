import {
  formatLegacyChordRoute,
  formatRoute,
  type LookupRoute,
  parseRoute,
  parseRouteStrict,
} from "./route";

/**
 * Recent and favourite choices. A choice is stored as its link (`#/Db/major?on=guitar`),
 * so the whole selection (note, chord, instrument, inversion, guitar options) comes
 * back with one click. Links saved before the chord builder (`#/C/dominant7`) are
 * still read and are stored again in the current form.
 */

export const MAX_RECENT = 8;
export const RECENT_KEY = "mtheorizer.recent";
export const FAVORITES_KEY = "mtheorizer.favorites";

/**
 * The stored link of a lookup choice in its current form, or undefined for
 * anything that is not one. A link that is not written exactly the way the app
 * writes it (apart from the older chord names) is rejected.
 */
export function choiceOf(hash: string): string | undefined {
  if (!hash.startsWith("#/")) return undefined;
  const route = parseRouteStrict(hash);
  if (!route || route.page === "circle" || route.page === "identify") return undefined;
  const current = formatRoute(route);
  const legacy = route.page === "chord" ? formatLegacyChordRoute(route) : undefined;
  return current === hash || legacy === hash ? current : undefined;
}

export const hashOf = (route: LookupRoute): string => formatRoute(route);

/** The route a stored link stands for. Only call with values from `choiceOf`. */
export const routeOf = (hash: string): LookupRoute => parseRoute(hash) as LookupRoute;

/** `hash` first, without duplicates, at most `max` long. */
export function addRecent(list: readonly string[], hash: string, max = MAX_RECENT): string[] {
  return [hash, ...list.filter((h) => h !== hash)].slice(0, max);
}

/** Adds `hash` as a favourite, or removes it when it already is one. */
export function toggleFavorite(list: readonly string[], hash: string): string[] {
  return list.includes(hash) ? list.filter((h) => h !== hash) : [...list, hash];
}

/** The saved list under `key`. Anything broken or blocked gives an empty list. */
export function loadList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    for (const item of parsed) {
      const hash = typeof item === "string" ? choiceOf(item) : undefined;
      if (hash) seen.add(hash);
    }
    return [...seen];
  } catch {
    return [];
  }
}

export function saveList(key: string, list: readonly string[]) {
  try {
    if (list.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Not remembering is fine.
  }
}

import { type MissLog, formatKey, missedKeys } from "./theory";

export const MISS_LOG_KEY = "mtheorizer.keyQuizMisses";

/** The stored log. Anything broken or blocked gives an empty one; names that are not keys are dropped. */
export function loadMissLog(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MISS_LOG_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const names = parsed.filter((x): x is string => typeof x === "string");
    const known = new Set(missedKeys(names).map(formatKey));
    return names.filter((name, i) => known.has(name) && names.indexOf(name) === i);
  } catch {
    return [];
  }
}

export function saveMissLog(log: MissLog) {
  try {
    if (log.length === 0) window.localStorage.removeItem(MISS_LOG_KEY);
    else window.localStorage.setItem(MISS_LOG_KEY, JSON.stringify(log));
  } catch {
    // Not remembering is fine.
  }
}

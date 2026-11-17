/** What the person chose: follow the system, or force one theme. */
export type ThemeChoice = "system" | "light" | "dark";

/** The theme that is actually drawn. */
export type Theme = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

export const THEME_LABELS: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * The localStorage key of the choice. The script in index.html reads the same key
 * before the page is drawn, so that the first paint already has the right theme.
 */
export const THEME_STORAGE_KEY = "mtheorizer.theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** The stored choice, or "system" when there is none or storage is unavailable. */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked: the choice then only lasts for this visit.
  }
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Theme {
  if (choice === "light" || choice === "dark") return choice;
  return systemPrefersDark ? "dark" : "light";
}

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Whether the system asks for a dark theme (false where `matchMedia` is missing, as in jsdom). */
export function systemPrefersDark(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

/** Puts the theme on `<html>`, where the stylesheet picks it up. */
export function applyTheme(choice: ThemeChoice): Theme {
  const theme = resolveTheme(choice, systemPrefersDark());
  document.documentElement.dataset.theme = theme;
  return theme;
}

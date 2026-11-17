import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import indexHtml from "../index.html?raw";
import {
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemeChoice,
  readThemeChoice,
  resolveTheme,
  saveThemeChoice,
} from "./theme";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.unstubAllGlobals());

/** A `matchMedia` that answers the dark-scheme query. */
function stubSystem(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && dark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("resolveTheme", () => {
  it.each([
    ["system", false, "light"],
    ["system", true, "dark"],
    ["light", true, "light"],
    ["light", false, "light"],
    ["dark", false, "dark"],
    ["dark", true, "dark"],
  ] as const)("%s with the system dark=%s is %s", (choice, dark, expected) => {
    expect(resolveTheme(choice, dark)).toBe(expected);
  });
});

describe("stored choice", () => {
  it("is the system when nothing is stored", () => {
    expect(readThemeChoice()).toBe("system");
  });

  it.each(THEME_CHOICES)("round-trips %s", (choice) => {
    saveThemeChoice(choice);
    expect(readThemeChoice()).toBe(choice);
  });

  it("stores nothing for the system, so the system is followed from then on", () => {
    saveThemeChoice("dark");
    saveThemeChoice("system");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("ignores a stored value that is not a choice", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(isThemeChoice("purple")).toBe(false);
    expect(readThemeChoice()).toBe("system");
  });

  it("copes with blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readThemeChoice()).toBe("system");
    expect(() => saveThemeChoice("dark")).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("applyTheme", () => {
  it("puts the resolved theme on <html>", () => {
    stubSystem(true);
    expect(applyTheme("system")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(applyTheme("light")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

/**
 * The script in index.html runs before the page is drawn. It cannot import this module,
 * so it repeats the rules, and this test runs it to make sure they have not drifted apart.
 */
describe("the early script in index.html", () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(indexHtml)?.[1];

  const run = () => new Function(script ?? "")();

  it("exists and is not a module", () => {
    expect(script).toBeTruthy();
  });

  it.each([
    [null, true, "dark"],
    [null, false, "light"],
    ["dark", false, "dark"],
    ["light", true, "light"],
    ["purple", true, "dark"],
    ["purple", false, "light"],
  ] as const)("with stored %s and system dark=%s it sets %s", (stored, dark, expected) => {
    stubSystem(dark);
    if (stored) window.localStorage.setItem(THEME_STORAGE_KEY, stored);
    run();
    expect(document.documentElement.dataset.theme).toBe(expected);
    // The same answer as the app gives once it has loaded.
    expect(applyTheme(readThemeChoice())).toBe(expected);
  });

  it("copes with blocked storage", () => {
    stubSystem(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    run();
    expect(document.documentElement.dataset.theme).toBe("dark");
    vi.restoreAllMocks();
  });
});

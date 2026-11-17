import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "../theme";
import { ThemeSwitch } from "./ThemeSwitch";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.unstubAllGlobals());

function stubSystem(dark: boolean) {
  const listeners = new Set<() => void>();
  let matches = dark;
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return {
    change(next: boolean) {
      matches = next;
      listeners.forEach((fn) => fn());
    },
    get listening() {
      return listeners.size;
    },
  };
}

describe("ThemeSwitch", () => {
  it("offers System, Light and Dark, with System first and chosen", () => {
    stubSystem(false);
    render(<ThemeSwitch />);
    const group = screen.getByRole("group", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("follows a dark system", () => {
    stubSystem(true);
    render(<ThemeSwitch />);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("switches the theme and remembers the choice", async () => {
    stubSystem(false);
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await userEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    await userEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("starts from the remembered choice, whatever the system says", () => {
    stubSystem(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeSwitch />);
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows the system when it changes, but only while System is chosen", async () => {
    const system = stubSystem(false);
    render(<ThemeSwitch />);
    expect(system.listening).toBe(1);
    system.change(true);
    expect(document.documentElement.dataset.theme).toBe("dark");

    await userEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(system.listening).toBe(0);
    system.change(true);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

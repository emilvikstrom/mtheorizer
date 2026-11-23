import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { storedNeck } from "../neck";
import { formatRoute, parseRoute } from "../route";
import { formatTune, parseTune } from "../theory";
import { Settings } from "./Settings";

const strings = () =>
  screen.getAllByRole("listitem").filter((li) => li.className === "settings__string");
const note = (n: number) => screen.getByRole("combobox", { name: `String ${n} note` });
const octave = (n: number) => screen.getByRole("combobox", { name: `String ${n} octave` });

describe("the settings page", () => {
  it("starts on the guitar in standard tuning", () => {
    render(<Settings />);
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("guitar");
    expect(strings()).toHaveLength(6);
    expect(note(1)).toHaveValue("E");
    expect(octave(1)).toHaveValue("4");
    expect(note(6)).toHaveValue("E");
    expect(octave(6)).toHaveValue("2");
    expect(screen.getByText("Low to high: E A D G B E")).toBeInTheDocument();
  });

  it("fills the strings in from a preset and remembers it", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "ukulele");
    expect(strings()).toHaveLength(4);
    expect(storedNeck()).toEqual({ instrument: "ukulele" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "guitarOpenG");
    expect(screen.getByText("Low to high: D G D G B D")).toBeInTheDocument();
    // Not one of the built-in instruments, so it carries its strings.
    expect(storedNeck().instrument).toBe("custom");
    expect(formatTune(storedNeck().strings ?? [])).toBe("D4,B3,G3,D3,G2,D2");
  });

  it("keeps the short name for a built-in tuning, however it was reached", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.selectOptions(note(6), "D");
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("guitarDropD");
    expect(storedNeck()).toEqual({ instrument: "guitar", tuning: "dropD" });
  });

  it("adds and removes strings", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole("button", { name: "Add a string" }));
    expect(strings()).toHaveLength(7);
    // A fourth below the low E: a low B, as on a seven-string guitar.
    expect(note(7)).toHaveValue("B");
    expect(octave(7)).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveValue("guitar7");
    await user.click(screen.getByRole("button", { name: "Add a string" }));
    expect(screen.getByRole("button", { name: "Add a string" })).toBeDisabled();
    expect(strings()).toHaveLength(8);

    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: "Remove a string" }));
    }
    expect(strings()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Remove a string" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Preset" })).toHaveDisplayValue(/^Custom/);
    expect(storedNeck().instrument).toBe("custom");
  });

  it("tunes one string at a time, spelled as chosen", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.selectOptions(note(3), "F♯");
    await user.selectOptions(octave(3), "4");
    expect(storedNeck().instrument).toBe("custom");
    expect(formatTune(storedNeck().strings ?? [])).toBe("E4,B3,Fs4,D3,A2,E2");
    await user.selectOptions(note(3), "G♭");
    expect(formatTune(storedNeck().strings ?? [])).toBe("E4,B3,Gb4,D3,A2,E2");
  });

  it("holds the neck left-handed", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole("radio", { name: "Left-handed" }));
    expect(storedNeck()).toEqual({ instrument: "guitar", left: true });
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "bass");
    expect(storedNeck()).toEqual({ instrument: "bass", left: true });
  });

  it("lists the presets by instrument", () => {
    render(<Settings />);
    const groups = screen.getAllByRole("group").filter((g) => g.tagName === "OPTGROUP");
    expect(groups.map((g) => g.getAttribute("label"))).toEqual([
      "Guitar",
      "Ukulele",
      "Bass",
      "Other",
    ]);
    expect(within(groups[0]!).getAllByRole("option").length).toBeGreaterThan(5);
  });
});

describe("a custom neck in the app", () => {
  it("opens from a link and puts its strings back in the link", () => {
    const hash = "#/C/major?on=custom&tune=D4,A3,F3,C3,G2,C2";
    const route = parseRoute(hash);
    expect(route).toMatchObject({ instrument: "custom" });
    const open = route.page === "chord" ? route.strings : undefined;
    expect(formatTune(open ?? [])).toBe("D4,A3,F3,C3,G2,C2");
    expect(formatRoute(route)).toBe(hash);
    // An unreadable list is the default tuning, and is not written back.
    expect(formatRoute(parseRoute("#/C/major?on=custom&tune=nonsense"))).toBe(
      "#/C/major?on=custom",
    );
  });

  it("shows the strings of the setup on the neck and in the link", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/C/major?on=piano";
    const { container } = render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "guitar7");
    await user.click(screen.getByRole("tab", { name: "Chords" }));
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    expect(container.querySelectorAll(".fretboard__string")).toHaveLength(7);
    expect(window.location.hash).toBe(
      `#/C/major?on=custom&tune=${formatTune(parseTune("E4,B3,G3,D3,A2,E2,B1") ?? [])}`,
    );
    expect(screen.getByText(/7-string guitar: B E A D G B E/)).toBeInTheDocument();
  });

  it("finds chords on the strings of the setup in 'What chord is this?'", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/identify";
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "bass5");
    await user.click(screen.getByRole("tab", { name: "What chord is this?" }));
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    expect(window.location.hash).toBe("#/identify?on=bass5");
    expect(screen.getByText(/5-string bass, BEADG: B E A D G/)).toBeInTheDocument();
    expect(document.querySelectorAll('.fret-picker__cell[data-fret="0"]')).toHaveLength(5);
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Key, key, note } from "../theory";
import { CircleOfFifthsView } from "./CircleOfFifthsView";
import { ModeMap } from "./ModeMap";

afterEach(() => {
  window.location.hash = "";
});

const table = () => screen.getByRole("table");
const cell = (name: RegExp) => within(table()).getByRole("link", { name });

function Harness() {
  const [selected, setSelected] = useState<Key>(key(note("C"), "major"));
  return <CircleOfFifthsView value={selected} onChange={setSelected} onOpenChord={vi.fn()} />;
}

describe("ModeMap", () => {
  it("has a row per mode, brightest first, and a column per tonic", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    const rows = within(table()).getAllByRole("row");
    expect(rows).toHaveLength(8);
    expect(
      within(table())
        .getAllByRole("rowheader")
        .map((h) => h.textContent),
    ).toEqual([
      "Lydian",
      "Major (Ionian)",
      "Mixolydian",
      "Dorian",
      "Natural minor (Aeolian)",
      "Phrygian",
      "Locrian",
    ]);
    expect(
      within(table())
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual([
      "Mode",
      "C",
      "C♯/D♭",
      "D",
      "D♯/E♭",
      "E",
      "F",
      "F♯/G♭",
      "G",
      "G♯/A♭",
      "A",
      "A♯/B♭",
      "B",
    ]);
    expect(within(table()).getAllByRole("link")).toHaveLength(84);
  });

  it("shows which major key each mode shares its notes with", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    const text = (name: RegExp) => cell(name).textContent;
    expect(text(/^C lydian:/)).toBe("G1♯");
    expect(text(/^C major:/)).toBe("C0");
    expect(text(/^C mixolydian:/)).toBe("F1♭");
    expect(text(/^C dorian:/)).toBe("B♭2♭");
    expect(text(/^C natural minor:/)).toBe("E♭3♭");
    expect(text(/^C phrygian:/)).toBe("A♭4♭");
    expect(text(/^C locrian:/)).toBe("D♭5♭");
  });

  it("describes each cell in words for a screen reader", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    expect(cell(/^C lydian:/)).toHaveAccessibleName(
      "C lydian: same notes as G major, 1 sharp. Open scale",
    );
    expect(cell(/^C major:/)).toHaveAccessibleName(
      "C major: same notes as C major, no sharps or flats. Open scale",
    );
    expect(cell(/^F mixolydian:/)).toHaveAccessibleName(
      "F mixolydian: same notes as B♭ major, 2 flats. Open scale",
    );
  });

  it("spells the tonic the way the scale picker does", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    expect(cell(/^D♭ lydian:/)).toHaveTextContent("A♭4♭");
    expect(cell(/^C♯ dorian:/)).toHaveTextContent("B5♯");
    expect(cell(/^D♯ phrygian:/)).toHaveTextContent("B5♯");
    expect(cell(/^B lydian:/)).toHaveTextContent("F♯6♯");
  });

  it("links every cell to its scale", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    expect(cell(/^C lydian:/)).toHaveAttribute("href", "#/C/scale/lydian?on=piano");
    expect(cell(/^C♯ dorian:/)).toHaveAttribute("href", "#/Cs/scale/dorian?on=piano");
    expect(cell(/^E♭ natural minor:/)).toHaveAttribute("href", "#/Eb/scale/naturalMinor?on=piano");
    const hrefs = within(table())
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(84);
  });

  it("opens the scale in the scale tab when a cell is clicked", async () => {
    const user = userEvent.setup();
    render(<ModeMap selected={key(note("C"), "major")} />);
    await user.click(cell(/^C lydian:/));
    expect(window.location.hash).toBe("#/C/scale/lydian?on=piano");
  });

  it("marks the column of the selected tonic, with text and not only colour", () => {
    const { rerender } = render(<ModeMap selected={key(note("C"), "major")} />);
    const current = () =>
      within(table())
        .getAllByRole("columnheader")
        .filter((h) => h.getAttribute("aria-current") === "true")
        .map((h) => h.textContent);
    expect(current()).toEqual(["C"]);

    rerender(<ModeMap selected={key(note("A"), "minor")} />);
    expect(current()).toEqual(["A"]);

    rerender(<ModeMap selected={key(note("D", -1), "major")} />);
    expect(current()).toEqual(["C♯/D♭"]);
  });

  it("sits under the circle and follows the selected key", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Modes on the circle" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "E♭ major" }));
    expect(
      within(table())
        .getAllByRole("columnheader")
        .filter((h) => h.getAttribute("aria-current") === "true")
        .map((h) => h.textContent),
    ).toEqual(["D♯/E♭"]);
  });

  it("has a scroll region that the keyboard can reach", () => {
    render(<ModeMap selected={key(note("C"), "major")} />);
    expect(screen.getByRole("region", { name: /Mode map/ })).toHaveAttribute("tabindex", "0");
  });
});

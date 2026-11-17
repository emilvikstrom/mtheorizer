import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { key, note } from "../theory";
import { PivotChords } from "./PivotChords";

const cMajor = key(note("C"), "major");

describe("PivotChords", () => {
  it("starts on the dominant key and lists C, Em, G and Am as pivots in C major → G major", () => {
    render(<PivotChords value={cMajor} onOpenChord={() => {}} />);
    expect(screen.getByRole("combobox", { name: /modulate to/i })).toHaveValue("G major");
    const list = screen.getByRole("list", { name: "Pivot chords, C major to G major" });
    const names = within(list)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["I → IVC", "iii → viEm", "V → IG", "vi → iiAm"]);
  });

  it("shows a route with keys in between when the target is far away", async () => {
    render(<PivotChords value={cMajor} onOpenChord={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "A major");
    expect(screen.getByText(/3 steps apart/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Route between the keys" })).toBeInTheDocument();
    expect(screen.getAllByRole("list", { name: /^Pivot chords/ })).toHaveLength(3);
  });

  it("says when the keys have no chord in common", async () => {
    render(<PivotChords value={cMajor} onOpenChord={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "C major");
    expect(screen.getByText(/Pick a different key/)).toBeInTheDocument();
  });

  it("opens a pivot chord in the chord view", async () => {
    const onOpenChord = vi.fn();
    render(<PivotChords value={cMajor} onOpenChord={onOpenChord} />);
    await userEvent.click(screen.getByRole("button", { name: /Open Am in Chords/ }));
    expect(onOpenChord).toHaveBeenCalledWith(note("A"), "minor");
  });
});

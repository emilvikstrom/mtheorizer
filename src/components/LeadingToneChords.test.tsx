import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { key, note } from "../theory";
import { LeadingToneChords } from "./LeadingToneChords";

const opened = vi.fn();

describe("secondary leading-tone chords", () => {
  const list = () => screen.getByRole("list", { name: "Secondary leading-tone chords" });
  const column = (selector: string) =>
    within(list())
      .getAllByRole("listitem")
      .map((item) => item.querySelector(selector)?.textContent);

  it("shows C major's leading-tone chords with the chord each one leads to", () => {
    render(<LeadingToneChords value={key(note("C"), "major")} onOpenChord={opened} />);
    expect(column(".triad__roman")).toEqual([
      "vii°7/ii",
      "vii°7/iii",
      "vii°7/IV",
      "vii°7/V",
      "vii°7/vi",
    ]);
    expect(column(".triad__symbol")).toEqual(["C♯°7", "D♯°7", "E°7", "F♯°7", "G♯°7"]);
    expect(column(".triad__function")).toEqual(["→ Dm", "→ Em", "→ F", "→ G", "→ Am"]);
  });

  it("writes out the notes from outside the key, not only by styling", () => {
    render(<LeadingToneChords value={key(note("C"), "major")} onOpenChord={opened} />);
    expect(column(".triad__foreign")).toEqual(["● C♯ B♭", "● D♯ F♯", "● B♭ D♭", "● F♯ E♭", "● G♯"]);
    expect(
      screen.getByRole("button", {
        name: "Open F♯°7 in Chords, vii°7/V, resolves to G, with F♯ and E♭ from outside the key",
      }),
    ).toBeInTheDocument();
  });

  it("follows the key's spelling", async () => {
    render(<LeadingToneChords value={key(note("F", 1), "major")} onOpenChord={opened} />);
    expect(column(".triad__symbol")).toEqual(["F𝄪°7", "G𝄪°7", "A♯°7", "B♯°7", "C𝄪°7"]);
  });

  it("switches to half-diminished sevenths before major chords only", async () => {
    const user = userEvent.setup();
    render(<LeadingToneChords value={key(note("C"), "major")} onOpenChord={opened} />);
    const toggle = screen.getByRole("button", { name: "Half-diminished ø7" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(column(".triad__roman")).toEqual([
      "vii°7/ii",
      "vii°7/iii",
      "viiø7/IV",
      "viiø7/V",
      "vii°7/vi",
    ]);
    expect(column(".triad__symbol")).toEqual(["C♯°7", "D♯°7", "Em7♭5", "F♯m7♭5", "G♯°7"]);
    await user.click(screen.getByRole("button", { name: "Diminished °7" }));
    expect(column(".triad__symbol")).toEqual(["C♯°7", "D♯°7", "E°7", "F♯°7", "G♯°7"]);
  });

  it("opens a half-diminished leading-tone chord as a half-diminished seventh", async () => {
    const user = userEvent.setup();
    render(<LeadingToneChords value={key(note("C"), "major")} onOpenChord={opened} />);
    await user.click(screen.getByRole("button", { name: "Half-diminished ø7" }));
    await user.click(
      screen.getByRole("button", {
        name: "Open F♯m7♭5 in Chords, viiø7/V, resolves to G, with F♯ from outside the key",
      }),
    );
    expect(opened).toHaveBeenLastCalledWith(note("F", 1), "halfDiminished7");
  });

  it("opens a leading-tone chord as a diminished seventh", async () => {
    const user = userEvent.setup();
    render(<LeadingToneChords value={key(note("C"), "major")} onOpenChord={opened} />);
    await user.click(
      screen.getByRole("button", {
        name: "Open F♯°7 in Chords, vii°7/V, resolves to G, with F♯ and E♭ from outside the key",
      }),
    );
    expect(opened).toHaveBeenLastCalledWith(note("F", 1), "diminished7");
  });
});

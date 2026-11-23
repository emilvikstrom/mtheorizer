import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { key, note } from "../theory";
import { ChromaticChords } from "./ChromaticChords";

const cMajor = key(note("C"), "major");

describe("ChromaticChords", () => {
  it("lists the four chords with their notes from the bass up", () => {
    render(<ChromaticChords value={cMajor} onOpenChord={() => {}} />);
    const items = within(screen.getByRole("list", { name: "Chromatic chords" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Neapolitan sixth");
    expect(items[0]).toHaveTextContent("D♭/F");
    expect(items[0]).toHaveTextContent("F–A♭–D♭");
    expect(items[3]).toHaveTextContent("A♭–C–E♭–F♯");
  });

  it("shows the German sixth next to the A♭7 it sounds like", () => {
    render(<ChromaticChords value={cMajor} onOpenChord={() => {}} />);
    const german = screen.getByText("German sixth").closest("li") as HTMLElement;
    expect(german).toHaveTextContent("Sounds like A♭7");
    expect(german).toHaveTextContent("F♯ is spelled G♭");
  });

  it("opens the Neapolitan triad and the dominant seventh in the chord view", async () => {
    const onOpenChord = vi.fn();
    render(<ChromaticChords value={cMajor} onOpenChord={onOpenChord} />);
    await userEvent.click(screen.getByRole("button", { name: "Open D♭ in Chords" }));
    expect(onOpenChord).toHaveBeenLastCalledWith(note("D", -1), "major");
    await userEvent.click(screen.getByRole("button", { name: "Open A♭7 in Chords" }));
    expect(onOpenChord).toHaveBeenLastCalledWith(note("A", -1), "dominant7");
  });
});

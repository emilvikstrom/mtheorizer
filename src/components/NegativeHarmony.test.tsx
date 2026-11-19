import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { key, note } from "../theory";
import { NegativeHarmony } from "./NegativeHarmony";

const cMajor = key(note("C"), "major");

describe("NegativeHarmony", () => {
  it("is marked as experimental and one convention among several", () => {
    render(<NegativeHarmony value={cMajor} onOpenChord={() => {}} />);
    expect(screen.getByText("Experimental")).toBeInTheDocument();
    expect(screen.getByText(/one convention among several/)).toBeInTheDocument();
  });

  it("lists each diatonic triad of C major with its negative", () => {
    render(<NegativeHarmony value={cMajor} onOpenChord={() => {}} />);
    const items = within(screen.getByRole("list", { name: "Negative chords" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("C → Cm");
    expect(items[0]).toHaveTextContent("C–E–G → G–E♭–C");
    expect(items[4]).toHaveTextContent("G → Fm");
  });

  it("shows G7 becoming Fm6 with its other name when seventh chords are chosen", async () => {
    render(<NegativeHarmony value={cMajor} onOpenChord={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Seventh chords" }));
    const g7 = screen.getByText("G7").closest("li") as HTMLElement;
    expect(g7).toHaveTextContent("Fm6");
    expect(g7).toHaveTextContent("Also reads as Dm7♭5");
  });

  it("opens the negative chord in the chord view", async () => {
    const onOpenChord = vi.fn();
    render(<NegativeHarmony value={cMajor} onOpenChord={onOpenChord} />);
    await userEvent.click(screen.getByRole("button", { name: "Open Cm in Chords & scales" }));
    expect(onOpenChord).toHaveBeenLastCalledWith(note("C"), "minor");
  });
});

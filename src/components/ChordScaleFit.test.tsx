import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChordsThatFit, ScalesThatFit } from "./ChordScaleFit";
import { buildChord, formatNote, note, scaleOnPitchClass } from "../theory";

describe("ScalesThatFit", () => {
  it("lists the scales over C7, each starting on the root", () => {
    render(<ScalesThatFit chord={buildChord(note("C"), "dominant7")} onOpen={() => {}} />);
    expect(screen.getByRole("heading", { name: "Scales that fit" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["C Mixolydian", "C Lydian dominant", "C Altered"]);
  });

  it("starts on the chord's own spelling of the root", () => {
    render(<ScalesThatFit chord={buildChord(note("B", -1), "minor7")} onOpen={() => {}} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "B♭ Dorian",
      "B♭ Natural minor (Aeolian)",
    ]);
  });

  it("opens the chosen scale", async () => {
    const onOpen = vi.fn();
    render(<ScalesThatFit chord={buildChord(note("G"), "dominant7")} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "G Altered" }));
    expect(onOpen).toHaveBeenCalledWith("altered");
  });

  it("renders nothing when no scale covers the chord", () => {
    const { container } = render(
      <ScalesThatFit chord={buildChord(note("C"), "diminished7")} onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChordsThatFit", () => {
  it("shows the triad and the seventh chord on every degree of C major", () => {
    render(<ChordsThatFit scale={scaleOnPitchClass(0, "major")} onOpen={() => {}} />);
    expect(screen.getByRole("heading", { name: "Chords that fit" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(7);
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole("button")
        .map((b) => b.textContent);
    expect(cells(rows[0] as HTMLElement)).toEqual(["C", "Cmaj7"]);
    expect(cells(rows[4] as HTMLElement)).toEqual(["G", "G7"]);
    expect(cells(rows[6] as HTMLElement)).toEqual(["B°", "Bm7♭5"]);
  });

  it("opens a chord with the root spelled as the scale spells it", async () => {
    const onOpen = vi.fn();
    render(<ChordsThatFit scale={scaleOnPitchClass(3, "major")} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Fm7" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(formatNote(onOpen.mock.calls[0]?.[0])).toBe("F");
    expect(onOpen.mock.calls[0]?.[1]).toBe("minor7");
  });

  it("renders nothing for the pentatonic and blues scales", () => {
    const { container } = render(
      <ChordsThatFit scale={scaleOnPitchClass(0, "majorPentatonic")} onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

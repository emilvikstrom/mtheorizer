import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildChord, note } from "../theory";
import { SameNotesAsChord, SameNotesAsScale } from "./SameNotes";

describe("SameNotesAsChord", () => {
  it("lists the chords that use the same keys and opens one", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SameNotesAsChord chord={buildChord(note("C"), "diminished7")} onOpen={onOpen} />);

    expect(screen.getByRole("heading", { name: "Same notes as" })).toBeInTheDocument();
    expect(screen.getByText(/C°7 = D♯°7 = F♯°7 = A°7/)).toBeInTheDocument();
    expect(screen.getByText(/spelling is not/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A°7 \(A–C–E♭–G♭\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /D♯°7/ }));
    expect(onOpen).toHaveBeenCalledWith(note("D", 1));
  });

  it("covers the augmented triad", () => {
    render(<SameNotesAsChord chord={buildChord(note("C"), "augmented")} onOpen={() => {}} />);
    expect(screen.getByText(/C\+ = E\+ = A♭\+/)).toBeInTheDocument();
  });

  it("renders nothing for a chord with no symmetry", () => {
    const { container } = render(
      <SameNotesAsChord chord={buildChord(note("C"), "major")} onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SameNotesAsScale", () => {
  it("lists the other tonics of the whole-tone scale", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<SameNotesAsScale tonic={note("C")} scaleId="wholeTone" onOpen={onOpen} />);

    expect(screen.getByText(/only has 6 different sets of keys/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^D whole tone/ }));
    expect(onOpen).toHaveBeenCalledWith(note("D"));
  });

  it("renders nothing for an ordinary scale", () => {
    const { container } = render(
      <SameNotesAsScale tonic={note("C")} scaleId="major" onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

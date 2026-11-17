import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TritoneSubstitute } from "./TritoneSubstitute";
import { buildChord, formatNote, note } from "../theory";

describe("TritoneSubstitute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains G7 → D♭7 with the shared tritone spelled out", () => {
    render(<TritoneSubstitute chord={buildChord(note("G"), "dominant7")} onOpen={() => {}} />);
    expect(screen.getByRole("heading", { name: "Tritone substitute" })).toBeInTheDocument();
    const text = screen.getByText(/can stand in for G7/);
    expect(text).toHaveTextContent("D♭7");
    expect(text).toHaveTextContent("B–F");
    expect(text).toHaveTextContent("F–C♭");
  });

  it("opens the substitute on its own root", async () => {
    const onOpen = vi.fn();
    render(<TritoneSubstitute chord={buildChord(note("G"), "dominant7")} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Open D♭7" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(formatNote(onOpen.mock.calls[0]?.[0])).toBe("D♭");
  });

  it("offers to play both chords one after the other when Web Audio exists", () => {
    vi.stubGlobal("AudioContext", class {});
    render(<TritoneSubstitute chord={buildChord(note("C"), "dominant7")} onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: "Play C7 then F♯7" })).toBeInTheDocument();
  });

  it("leaves out the play button without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    render(<TritoneSubstitute chord={buildChord(note("C"), "dominant7")} onOpen={() => {}} />);
    expect(screen.queryByRole("button", { name: /^Play/ })).not.toBeInTheDocument();
  });

  it("shows nothing for chords that are not a plain dominant seventh", () => {
    const { container, rerender } = render(
      <TritoneSubstitute chord={buildChord(note("C"), "major7")} onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<TritoneSubstitute chord={buildChord(note("C"), "dominant9")} onOpen={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

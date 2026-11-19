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

  it("shows nothing for chords that are not a dominant seventh or one of its variants", () => {
    const { container, rerender } = render(
      <TritoneSubstitute chord={buildChord(note("C"), "major7")} onOpen={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<TritoneSubstitute chord={buildChord(note("C"), "major9")} onOpen={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains G13 → D♭7♯11 with the keys the two chords share", () => {
    render(<TritoneSubstitute chord={buildChord(note("G"), "dominant13")} onOpen={() => {}} />);
    const text = screen.getByText(/can stand in for G13/);
    expect(text).toHaveTextContent("D♭7♯11");
    expect(text).toHaveTextContent("G–B–F");
    expect(text).toHaveTextContent("F–C♭–G");
  });

  it("opens the substitute of a ninth and plays both chords", async () => {
    vi.stubGlobal("AudioContext", class {});
    const onOpen = vi.fn();
    render(<TritoneSubstitute chord={buildChord(note("G"), "dominant9")} onOpen={onOpen} />);
    expect(screen.getByRole("button", { name: "Play G9 then D♭9" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open D♭9" }));
    expect(formatNote(onOpen.mock.calls[0]?.[0])).toBe("D♭");
  });

  it("says so when the suspended chords have no key in common", () => {
    render(<TritoneSubstitute chord={buildChord(note("G"), "dominant7Sus4")} onOpen={() => {}} />);
    const text = screen.getByText(/can stand in for G7sus4/);
    expect(text).toHaveTextContent("C♯7sus4");
    expect(text).toHaveTextContent("no key in common");
  });
});

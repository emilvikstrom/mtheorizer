import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type BuilderChord, type Tonality, note, tonality } from "../theory";
import { ProgressionBuilder } from "./ProgressionBuilder";

const audio = vi.hoisted(() => ({ play: vi.fn(() => 4), stop: vi.fn() }));
vi.mock("../audio/playback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audio/playback")>()),
  audioSupported: () => true,
  playNotes: audio.play,
  stopPlayback: audio.stop,
}));

beforeEach(() => {
  audio.play.mockClear();
  audio.stop.mockClear();
});

const c = tonality(note("C"), "major");
const triad = (degree: number): BuilderChord => ({ degree, size: "triad" });

function setup(steps: readonly BuilderChord[], onChange = vi.fn(), value: Tonality = c) {
  render(
    <ProgressionBuilder
      value={value}
      steps={steps}
      onChange={onChange}
      onOpenChord={() => {}}
      onBack={() => {}}
    />,
  );
  return onChange;
}

describe("ProgressionBuilder", () => {
  it("starts empty and says so", () => {
    setup([]);
    expect(screen.getByText(/No chords yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Play your progression/ })).toBeNull();
  });

  it("adds the key's chords from the palette", async () => {
    const onChange = setup([triad(1)]);
    await userEvent.click(screen.getByRole("button", { name: "Add G (V)" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1), triad(5)]);
    await userEvent.click(screen.getByRole("radio", { name: "Sevenths" }));
    await userEvent.click(screen.getByRole("button", { name: "Add G7 (V7)" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1), { degree: 5, size: "seventh" }]);
  });

  it("shows step numbers and tones for each chord", () => {
    setup([triad(1), triad(5), triad(6), triad(4)]);
    const list = screen.getByRole("list", { name: "Chords of your progression" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[2]).toHaveTextContent("vi");
    expect(items[2]).toHaveTextContent("Am");
    expect(items[2]).toHaveTextContent("A C E");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("I–V–vi–IV");
  });

  it("moves chords with buttons, not only by dragging", async () => {
    const onChange = setup([triad(1), triad(5), triad(6)]);
    await userEvent.click(screen.getByRole("button", { name: "Move Am, chord 3 of 3 earlier" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1), triad(6), triad(5)]);
    await userEvent.click(screen.getByRole("button", { name: "Move C, chord 1 of 3 later" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(5), triad(1), triad(6)]);
    expect(screen.getByRole("button", { name: "Move C, chord 1 of 3 earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Am, chord 3 of 3 later" })).toBeDisabled();
  });

  it("removes a chord and clears them all", async () => {
    const onChange = setup([triad(1), triad(5), triad(6)]);
    await userEvent.click(screen.getByRole("button", { name: "Remove G, chord 2 of 3" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1), triad(6)]);
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenLastCalledWith(c, []);
  });

  it("changes the tonality and keeps the chords", async () => {
    const onChange = setup([triad(1), triad(5)]);
    await userEvent.click(screen.getByRole("radio", { name: "Minor" }));
    expect(onChange).toHaveBeenLastCalledWith(tonality(note("C"), "naturalMinor"), [
      triad(1),
      triad(5),
    ]);
    await userEvent.click(screen.getByRole("radio", { name: "Dorian" }));
    expect(onChange).toHaveBeenLastCalledWith(tonality(note("C"), "dorian"), [triad(1), triad(5)]);
  });

  it("offers a mode's chords and marks the ones with its colour", () => {
    setup([], vi.fn(), tonality(note("D"), "dorian"));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Build a progression in D dorian",
    );
    expect(screen.getByText(/D dorian scale: D E F G A B C/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add G (IV), holds the dorian colour" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add C (♭VII)" })).toBeInTheDocument();
    expect(screen.getByText(/natural minor: ♮6/)).toBeInTheDocument();
  });

  it("suggests where to start, then what could follow the last chord", async () => {
    const onChange = setup([]);
    expect(screen.getByRole("heading", { name: "Where to start" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add C (I) next" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1)]);
  });

  it("suggests the strong moves after V", async () => {
    const onChange = setup([triad(1), triad(5)]);
    expect(screen.getByRole("heading", { name: "What could come after G?" })).toBeInTheDocument();
    const ideas = screen.getAllByRole("button", { name: / next$/ }).map((b) => b.textContent);
    expect(ideas[0]).toBe("IC");
    expect(ideas).toContain("viAm");
    await userEvent.click(screen.getByRole("button", { name: "Add Am (vi) next" }));
    expect(onChange).toHaveBeenLastCalledWith(c, [triad(1), triad(5), triad(6)]);
  });

  it("plays the progression once, and again while Loop is on", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      setup([triad(1), triad(5)]);
      await userEvent.click(screen.getByRole("button", { name: "Loop" }));
      await userEvent.click(screen.getByRole("button", { name: /Play your progression/ }));
      expect(audio.play).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(4100);
      expect(audio.play).toHaveBeenCalledTimes(2);
      await userEvent.click(screen.getByRole("button", { name: "Stop your progression" }));
      expect(audio.stop).toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(10000);
      expect(audio.play).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("plays once without Loop", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      setup([triad(1), triad(5)]);
      await userEvent.click(screen.getByRole("button", { name: /Play your progression/ }));
      await vi.advanceTimersByTimeAsync(10000);
      expect(audio.play).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByRole("button", { name: /Play your progression/ }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

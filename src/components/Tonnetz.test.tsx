import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { note } from "../theory";
import { Tonnetz } from "./Tonnetz";

const audio = vi.hoisted(() => ({ play: vi.fn(() => 0), stop: vi.fn() }));
vi.mock("../audio/playback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audio/playback")>()),
  audioSupported: () => true,
  playNotes: audio.play,
  stopPlayback: audio.stop,
}));

beforeEach(() => {
  audio.play.mockClear();
});

const cMajor = { root: note("C"), mode: "major" } as const;

describe("Tonnetz", () => {
  it("shows the selected triad and its notes", () => {
    render(<Tonnetz triad={cMajor} onChange={() => {}} onOpenChord={() => {}} />);
    expect(screen.getByText("C major")).toBeInTheDocument();
    expect(screen.getByText(/C E G/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tonnetz around C major" })).toBeInTheDocument();
  });

  it("offers P, L and R as buttons that name the neighbouring triads", () => {
    render(<Tonnetz triad={cMajor} onChange={() => {}} onOpenChord={() => {}} />);
    expect(screen.getByRole("button", { name: "P, parallel: C minor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "L, leading tone: E minor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R, relative: A minor" })).toBeInTheDocument();
  });

  it("moves to a neighbour on a click and on the keyboard", async () => {
    const onChange = vi.fn();
    render(<Tonnetz triad={cMajor} onChange={onChange} onOpenChord={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /^L, leading tone/ }));
    expect(onChange).toHaveBeenLastCalledWith({ root: note("E"), mode: "minor" });
    screen.getByRole("button", { name: /^R, relative/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ root: note("A"), mode: "minor" });
  });

  it("names the neighbours of a minor triad, spelled the simple way", () => {
    render(
      <Tonnetz
        triad={{ root: note("A", -1), mode: "minor" }}
        onChange={() => {}}
        onOpenChord={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "L, leading tone: E major" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "R, relative: B major" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P, parallel: A♭ major" })).toBeInTheDocument();
  });

  it("opens the triad as a chord", async () => {
    const onOpenChord = vi.fn();
    render(
      <Tonnetz
        triad={{ root: note("E"), mode: "minor" }}
        onChange={() => {}}
        onOpenChord={onOpenChord}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open Em as a chord" }));
    expect(onOpenChord).toHaveBeenCalledWith(note("E"), "minor");
  });

  it("plays the chord you move to when asked, and stays quiet otherwise", async () => {
    render(<Tonnetz triad={cMajor} onChange={() => {}} onOpenChord={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /^P, parallel/ }));
    expect(audio.play).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("checkbox", { name: /play each chord/i }));
    await userEvent.click(screen.getByRole("button", { name: /^P, parallel/ }));
    expect(audio.play).toHaveBeenCalledTimes(1);
    const plan = audio.play.mock.calls[0] as unknown as [{ midi: number }[]];
    // C minor: C, E♭, G.
    expect(plan[0].map((n) => n.midi % 12).sort((a, b) => a - b)).toEqual([0, 3, 7]);
  });

  it("labels the corners of the grid with spelled notes", () => {
    const { container } = render(
      <Tonnetz
        triad={{ root: note("E", -1), mode: "major" }}
        onChange={() => {}}
        onOpenChord={() => {}}
      />,
    );
    const labels = Array.from(container.querySelectorAll(".tonnetz__note text")).map(
      (el) => el.textContent,
    );
    // E♭ at the middle, B♭ a fifth to its right, G a major third up and to the right.
    expect(labels).toContain("E♭");
    expect(labels).toContain("B♭");
    expect(labels).toContain("G");
    expect(labels).not.toContain("D♯");
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIFTH_CIRCLE_VOICES, planFifthCircle } from "../audio/fifthCircle";
import { FifthCircleComma } from "./FifthCircleComma";

// Sound is not played in tests; what the section asks for is what is checked.
const audio = vi.hoisted(() => ({ play: vi.fn(() => 0), stop: vi.fn(), supported: true }));
vi.mock("../audio/playback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../audio/playback")>()),
  audioSupported: () => audio.supported,
  playNotes: audio.play,
  stopPlayback: audio.stop,
}));

beforeEach(() => {
  audio.play.mockClear();
  audio.stop.mockClear();
  audio.supported = true;
});

const section = () => screen.getByText("The circle that doesn't close").closest("details");

describe("FifthCircleComma", () => {
  it("is a collapsed section with a summary", () => {
    render(<FifthCircleComma />);
    expect(section()).not.toHaveAttribute("open");
    expect(screen.getByText("The circle that doesn't close").tagName).toBe("SUMMARY");
  });

  it("explains the comma with the numbers from the theory", () => {
    render(<FifthCircleComma />);
    const text = section()?.textContent ?? "";
    expect(text).toContain("701.96");
    expect(text).toContain("700 cents");
    expect(text).toContain("23.46");
    expect(text).toContain("Pythagorean comma");
    expect(text).toMatch(/beat about 3\.6 times a second/);
  });

  it("shows the twelve fifths from C in a table with 13 rows", () => {
    render(<FifthCircleComma />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(14);
    const cells = (i: number) =>
      Array.from(rows[i]?.querySelectorAll("th, td") ?? []).map((c) => c.textContent);
    expect(cells(1)).toEqual(["0", "C", "0.00", "0.00", "0.00"]);
    expect(cells(2)).toEqual(["1", "G", "701.96", "700.00", "1.96"]);
    expect(cells(13)).toEqual(["12", "B♯", "23.46", "0.00", "23.46"]);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Fifths", "Note", "Pure", "Equal", "Drift"]);
  });

  it("has a keyboard-reachable scrolling region for the table", () => {
    render(<FifthCircleComma />);
    const region = screen.getByRole("region", { name: /twelve fifths from c/i });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("plays the pure fifths", async () => {
    render(<FifthCircleComma />);
    await userEvent.click(screen.getByRole("button", { name: "Play twelve pure fifths" }));
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.play).toHaveBeenCalledWith(
      planFifthCircle("pure", 60),
      undefined,
      FIFTH_CIRCLE_VOICES,
    );
  });

  it("plays the equal-tempered fifths", async () => {
    render(<FifthCircleComma />);
    await userEvent.click(
      screen.getByRole("button", { name: "Play twelve equal-tempered fifths" }),
    );
    expect(audio.play).toHaveBeenCalledWith(
      planFifthCircle("equal", 60),
      undefined,
      FIFTH_CIRCLE_VOICES,
    );
  });

  it("cuts off what is playing before it starts the next, and has a stop button", async () => {
    render(<FifthCircleComma />);
    await userEvent.click(screen.getByRole("button", { name: "Play twelve pure fifths" }));
    expect(audio.stop).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(audio.stop).toHaveBeenCalledTimes(2);
  });

  it("stops the sound when the section is closed and when the view is left", () => {
    const { unmount } = render(<FifthCircleComma />);
    const details = section() as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(audio.stop).not.toHaveBeenCalled();
    details.open = false;
    fireEvent(details, new Event("toggle"));
    expect(audio.stop).toHaveBeenCalledTimes(1);
    unmount();
    expect(audio.stop).toHaveBeenCalledTimes(2);
  });

  it("hides the listen buttons without Web Audio but keeps the explanation and table", () => {
    audio.supported = false;
    render(<FifthCircleComma />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(section()?.textContent).toContain("Pythagorean comma");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChordFinder } from "./ChordFinder";
import { rememberNeck } from "../neck";
import type { IdentifyRoute } from "../route";
import type { ChordMatch, StringInstrumentId } from "../theory";

function Harness({ onOpen = () => {} }: { onOpen?: (match: ChordMatch) => void }) {
  const [route, setRoute] = useState<IdentifyRoute>({ page: "identify" });
  return <ChordFinder route={route} onRoute={setRoute} onOpen={onOpen} />;
}

const cell = (string: number, fret: number) =>
  document.querySelector<HTMLButtonElement>(
    `.fret-picker__cell[data-string="${string}"][data-fret="${fret}"]`,
  )!;
const symbols = () =>
  [...document.querySelectorAll(".suggestion__symbol")].map((el) => el.textContent);

/** Show the neck of `instrument`, as the settings page would have set it up. */
async function playOn(instrument: StringInstrumentId) {
  const user = userEvent.setup();
  rememberNeck({ instrument });
  render(<Harness />);
  await user.click(screen.getByRole("radio", { name: "Fretboard" }));
  return user;
}

describe("ChordFinder on a string instrument", () => {
  it("shows a neck instead of the piano when an instrument is chosen", async () => {
    await playOn("guitar");
    expect(screen.getByRole("group", { name: "Frets of the guitar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "C4" })).not.toBeInTheDocument();
    expect(cell(6, 0)).toHaveAttribute("aria-label", "String 6, open, E");
    expect(cell(1, 12)).toHaveAttribute("aria-label", "String 1, fret 12, E");
    expect(screen.getByRole("button", { name: "Clear frets" })).toBeDisabled();
  });

  it("names open E minor and takes the lowest string as the bass", async () => {
    const user = await playOn("guitar");
    // Em: E2 B2 E3 G3 B3 E4.
    for (const [string, fret] of [
      [6, 0],
      [5, 2],
      [4, 2],
      [3, 0],
      [2, 0],
      [1, 0],
    ] as const) {
      await user.click(cell(string, fret));
    }
    expect(cell(5, 2)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Notes: E–B–G")).toBeInTheDocument();
    expect(symbols()[0]).toBe("Em");
  });

  it("finds a slash chord when another note is the lowest string", async () => {
    const user = await playOn("guitar");
    // C/E: E2 G2... open string 6 E, then C on string 5 (fret 3), G on string 3 (open).
    await user.click(cell(6, 0));
    await user.click(cell(5, 3));
    await user.click(cell(3, 0));
    expect(symbols()).toContain("C/E");
  });

  it("lets a string hold one fret, and lets go when the place is pressed again", async () => {
    const user = await playOn("guitar");
    await user.click(cell(2, 1));
    await user.click(cell(2, 3));
    expect(cell(2, 1)).toHaveAttribute("aria-pressed", "false");
    expect(cell(2, 3)).toHaveAttribute("aria-pressed", "true");
    await user.click(cell(2, 3));
    expect(cell(2, 3)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("No frets pressed")).toBeInTheDocument();
  });

  it("asks for another fret after a single one, and clears them all", async () => {
    const user = await playOn("guitar");
    await user.click(cell(3, 0));
    expect(screen.getByText(/One note is not a chord yet/)).toHaveTextContent("more fret");
    await user.click(cell(2, 0));
    await user.click(screen.getByRole("button", { name: "Clear frets" }));
    expect(document.querySelectorAll('.fret-picker__cell[aria-pressed="true"]')).toHaveLength(0);
  });

  it("uses the tuning of the instrument: GCEA on the ukulele", async () => {
    const user = await playOn("ukulele");
    expect(document.querySelectorAll('.fret-picker__cell[data-fret="0"]')).toHaveLength(4);
    // C major on the ukulele: 0003 (G C E A from string 4 to 1) is G, C, E, C.
    await user.click(cell(4, 0));
    await user.click(cell(3, 0));
    await user.click(cell(2, 0));
    await user.click(cell(1, 3));
    expect(symbols()[0]).toBe("C");
  });

  it("opens a suggestion in the chord tab, like the piano does", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<Harness onOpen={onOpen} />);
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    await user.click(cell(3, 0));
    await user.click(cell(2, 0));
    await user.click(cell(1, 0));
    await user.click(document.querySelector<HTMLButtonElement>(".suggestion")!);
    expect(onOpen).toHaveBeenCalledOnce();
    // G, B and E with the G string lowest: E minor over G.
    expect(onOpen.mock.calls[0]?.[0].symbol).toBe("Em/G");
  });

  it("goes back to the piano with its keys kept", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "C4" }));
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    await user.click(screen.getByRole("radio", { name: "Piano" }));
    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows frets 13–24 from the window picker and presses places there", async () => {
    const user = await playOn("guitar");
    expect(cell(1, 13)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "13–24" }));
    expect(cell(1, 12)).toBeNull();
    expect(cell(1, 24)).toHaveAttribute("aria-label", "String 1, fret 24, E");
    // The open string stays on the neck: open E, then B3 (A string, fret 14) and E4 (D string, fret 14).
    await user.click(cell(6, 0));
    await user.click(cell(5, 14));
    await user.click(cell(4, 14));
    expect(cell(5, 14)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Notes: E–B")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "1–12" }));
    expect(cell(1, 1)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Notes: E–B")).toBeInTheDocument();
  });
});

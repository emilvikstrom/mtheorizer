import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChordFinder } from "./ChordFinder";
import type { IdentifyRoute } from "../route";
import type { ChordMatch } from "../theory";

function Harness({
  onOpen = () => {},
  start = { page: "identify" },
  onRoute = () => {},
}: {
  onOpen?: (match: ChordMatch) => void;
  start?: IdentifyRoute;
  onRoute?: (route: IdentifyRoute) => void;
}) {
  const [route, setRoute] = useState<IdentifyRoute>(start);
  return (
    <ChordFinder
      route={route}
      onRoute={(next) => {
        onRoute(next);
        setRoute(next);
      }}
      onOpen={onOpen}
    />
  );
}

const key = (name: string) => screen.getByRole("button", { name });
const suggestions = () =>
  screen.queryAllByRole("button").filter((b) => b.classList.contains("suggestion"));

describe("ChordFinder", () => {
  it("keeps the pressed keys in the route, lowest first", async () => {
    const user = userEvent.setup();
    const onRoute = vi.fn();
    render(<Harness onRoute={onRoute} />);
    await user.click(key("G4"));
    await user.click(key("C4"));
    expect(onRoute).toHaveBeenLastCalledWith({ page: "identify", keys: [60, 67] });
    await user.click(key("C4"));
    await user.click(key("G4"));
    expect(onRoute).toHaveBeenLastCalledWith({ page: "identify" });
  });

  it("shows the keys of a shared link", () => {
    render(<Harness start={{ page: "identify", keys: [52, 60, 67] }} />);
    expect(key("E3")).toHaveAttribute("aria-pressed", "true");
    expect(key("C4")).toHaveAttribute("aria-pressed", "true");
    const names = suggestions().map((b) => b.querySelector(".suggestion__symbol")?.textContent);
    expect(names[0]).toBe("C/E");
  });

  it("guides you when no key is pressed", () => {
    render(<Harness />);
    expect(screen.getByText(/Press at least two different notes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear keys" })).toBeDisabled();
  });

  it("asks for another key after a single one", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(key("C4"));
    expect(screen.getByText(/One note is not a chord yet/)).toHaveTextContent("you pressed C");
    expect(suggestions()).toHaveLength(0);
  });

  it("finds C major from C, E and G and updates as keys change", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(key("C4"));
    await user.click(key("E4"));
    await user.click(key("G4"));
    expect(key("C4")).toHaveAttribute("aria-pressed", "true");
    const names = suggestions().map((b) => b.querySelector(".suggestion__symbol")?.textContent);
    expect(names[0]).toBe("C");

    // Turning a key off updates the suggestions at once.
    await user.click(key("G4"));
    expect(suggestions()).toHaveLength(0);
    expect(key("G4")).toHaveAttribute("aria-pressed", "false");
  });

  it("takes the lowest key as the bass and spells slash chords", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const name of ["C4", "E4", "G4", "A4"]) await user.click(key(name));
    const symbols = suggestions().map((b) => b.querySelector(".suggestion__symbol")?.textContent);
    expect(symbols).toContain("C6");
    expect(symbols).toContain("Am7/C");

    // Moving the bass up an octave (E lowest) makes the same notes a different chord.
    await user.click(key("C4"));
    await user.click(key("C5"));
    const next = suggestions().map((b) => b.querySelector(".suggestion__symbol")?.textContent);
    expect(next).toContain("Am7/E");
  });

  it("spells diminished sevenths with the fewest accidentals, as slash chords over the bass", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const name of ["C4", "D♯/E♭4", "F♯/G♭4", "A4"]) await user.click(key(name));
    const symbols = suggestions().map((b) => b.querySelector(".suggestion__symbol")?.textContent);
    expect(symbols).toEqual(expect.arrayContaining(["C°7", "D♯°7/C", "F♯°7/C", "A°7/C"]));
  });

  it("says when the notes form no known chord", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const name of ["C4", "C♯/D♭4", "D4", "D♯/E♭4", "E4"]) await user.click(key(name));
    expect(screen.getByText(/No chord in the list has exactly these notes/)).toBeInTheDocument();
  });

  it("clears all keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(key("C4"));
    await user.click(key("E4"));
    await user.click(screen.getByRole("button", { name: "Clear keys" }));
    expect(key("C4")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Press at least two different notes/)).toBeInTheDocument();
  });

  it("presses keys with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    key("C4").focus();
    await user.keyboard("{Enter}");
    expect(key("C4")).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(key("C4")).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the chosen suggestion", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    for (const name of ["E4", "G4", "C5"]) await user.click(key(name));
    const first = within(screen.getByRole("list")).getAllByRole("button")[0];
    if (!first) throw new Error("no suggestion");
    await user.click(first);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0]?.[0].symbol).toBe("C/E");
  });
});

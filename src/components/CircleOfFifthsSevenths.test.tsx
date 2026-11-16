import { render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Key, key, note } from "../theory";
import { CircleOfFifthsView } from "./CircleOfFifthsView";

const opened = vi.fn();

function Harness() {
  const [selected, setSelected] = useState<Key>(key(note("C"), "major"));
  return <CircleOfFifthsView value={selected} onChange={setSelected} onOpenChord={opened} />;
}

type RingName = "major" | "minor" | "diminished";
const sector = (ring: RingName, position: number) =>
  document.querySelector<SVGGElement>(
    ring === "diminished"
      ? `.circle__segment[data-ring="diminished"][data-position="${position}"]`
      : `.circle__segment[data-mode="${ring}"][data-position="${position}"]`,
  );
const step = (ring: RingName, position: number) =>
  sector(ring, position)?.querySelector(".circle__step")?.textContent ?? null;
const label = (ring: RingName, position: number) =>
  sector(ring, position)?.querySelector(".circle__label")?.textContent ?? null;

async function showSevenths(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole("group", { name: "Chords on the rings" })).getByRole("button", {
      name: "Seventh chords",
    }),
  );
}

describe("seventh chords on the circle", () => {
  it("shows triads by default", () => {
    render(<Harness />);
    expect(
      within(screen.getByRole("group", { name: "Chords on the rings" })).getByRole("button", {
        name: "Triads",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(label("major", 0)).toBe("C");
    expect(label("minor", 0)).toBe("Am");
    expect(label("diminished", 0)).toBe("B°");
    expect(document.querySelector(".circle--sevenths")).toBeNull();
  });

  it("writes seventh chords on the rings, with V7 for the dominant", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    expect(document.querySelector(".circle--sevenths")).not.toBeNull();
    expect(label("major", 0)).toBe("Cmaj7");
    expect(label("major", 11)).toBe("Fmaj7");
    expect(label("major", 1)).toBe("G7");
    expect(label("major", 2)).toBe("Dmaj7");
    expect(label("minor", 0)).toBe("Am7");
    expect(label("minor", 11)).toBe("Dm7");
    expect(label("diminished", 0)).toBe("Bm7♭5");
  });

  it("numbers the block with sevenths and keeps the function", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    expect(step("major", 11)).toBe("IVmaj7 S");
    expect(step("major", 0)).toBe("Imaj7 T");
    expect(step("major", 1)).toBe("V7 D");
    expect(step("minor", 11)).toBe("ii7");
    expect(step("minor", 0)).toBe("vi7");
    expect(step("minor", 1)).toBe("iii7");
    expect(step("diminished", 0)).toBe("viiø7");
  });

  it("follows the key, with VII7 and the harmonic minor chords in a minor key", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    await user.click(screen.getByRole("radio", { name: "A minor" }));
    expect(step("minor", 0)).toBe("i7 T");
    expect(step("minor", 11)).toBe("iv7 S");
    expect(step("minor", 1)).toBe("v7 D");
    expect(step("major", 0)).toBe("IIImaj7");
    expect(step("major", 11)).toBe("VImaj7");
    expect(step("major", 1)).toBe("VII7");
    expect(label("major", 1)).toBe("G7");
    expect(step("diminished", 0)).toBe("iiø7");
    // V7 and vii°7 of harmonic minor, outside the block.
    expect(step("major", 4)).toBe("V7");
    expect(label("major", 4)).toBe("E7");
    expect(step("diminished", 3)).toBe("vii°7");
    expect(label("diminished", 3)).toBe("G♯°7");
  });

  it("writes both spellings where a position has two", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    expect(label("major", 5)).toBe("Bmaj7C♭maj7");
    expect(label("minor", 5)).toBe("G♯m7A♭m7");
  });

  it("opens the seventh chord, spelled as in the key", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    await user.click(
      within(screen.getByRole("group", { name: "Clicking a chord" })).getByRole("button", {
        name: "Open chord",
      }),
    );
    await user.click(screen.getByRole("radio", { name: "G major" }));
    expect(opened).toHaveBeenLastCalledWith(note("G"), "dominant7");
    await user.click(screen.getByRole("radio", { name: "C major" }));
    expect(opened).toHaveBeenLastCalledWith(note("C"), "major7");
    await user.click(screen.getByRole("radio", { name: "A minor" }));
    expect(opened).toHaveBeenLastCalledWith(note("A"), "minor7");
    await user.click(sector("diminished", 0) as Element);
    expect(opened).toHaveBeenLastCalledWith(note("B"), "halfDiminished7");
  });

  it("switches back to triads", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await showSevenths(user);
    await user.click(
      within(screen.getByRole("group", { name: "Chords on the rings" })).getByRole("button", {
        name: "Triads",
      }),
    );
    expect(label("major", 0)).toBe("C");
    expect(step("major", 1)).toBe("V D");
  });
});

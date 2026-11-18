import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { type Key, key, note } from "../theory";
import { CircleOfFifths } from "./CircleOfFifths";
import { CircleOfFifthsView } from "./CircleOfFifthsView";

function Harness({ start = key(note("C"), "major") }: { start?: Key }) {
  const [selected, setSelected] = useState<Key>(start);
  return <CircleOfFifthsView value={selected} onChange={setSelected} onOpenChord={() => {}} />;
}

const toggle = () => screen.getByRole("button", { name: "Camelot wheel" });
const labels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".circle__signature")).map((t) => t.textContent);
const outlined = (container: HTMLElement) => container.querySelectorAll(".circle__compatible");

describe("Camelot wheel", () => {
  it("is off until it is switched on, and the circle shows key signatures", () => {
    const { container } = render(<Harness />);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(labels(container)[0]).toBe("0");
    expect(outlined(container)).toHaveLength(0);
    expect(container.querySelector(".legend--camelot")).toBeNull();
  });

  it("numbers the 12 positions 8A 8B, 9A 9B … clockwise from the top", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(labels(container)).toEqual([
      "8A 8B",
      "9A 9B",
      "10A 10B",
      "11A 11B",
      "12A 12B",
      "1A 1B",
      "2A 2B",
      "3A 3B",
      "4A 4B",
      "5A 5B",
      "6A 6B",
      "7A 7B",
    ]);
  });

  it("outlines the three neighbours of C major and names them", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(toggle());
    expect(outlined(container)).toHaveLength(3);
    const note = container.querySelector(".legend--camelot")?.textContent ?? "";
    expect(note).toContain("C major is 8B");
    expect(note).toContain("8A (A minor)");
    expect(note).toContain("9B (G major)");
    expect(note).toContain("7B (F major)");
    const marked = Array.from(container.querySelectorAll(".circle__signature.is-compatible"));
    expect(marked.map((t) => t.textContent)).toEqual(["8A 8B", "9A 9B", "7A 7B"]);
  });

  it("follows the selected key: A minor is 8A and mixes with 9A, 7A and 8B", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness start={key(note("A"), "minor")} />);
    await user.click(toggle());
    const text = container.querySelector(".legend--camelot")?.textContent ?? "";
    expect(text).toContain("A minor is 8A");
    expect(text).toContain("9A (E minor)");
    expect(text).toContain("7A (D minor)");
    expect(text).toContain("8B (C major)");
  });

  it("lists both spellings of an enharmonic neighbour", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness start={key(note("D", -1), "major")} />);
    await user.click(toggle());
    const text = container.querySelector(".legend--camelot")?.textContent ?? "";
    expect(text).toContain("D♭ major is 3B");
    expect(text).toContain("2B (F♯ major or G♭ major)");
  });

  it("outlines only the rings that are shown", () => {
    const { container } = render(
      <CircleOfFifths value={key(note("C"), "major")} onChange={() => {}} rings={1} camelot />,
    );
    // Only the two major neighbours: the relative minor has no ring to outline.
    expect(outlined(container)).toHaveLength(2);
  });

  it("turns off again", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(toggle());
    await user.click(toggle());
    expect(labels(container)[0]).toBe("0");
    expect(outlined(container)).toHaveLength(0);
  });
});

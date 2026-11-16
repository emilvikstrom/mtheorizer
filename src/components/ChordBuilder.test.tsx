import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChordBuilder } from "./ChordBuilder";
import {
  CHORD_QUALITY_IDS,
  type ChordBase,
  type ChordSpec,
  availableQualities,
  identifyQuality,
  note,
  specOf,
  withQuality,
} from "../theory";

/** The builder with the state of a parent that decides what the next spec is. */
function Harness({
  start,
  next,
}: {
  start: ChordSpec;
  next?: (current: ChordSpec, proposed: ChordSpec) => ChordSpec;
}) {
  const [spec, setSpec] = useState(start);
  return (
    <ChordBuilder
      root={note("C")}
      spec={spec}
      onChange={(proposed) => setSpec(next ? next(spec, proposed) : proposed)}
    />
  );
}

const MODIFIER_TEXT = {
  "7": "7",
  maj7: "maj7",
  dim7: "°7",
  "6": "6",
  "9": "9",
  "11": "11",
  "13": "13",
  flat5: "♭5",
  flat9: "♭9",
  sharp9: "♯9",
  sharp11: "♯11",
  flat13: "♭13",
  add2: "add2",
  add4: "add4",
  add9: "add9",
  add11: "add11",
} as const;

const BASE_NAMES: Record<ChordBase, string> = {
  major: "Major",
  minor: "Minor",
  diminished: "Diminished",
  augmented: "Augmented",
  sus2: "Suspended second",
  sus4: "Suspended fourth",
  power: "Power chord",
};

const button = (name: string) => screen.getByRole("button", { name });

describe("ChordBuilder", () => {
  it("shows exactly the available qualities, plus the ones already on", () => {
    const spec = withQuality(specOf("dominant7"), "9");
    render(<Harness start={spec} />);
    const shown = screen.getAllByRole("button").map((b) => b.textContent);
    const expected = [...spec.qualities, ...availableQualities(spec)].map((m) => MODIFIER_TEXT[m]);
    expect([...shown].sort()).toEqual([...expected].sort());
    expect(button("7")).toHaveAttribute("aria-pressed", "true");
    expect(button("9")).toHaveAttribute("aria-pressed", "true");
    expect(button("11")).toHaveAttribute("aria-pressed", "false");
  });

  it("builds all 43 named chords by clicking base chords and buttons", async () => {
    const user = userEvent.setup();
    for (const id of CHORD_QUALITY_IDS) {
      const target = specOf(id);
      const { unmount } = render(<Harness start={{ base: "major", qualities: [] }} />);
      await user.click(screen.getByRole("radio", { name: BASE_NAMES[target.base] }));
      // Modifiers in canonical order: each one is available when its turn comes.
      for (const modifier of target.qualities) {
        await user.click(button(MODIFIER_TEXT[modifier]));
      }
      for (const modifier of target.qualities) {
        expect(button(MODIFIER_TEXT[modifier])).toHaveAttribute("aria-pressed", "true");
      }
      expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(
        target.qualities.length,
      );
      unmount();
      expect(identifyQuality(target)).toBe(id);
    }
  });

  it("keeps the qualities that still fit when the base chord changes", async () => {
    const user = userEvent.setup();
    render(<Harness start={withQuality(specOf("dominant7"), "flat9")} />);
    await user.click(screen.getByRole("radio", { name: "Minor" }));
    expect(button("7")).toHaveAttribute("aria-pressed", "true");
    expect(button("♭9")).toHaveAttribute("aria-pressed", "true");

    // A sus2 chord has no ♭9, but keeps its seventh.
    await user.click(screen.getByRole("radio", { name: "Suspended second" }));
    expect(screen.queryByRole("button", { name: "♭9" })).not.toBeInTheDocument();
    expect(button("7")).toHaveAttribute("aria-pressed", "true");
  });

  describe("focus", () => {
    const toPower = (): ChordSpec => ({ base: "power", qualities: [] });
    const toMinorSeventh = (): ChordSpec => ({ base: "minor", qualities: ["7"] });

    it("stays on a button that is still there", async () => {
      const user = userEvent.setup();
      render(<Harness start={specOf("major")} />);
      await user.click(button("7"));
      expect(button("7")).toHaveFocus();
    });

    it("moves to the group when the pressed button is gone but its group is not", async () => {
      const user = userEvent.setup();
      // Pressing maj7 turns the chord into a minor seventh, which has no maj7 button.
      render(<Harness start={specOf("major")} next={toMinorSeventh} />);
      await user.click(button("maj7"));
      expect(screen.queryByRole("button", { name: "maj7" })).not.toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Seventh" })).toHaveFocus();
    });

    it("moves to the qualities when the whole group is gone", async () => {
      const user = userEvent.setup();
      render(<Harness start={specOf("major")} next={toPower} />);
      await user.click(button("7"));
      expect(screen.queryByRole("group", { name: "Seventh" })).not.toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Qualities" })).toHaveFocus();
    });
  });

  it("groups the buttons", () => {
    render(<Harness start={specOf("dominant7")} />);
    const seventh = within(screen.getByRole("group", { name: "Seventh" }));
    expect(seventh.getAllByRole("button").map((b) => b.textContent)).toEqual(["7"]);
    expect(
      within(screen.getByRole("group", { name: "Extensions" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["9", "11", "13"]);
  });
});

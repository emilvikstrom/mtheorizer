import { render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  type Note,
  circlePosition,
  diatonicTriads,
  formatKey,
  key,
  keysAt,
  note,
  pitchClass,
  relativeKey,
} from "../theory";
import { CircleOfFifths } from "./CircleOfFifths";
import { CircleOfFifthsView } from "./CircleOfFifthsView";

const opened = vi.fn();

function Harness() {
  const [selected, setSelected] = useState<Key>(key(note("C"), "major"));
  return <CircleOfFifthsView value={selected} onChange={setSelected} onOpenChord={opened} />;
}

const heading = () => screen.getByRole("heading", { level: 2 });
const listText = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
const triadSymbols = () =>
  within(screen.getByRole("list", { name: "Diatonic triads" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".triad__symbol")?.textContent);

describe("CircleOfFifthsView", () => {
  it("starts on C major", () => {
    render(<Harness />);
    expect(heading()).toHaveTextContent("C major");
    expect(screen.getByRole("radio", { name: "C major" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("No sharps or flats")).toBeInTheDocument();
    expect(listText("Notes in the scale")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(triadSymbols()).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  });

  it("opens a diatonic chord", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "E♭ major" }));
    await user.click(screen.getByRole("button", { name: "Open B♭ in Chords & scales" }));
    expect(opened).toHaveBeenLastCalledWith(note("B", -1), "major");
    await user.click(screen.getByRole("button", { name: "Open D° in Chords & scales" }));
    expect(opened).toHaveBeenLastCalledWith(note("D"), "diminished");
  });

  describe("borrowed chords", () => {
    const borrowedSymbols = () =>
      within(screen.getByRole("list", { name: "Borrowed chords" }))
        .getAllByRole("listitem")
        .map((item) => item.querySelector(".triad__symbol")?.textContent);

    it("shows C major borrowing from C minor, with the origin on each chord", () => {
      render(<Harness />);
      expect(borrowedSymbols()).toEqual(["D°", "E♭", "Fm", "A♭", "B♭"]);
      const items = within(screen.getByRole("list", { name: "Borrowed chords" })).getAllByRole(
        "listitem",
      );
      expect(items.map((item) => item.querySelector(".triad__roman")?.textContent)).toEqual([
        "ii°",
        "♭III",
        "iv",
        "♭VI",
        "♭VII",
      ]);
      expect(items.every((item) => item.textContent?.includes("C minor"))).toBe(true);
    });

    it("shows a minor key borrowing from the parallel major", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "A minor" }));
      expect(borrowedSymbols()).toEqual(["A", "Bm", "D"]);
    });

    it("follows the key and its spelling", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "D♭ major / C♯ major" }));
      expect(borrowedSymbols()).toEqual(["E♭°", "F♭", "G♭m", "B𝄫", "C♭"]);
    });

    it("opens a borrowed chord, spelled as in the key", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(
        screen.getByRole("button", {
          name: "Open A♭ in Chords & scales, borrowed from C minor",
        }),
      );
      expect(opened).toHaveBeenLastCalledWith(note("A", -1), "major");
      await user.click(
        screen.getByRole("button", {
          name: "Open Fm in Chords & scales, borrowed from C minor",
        }),
      );
      expect(opened).toHaveBeenLastCalledWith(note("F"), "minor");
    });
  });

  it("has 12 major and 12 minor keys", () => {
    render(<Harness />);
    const circle = screen.getByRole("radiogroup", { name: /Circle of fifths/ });
    expect(within(circle).getAllByRole("radio")).toHaveLength(24);
  });

  it("selects a key by clicking it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "E♭ major" }));

    expect(heading()).toHaveTextContent("E♭ major");
    expect(screen.getByText("3 flats")).toBeInTheDocument();
    expect(listText("Accidentals in the key signature")).toEqual(["B♭", "E♭", "A♭"]);
    expect(triadSymbols()).toEqual(["E♭", "Fm", "Gm", "A♭", "B♭", "Cm", "D°"]);
  });

  it("lets you choose between enharmonic spellings", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "F♯ major / G♭ major" }));
    expect(heading()).toHaveTextContent("F♯ major");

    await user.click(
      within(screen.getByRole("group", { name: "Spelling" })).getByRole("button", {
        name: "G♭ major",
      }),
    );
    expect(heading()).toHaveTextContent("G♭ major");
    expect(listText("Notes in the scale")).toEqual(["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"]);
    expect(screen.getByRole("radio", { name: "F♯ major / G♭ major" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows minor keys with the harmonic minor dominant", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "A minor" }));

    expect(heading()).toHaveTextContent("A minor");
    expect(triadSymbols()).toEqual(["Am", "B°", "C", "Dm", "Em", "F", "G"]);
    expect(screen.getByText(/dominant becomes major/)).toHaveTextContent("E (V)");
  });

  it("jumps to related keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Relative minor/ }));
    expect(heading()).toHaveTextContent("A minor");

    await user.click(screen.getByRole("button", { name: /Parallel major/ }));
    expect(heading()).toHaveTextContent("A major");

    await user.click(screen.getByRole("button", { name: /^Dominant/ }));
    expect(heading()).toHaveTextContent("E major");

    await user.click(screen.getByRole("button", { name: /^Subdominant/ }));
    expect(heading()).toHaveTextContent("A major");
  });

  describe("rings", () => {
    const diminished = () =>
      Array.from(document.querySelectorAll<SVGGElement>(".circle__segment--diminished"));

    it("shows three rings by default, with the diminished chords innermost", () => {
      render(<Harness />);
      expect(
        within(screen.getByRole("group", { name: "Rings" })).getByRole("button", {
          name: "Major, minor + diminished",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      const sectors = diminished();
      expect(sectors).toHaveLength(12);
      expect(sectors[0]).toHaveTextContent("B°");
      expect(sectors[1]).toHaveTextContent("F♯°");
      expect(sectors[11]).toHaveTextContent("E°");
    });

    it("shows both names at the positions with two", () => {
      render(<Harness />);
      const sectors = diminished();
      expect(sectors[5]).toHaveTextContent("A♯°B♭°");
      expect(sectors[6]).toHaveTextContent("E♯°F°");
      expect(sectors[7]).toHaveTextContent("C°B♯°");
      expect(screen.getByRole("radio", { name: "B major / C♭ major" })).toBeInTheDocument();
    });

    it("selects the position when you click a diminished sector, keeping the mode", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "A minor" }));
      await user.click(diminished()[2] as Element);
      expect(heading()).toHaveTextContent("B minor");

      await user.click(screen.getByRole("radio", { name: "C major" }));
      await user.click(diminished()[2] as Element);
      expect(heading()).toHaveTextContent("D major");
    });

    it("hides the diminished ring with two rings", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(
        within(screen.getByRole("group", { name: "Rings" })).getByRole("button", {
          name: "Major + minor",
        }),
      );
      expect(diminished()).toHaveLength(0);
      expect(screen.getAllByRole("radio")).toHaveLength(24);
    });

    it("shows only major keys with one ring, a minor key by its relative major", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "A minor" }));
      await user.click(
        within(screen.getByRole("group", { name: "Rings" })).getByRole("button", {
          name: "Major",
        }),
      );
      expect(diminished()).toHaveLength(0);
      expect(screen.getAllByRole("radio")).toHaveLength(12);
      expect(screen.getByRole("radio", { name: "C major" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(heading()).toHaveTextContent("A minor");

      screen.getByRole("radio", { name: "C major" }).focus();
      await user.keyboard("{ArrowDown}");
      expect(heading()).toHaveTextContent("A minor");
      await user.keyboard("{ArrowRight}");
      expect(heading()).toHaveTextContent("G major");
    });
  });

  it("moves around the circle with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("radio", { name: "C major" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(heading()).toHaveTextContent("G major");
    expect(screen.getByRole("radio", { name: "G major" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(heading()).toHaveTextContent("E minor");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(heading()).toHaveTextContent("D minor");
  });

  describe("the key's chords as a block", () => {
    type RingName = "major" | "minor" | "diminished";
    const sector = (ring: RingName, position: number) =>
      document.querySelector<SVGGElement>(
        ring === "diminished"
          ? `.circle__segment[data-ring="diminished"][data-position="${position}"]`
          : `.circle__segment[data-mode="${ring}"][data-position="${position}"]`,
      );
    const step = (ring: RingName, position: number) =>
      sector(ring, position)?.querySelector(".circle__step")?.textContent ?? null;
    const blockSteps = (ring: RingName) =>
      Array.from({ length: 12 }, (_, p) => step(ring, p)).filter((t) => t !== null);

    it("writes step numbers and functions on the seven chords of C major", () => {
      render(<Harness />);
      expect(step("major", 11)).toBe("IV S");
      expect(step("major", 0)).toBe("I T");
      expect(step("major", 1)).toBe("V D");
      expect(step("minor", 11)).toBe("ii");
      expect(step("minor", 0)).toBe("vi");
      expect(step("minor", 1)).toBe("iii");
      expect(step("diminished", 0)).toBe("vii°");
      expect(blockSteps("major")).toHaveLength(3);
      expect(blockSteps("minor")).toHaveLength(3);
      expect(blockSteps("diminished")).toHaveLength(1);
      expect(document.querySelectorAll(".is-harmonic")).toHaveLength(0);
    });

    it("moves the block with the key", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "G major" }));
      expect(step("major", 1)).toBe("I T");
      expect(step("major", 0)).toBe("IV S");
      expect(step("major", 2)).toBe("V D");
      expect(step("diminished", 1)).toBe("vii°");
    });

    it("uses the shape of natural minor in a minor key and marks harmonic minor apart", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "A minor" }));
      expect(step("minor", 0)).toBe("i T");
      expect(step("minor", 11)).toBe("iv S");
      expect(step("minor", 1)).toBe("v D");
      expect(step("major", 0)).toBe("III");
      expect(step("major", 11)).toBe("VI");
      expect(step("major", 1)).toBe("VII");
      expect(step("diminished", 0)).toBe("ii°");

      // E major (V) and G♯° (vii°) lie outside the block, with their own mark.
      expect(step("major", 4)).toBe("V");
      expect(step("diminished", 3)).toBe("vii°");
      expect(sector("major", 4)).toHaveClass("is-harmonic");
      expect(sector("diminished", 3)).toHaveClass("is-harmonic");
      expect(document.querySelectorAll(".is-harmonic")).toHaveLength(2);
      expect(screen.getByText(/Dashed: V and vii° of harmonic minor/)).toBeInTheDocument();
    });

    it("has the same block shape in all 24 keys", () => {
      const rings = ["major", "minor", "diminished"] as const;
      const modes: readonly KeyMode[] = ["major", "minor"];
      for (const mode of modes) {
        for (let position = 0; position < CIRCLE_OF_FIFTHS.length; position++) {
          const [k] = keysAt(position, mode);
          if (!k) throw new Error("no key");
          const { unmount } = render(<CircleOfFifths value={k} onChange={() => {}} />);
          const counts = rings.map(
            (ring) =>
              document.querySelectorAll(
                `.circle__segment${ring === "diminished" ? "--diminished" : `--${ring}`}.is-block:not(.is-harmonic)`,
              ).length,
          );
          expect(counts, `${k.tonic.letter} ${mode}`).toEqual([3, 3, 1]);
          expect(document.querySelectorAll(".is-harmonic")).toHaveLength(mode === "minor" ? 2 : 0);
          unmount();
        }
      }
    });

    it("carries the function in text, not only in colour", () => {
      render(<Harness />);
      const labels = Array.from(document.querySelectorAll(".circle__step")).map(
        (el) => el.textContent,
      );
      expect(labels.filter((t) => t?.endsWith(" T"))).toHaveLength(1);
      expect(labels.filter((t) => t?.endsWith(" S"))).toHaveLength(1);
      expect(labels.filter((t) => t?.endsWith(" D"))).toHaveLength(1);
      expect(screen.getByText("T tonic (I)")).toBeInTheDocument();
      expect(screen.getByText("S subdominant (IV)")).toBeInTheDocument();
      expect(screen.getByText("D dominant (V)")).toBeInTheDocument();
    });

    it("opens a chord of the block instead of selecting its key when asked", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(
        within(screen.getByRole("group", { name: "Clicking a chord" })).getByRole("button", {
          name: "Open chord",
        }),
      );
      await user.click(screen.getByRole("radio", { name: "G major" }));
      expect(opened).toHaveBeenLastCalledWith(note("G"), "major");
      expect(heading()).toHaveTextContent("C major");

      await user.click(screen.getByRole("radio", { name: "A minor" }));
      expect(opened).toHaveBeenLastCalledWith(note("A"), "minor");

      await user.click(sector("diminished", 0) as Element);
      expect(opened).toHaveBeenLastCalledWith(note("B"), "diminished");

      // D major is not one of C major's chords, so nothing opens.
      opened.mockClear();
      await user.click(screen.getByRole("radio", { name: "D major" }));
      expect(opened).not.toHaveBeenCalled();
    });

    it("opens the harmonic minor dominant, spelled as in the key", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole("radio", { name: "A minor" }));
      await user.click(
        within(screen.getByRole("group", { name: "Clicking a chord" })).getByRole("button", {
          name: "Open chord",
        }),
      );
      await user.click(screen.getByRole("radio", { name: "E major" }));
      expect(opened).toHaveBeenLastCalledWith(note("E"), "major");
      await user.click(sector("diminished", 3) as Element);
      expect(opened).toHaveBeenLastCalledWith(note("G", 1), "diminished");
    });
  });

  describe("step ring", () => {
    const wheel = (container: HTMLElement) =>
      container.querySelector<SVGGElement>(".circle__wheel");
    const steps = (container: HTMLElement) =>
      [...container.querySelectorAll<SVGGElement>("[data-step]")].map((el) => ({
        roman: el.dataset.step,
        slot: Number(el.dataset.slot),
      }));

    it("is shown, and can be removed with the ring switch", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness />);
      expect(wheel(container)).not.toBeNull();
      const toggle = screen.getByRole("button", { name: "Step ring" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(wheel(container)).toBeNull();
      // The other ring controls are unaffected.
      expect(container.querySelectorAll("[data-ring='diminished']")).toHaveLength(12);

      await user.click(toggle);
      expect(wheel(container)).not.toBeNull();
    });

    it("is off in the bare circle unless asked for", () => {
      const { container } = render(
        <CircleOfFifths value={key(note("C"), "major")} onChange={vi.fn()} />,
      );
      expect(wheel(container)).toBeNull();
    });

    it("lays the steps out around the top in C major", () => {
      const { container } = render(<Harness />);
      expect(wheel(container)).toHaveAttribute("data-position", "0");
      // In document order, from the key's own position on and then round to IV.
      expect(steps(container)).toEqual([
        { roman: "I", slot: 0 },
        { roman: "V", slot: 1 },
        { roman: "ii", slot: 2 },
        { roman: "vi", slot: 3 },
        { roman: "iii", slot: 4 },
        { roman: "vii°", slot: 5 },
        { roman: "IV", slot: 11 },
      ]);
    });

    const ALL_KEYS = CIRCLE_OF_FIFTHS.flat().flatMap((tonic) => [
      key(tonic, "major"),
      key(relativeKey(key(tonic, "major")).tonic, "minor"),
    ]);

    it.each(ALL_KEYS.map((k) => [formatKey(k), k] as const))(
      "points I at the tonic of %s",
      (_name, k) => {
        const { container } = render(<CircleOfFifths value={k} onChange={vi.fn()} stepRing />);
        const position = circlePosition(k);
        expect(wheel(container)).toHaveAttribute("data-position", String(position));
        expect(wheel(container)?.style.getPropertyValue("--turn")).toBe(`${position * 30}deg`);

        const all = steps(container);
        expect(all).toHaveLength(7);
        // The tonic step sits on the circle slot of the tonic's root.
        const tonic = all.find((s) => s.roman === (k.mode === "major" ? "I" : "i"));
        expect(tonic?.slot).toBe((pitchClass(k.tonic) * 7) % 12);
        // Every step is on the slot of its chord's root.
        const triads = diatonicTriads(k);
        expect(all.map((s) => s.roman).sort()).toEqual(triads.map((t) => t.roman).sort());
        for (const triad of triads) {
          const step = all.find((s) => s.roman === triad.roman);
          expect(step?.slot).toBe((pitchClass(triad.notes[0] as Note) * 7) % 12);
        }
      },
    );

    it("turns the shortest way round when the key changes", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness />);
      const turn = () => wheel(container)?.style.getPropertyValue("--turn");
      expect(turn()).toBe("0deg");

      // From C (0) to F (11) is one step counterclockwise, not 330° clockwise.
      await user.click(screen.getByRole("radio", { name: "F major" }));
      expect(turn()).toBe("-30deg");
      // And on to B♭ (10), then back round through C to G (1).
      await user.click(screen.getByRole("radio", { name: "B♭ major" }));
      expect(turn()).toBe("-60deg");
      await user.click(screen.getByRole("radio", { name: "G major" }));
      expect(turn()).toBe("30deg");
    });
  });
});

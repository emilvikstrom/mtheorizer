import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChordCompare, ChordScaleCompare } from "./ChordCompare";
import { Lookup } from "./Lookup";
import { type ChordRoute, type ChordVs, defaultChordRoute } from "../route";
import { chordFromSpec, note, specOf, tuningFor } from "../theory";

const vsAm = { root: note("A"), spec: specOf("minor") };

function renderCompare(
  props: Partial<React.ComponentProps<typeof ChordCompare>> & { onChange?: () => void } = {},
) {
  return render(
    <ChordCompare
      root={note("C")}
      spec={specOf("major")}
      inversion={0}
      vs={vsAm}
      onChange={() => {}}
      display="names"
      {...props}
    />,
  );
}

describe("ChordCompare", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers to start a comparison, with the chord a fifth up", async () => {
    const onChange = vi.fn();
    renderCompare({ vs: undefined, onChange });
    await userEvent.click(screen.getByRole("button", { name: "Compare with another chord" }));
    expect(onChange).toHaveBeenCalledWith({ root: note("G"), spec: specOf("major") });
  });

  it("lists the common tones of C and Am", () => {
    renderCompare();
    expect(screen.getByText(/C and Am share/)).toHaveTextContent("share C, E (2 tones)");
    const first = screen.getByRole("list", { name: "Tones of C major" });
    const common = within(first)
      .getAllByRole("listitem")
      .filter((item) => item.dataset.common === "true")
      .map((item) => item.textContent);
    expect(common).toEqual(["C (common)", "E (common)"]);
    const second = screen.getByRole("list", { name: "Tones of A minor" });
    expect(within(second).getByText("A")).not.toHaveAttribute("data-common");
  });

  it("marks the shared keys on both keyboards", () => {
    const { container } = renderCompare();
    const pianos = container.querySelectorAll(".piano");
    expect(pianos).toHaveLength(2);
    for (const piano of pianos) {
      // Each chord has two tones the other one has (C and E).
      expect(piano.querySelectorAll('[data-shared="true"]')).toHaveLength(2);
    }
  });

  it("says when E♭ and D♯ are the same key spelled two ways", () => {
    renderCompare({
      root: note("C"),
      spec: specOf("minor"),
      vs: { root: note("B"), spec: specOf("major") },
    });
    expect(screen.getByText(/share/)).toHaveTextContent("E♭ / D♯");
    expect(screen.getByText(/spelled differently/)).toHaveTextContent("E♭ and D♯");
  });

  it("says when nothing is shared", () => {
    renderCompare({ vs: { root: note("D", -1), spec: specOf("major") } });
    expect(screen.getByText(/no tone in common/)).toBeInTheDocument();
  });

  it("opens another chord typed as a symbol, and stops on request", async () => {
    const onChange = vi.fn();
    function Stateful() {
      const [vs, setVs] = useState<ChordVs | undefined>(vsAm);
      return (
        <ChordCompare
          root={note("C")}
          spec={specOf("major")}
          inversion={0}
          vs={vs}
          onChange={(next) => {
            onChange(next);
            setVs(next);
          }}
          display="names"
        />
      );
    }
    render(<Stateful />);
    const field = screen.getByLabelText("Compare with");
    await userEvent.clear(field);
    await userEvent.type(field, "Fmaj7");
    expect(onChange).toHaveBeenLastCalledWith({
      root: note("F"),
      spec: { base: "major", qualities: ["maj7"] },
    });
    await userEvent.click(screen.getByRole("button", { name: "Stop comparing" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("plays both chords when Web Audio exists", () => {
    vi.stubGlobal("AudioContext", class {});
    renderCompare();
    expect(screen.getByRole("button", { name: "Play C then Am" })).toBeInTheDocument();
  });
});

describe("ChordCompare on a neck", () => {
  const neck = { tuning: tuningFor("guitar"), left: false };

  it("shows both chords on a neck with the common tones marked on the dots", () => {
    const { container } = renderCompare({ neck });
    expect(container.querySelectorAll(".piano")).toHaveLength(0);
    const necks = container.querySelectorAll(".fretboard");
    expect(necks).toHaveLength(2);
    for (const one of necks) {
      // C and Am share C and E: every dot of those two tones has the mark, no other dot does.
      const marked = one.querySelectorAll('.fret-dot[data-shared="true"]');
      expect(marked.length).toBeGreaterThan(0);
      for (const dot of marked) {
        expect(["C", "E"]).toContain(dot.querySelector(".fret-dot__label")?.textContent);
        expect(dot.querySelector(".fret-dot__shared")).not.toBeNull();
      }
      expect(within(one as HTMLElement).getByText("Common tone")).toBeInTheDocument();
    }
  });

  it("marks nothing when the chords share no tone", () => {
    const { container } = renderCompare({
      neck,
      vs: { root: note("D", -1), spec: specOf("major") },
    });
    expect(container.querySelectorAll('.fret-dot[data-shared="true"]')).toHaveLength(0);
    expect(screen.queryByText("Common tone")).not.toBeInTheDocument();
  });

  it("is used by the lookup view when a string instrument is chosen", async () => {
    const route: ChordRoute = { ...defaultChordRoute(), instrument: "guitar", vs: vsAm };
    const { container } = render(<Lookup route={route} onChange={() => {}} />);
    // One neck for the open chord, and two more for the comparison.
    expect(container.querySelectorAll(".fretboard")).toHaveLength(3);
  });
});

describe("ChordScaleCompare", () => {
  const cmaj7 = chordFromSpec(note("C"), specOf("major7"));

  it("starts on the chord's first listed scale and says all tones are in it", async () => {
    render(<ChordScaleCompare chord={cmaj7} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare with a scale" }));
    expect(screen.getByText(/All 4 tones of Cmaj7 are in C major scale/)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tones of C major seventh against the scale" });
    for (const item of within(list).getAllByRole("listitem")) {
      expect(item).toHaveAttribute("data-in-scale", "true");
      expect(item).toHaveTextContent("(in scale)");
    }
  });

  it("names the tones that are not in the scale, in words and not only by colour", async () => {
    render(<ChordScaleCompare chord={chordFromSpec(note("C"), specOf("major7"))} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare with a scale" }));
    await userEvent.selectOptions(screen.getByLabelText("Scale"), "naturalMinor");
    expect(
      screen.getByText(/2 of 4 tones of Cmaj7 are in C natural minor scale/),
    ).toHaveTextContent("E, B are not");
    expect(screen.getAllByText(/not in scale/)).toHaveLength(2);
  });

  it("keeps a chord with an optional fifth outside the scale as fitting", async () => {
    const c7 = chordFromSpec(note("C"), specOf("dominant7"));
    render(<ChordScaleCompare chord={c7} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare with a scale" }));
    await userEvent.selectOptions(screen.getByLabelText("Scale"), "wholeTone");
    expect(screen.getByText(/3 of 4 tones of C7/)).toHaveTextContent("G is not");
    expect(screen.getByText(/still fits/)).toBeInTheDocument();
  });

  it("marks the chord's keys on the scale keyboard and stops on request", async () => {
    const { container } = render(<ChordScaleCompare chord={cmaj7} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare with a scale" }));
    // C, E, G and B, and the tonic again an octave up.
    expect(container.querySelectorAll('.piano [data-shared="true"]').length).toBeGreaterThanOrEqual(
      4,
    );
    await userEvent.click(screen.getByRole("button", { name: "Stop comparing with a scale" }));
    expect(screen.getByRole("button", { name: "Compare with a scale" })).toBeInTheDocument();
  });
});

describe("Lookup with a comparison", () => {
  it("starts and ends a comparison through the route", async () => {
    const onChange = vi.fn();
    const route: ChordRoute = defaultChordRoute();
    const { rerender } = render(<Lookup route={route} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare with another chord" }));
    const next = onChange.mock.calls.at(-1)?.[0] as ChordRoute;
    expect(next.vs?.root).toEqual(note("G"));
    rerender(<Lookup route={next} onChange={onChange} />);
    expect(screen.getByText(/C and G share/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Stop comparing" }));
    expect((onChange.mock.calls.at(-1)?.[0] as ChordRoute).vs).toBeUndefined();
  });
});

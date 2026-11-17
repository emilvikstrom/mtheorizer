import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChordCompare } from "./ChordCompare";
import { Lookup } from "./Lookup";
import { type ChordRoute, type ChordVs, defaultChordRoute } from "../route";
import { note, specOf } from "../theory";

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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChordSymbolField } from "./ChordSymbolField";
import { type ChordSpec, type Note, chordSymbolFor, note, specOf } from "../theory";

interface State {
  root: Note;
  spec: ChordSpec;
  inversion: number;
}

/** The field with the state of a parent, plus a way to change the chord from elsewhere. */
function Harness({ jumps }: { jumps: State[] }) {
  const [state, setState] = useState<State>({
    root: note("C"),
    spec: specOf("major"),
    inversion: 0,
  });
  return (
    <>
      <ChordSymbolField
        {...state}
        onJump={(root, spec, inversion) => {
          jumps.push({ root, spec, inversion });
          setState({ root, spec, inversion });
        }}
      />
      <button
        onClick={() => setState({ root: note("E", -1), spec: specOf("minor7"), inversion: 0 })}
      >
        Elsewhere
      </button>
    </>
  );
}

const field = () => screen.getByRole("textbox", { name: "Chord symbol" });
const symbolOf = (state: State | undefined) =>
  state ? chordSymbolFor(state.root, state.spec) : undefined;

describe("ChordSymbolField", () => {
  it("shows the symbol of the chord that is open, with its inversion", () => {
    render(
      <ChordSymbolField root={note("C")} spec={specOf("major")} inversion={1} onJump={() => {}} />,
    );
    expect(field()).toHaveValue("C/E");
  });

  it("opens the chord a valid symbol names, with the inversion the bass gives", async () => {
    const user = userEvent.setup();
    const jumps: State[] = [];
    render(<Harness jumps={jumps} />);
    await user.clear(field());
    await user.type(field(), "F#m7b5/C");
    const last = jumps.at(-1);
    expect(symbolOf(last)).toBe("F♯m7♭5");
    expect(last?.inversion).toBe(2);
    expect(field()).toHaveValue("F#m7b5/C");
    expect(field()).toHaveAttribute("aria-invalid", "false");
  });

  it("says what is wrong while the symbol is not valid and leaves the chord alone", async () => {
    const user = userEvent.setup();
    const jumps: State[] = [];
    render(<Harness jumps={jumps} />);
    await user.clear(field());
    await user.type(field(), "Hmaj7");
    expect(jumps).toHaveLength(0);
    expect(field()).toHaveAttribute("aria-invalid", "true");
    const message = screen.getByText(/does not start with a note name/);
    expect(message).toHaveAttribute("aria-live", "polite");
    expect(field()).toHaveAccessibleDescription(/does not start with a note name/);
  });

  it("does not complain about an empty field", async () => {
    const user = userEvent.setup();
    render(<Harness jumps={[]} />);
    await user.clear(field());
    expect(field()).toHaveValue("");
    expect(field()).toHaveAttribute("aria-invalid", "false");
    expect(field()).toHaveAccessibleDescription("");
  });

  it("explains a bass that is not a chord tone instead of ignoring it", async () => {
    const user = userEvent.setup();
    const jumps: State[] = [];
    render(<Harness jumps={jumps} />);
    await user.clear(field());
    await user.type(field(), "C/D");
    expect(symbolOf(jumps.at(-1))).toBe("C");
    expect(jumps.at(-1)?.inversion).toBe(0);
    expect(screen.getByText("D is not a tone of C, so it opens in root position.")).toBeVisible();
    expect(field()).toHaveValue("C/D");
  });

  it("follows the chord when it is changed somewhere else", async () => {
    const user = userEvent.setup();
    render(<Harness jumps={[]} />);
    await user.clear(field());
    await user.type(field(), "Hmaj7");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(field()).toHaveValue("E♭m7");
    expect(field()).toHaveAttribute("aria-invalid", "false");
    expect(field()).toHaveAccessibleDescription("");
  });

  it("keeps Enter from submitting the page", async () => {
    const user = userEvent.setup();
    const jumps: State[] = [];
    render(<Harness jumps={jumps} />);
    await user.clear(field());
    await user.type(field(), "Dm7{Enter}");
    expect(symbolOf(jumps.at(-1))).toBe("Dm7");
    expect(field()).toHaveValue("Dm7");
  });
});

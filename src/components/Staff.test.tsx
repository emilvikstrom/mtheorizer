import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  chordOnKeyboard,
  chordOnPitchClass,
  type KeyboardTone,
  note,
  scaleOnKeyboard,
  scaleOnPitchClass,
  scaleSignature,
} from "../theory";
import { Notation, Staff } from "./Staff";

const heads = (container: HTMLElement) =>
  [...container.querySelectorAll<SVGElement>(".staff__note")].map((g) => ({
    note: g.dataset.note,
    octave: g.dataset.octave,
    clef: g.dataset.clef,
    position: Number(g.dataset.position),
    sign: g.dataset.sign,
  }));

describe("Staff", () => {
  it("writes E♭ major in the treble clef with a flat on E and B", () => {
    const keys = chordOnKeyboard(chordOnPitchClass(3, "major"), 4, 0);
    const { container } = render(<Staff tones={keys} kind="chord" name="E♭ major" />);
    expect(heads(container)).toEqual([
      { note: "E♭", octave: "4", clef: "treble", position: 0, sign: "-1" },
      { note: "G", octave: "4", clef: "treble", position: 2, sign: undefined },
      { note: "B♭", octave: "4", clef: "treble", position: 4, sign: "-1" },
    ]);
    expect(container.querySelectorAll("[data-clef].staff__clef-group")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "Staff notation of E♭ major: E♭4, G4, B♭4",
    );
  });

  it("gives middle C a ledger line", () => {
    const keys = chordOnKeyboard(chordOnPitchClass(0, "major"), 4, 0);
    const { container } = render(<Staff tones={keys} kind="chord" name="C major" />);
    expect(container.querySelectorAll(".staff__ledger")).toHaveLength(1);
  });

  it("writes a scale with its key signature and no accidentals beside the notes", () => {
    const scale = scaleOnPitchClass(2, "major");
    const { container } = render(
      <Staff
        tones={scaleOnKeyboard(scale)}
        kind="scale"
        signature={scaleSignature(scale)}
        name={scale.name}
      />,
    );
    expect(container.querySelectorAll(".staff__signature")).toHaveLength(2);
    expect(container.querySelectorAll(".staff__accidental")).toHaveLength(0);
    expect(heads(container).map((h) => h.note)).toEqual(["D", "E", "F♯", "G", "A", "B", "C♯", "D"]);
  });

  it("writes the accidentals beside the notes when the scale has no key signature", () => {
    const scale = scaleOnPitchClass(9, "harmonicMinor");
    const { container } = render(
      <Staff tones={scaleOnKeyboard(scale)} kind="scale" name={scale.name} />,
    );
    expect(container.querySelectorAll(".staff__signature")).toHaveLength(0);
    // G♯ is the only altered tone of A harmonic minor.
    expect(container.querySelectorAll(".staff__accidental")).toHaveLength(1);
  });

  it("draws the bass clef for tones below middle C, and both when a chord spans them", () => {
    const low: KeyboardTone[] = [
      { note: note("C"), midi: 48, isRoot: true, role: "root" },
      { note: note("G"), midi: 55, isRoot: false, role: "fifth" },
    ];
    const bass = render(<Staff tones={low} kind="chord" name="C power chord" />);
    expect(heads(bass.container).every((h) => h.clef === "bass")).toBe(true);
    expect(bass.container.querySelectorAll(".staff__clef-group")).toHaveLength(1);
    bass.unmount();

    const both = render(
      <Staff
        tones={[...low, { note: note("E"), midi: 64, isRoot: false, role: "third" }]}
        kind="chord"
        name="C"
      />,
    );
    expect(both.container.querySelectorAll(".staff__clef-group")).toHaveLength(2);
  });

  it("moves the upper note of a second to the side", () => {
    const keys: KeyboardTone[] = [
      { note: note("C"), midi: 60, isRoot: true, role: "root" },
      { note: note("D"), midi: 62, isRoot: false, role: "second" },
    ];
    const { container } = render(<Staff tones={keys} kind="chord" name="Csus2 shell" />);
    const [c, d] = [...container.querySelectorAll(".staff__head")].map((e) =>
      Number(e.getAttribute("cx")),
    );
    expect(d).toBeGreaterThan(c ?? 0);
  });
});

describe("Notation", () => {
  const keys = chordOnKeyboard(chordOnPitchClass(0, "major"), 4, 0);

  it("shows the staff", () => {
    render(<Notation tones={keys} kind="chord" name="C major" hidden={false} />);
    expect(screen.getByRole("heading", { name: "Notation" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("hides the staff while the tone labels are off", () => {
    render(<Notation tones={keys} kind="chord" name="C major" hidden />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/hidden while the tone labels are off/)).toBeInTheDocument();
  });
});

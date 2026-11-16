import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TUNINGS } from "../theory";
import { Fretboard } from "./Fretboard";

const legend = { root: "Root", tone: "Chord tone" };

function renderEmpty(kind: "shape" | "position") {
  render(
    <Fretboard
      views={[]}
      kind={kind}
      tones={[]}
      name="C7♭5♭9"
      legend={legend}
      tuning={TUNINGS.standard}
      left={false}
    />,
  );
}

describe("Fretboard without views", () => {
  it("explains that no chord shape was found instead of an empty neck", () => {
    renderEmpty("shape");
    expect(screen.getByRole("status")).toHaveTextContent("No playable shape in this position");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("explains that no scale position was found", () => {
    renderEmpty("position");
    expect(screen.getByRole("status")).toHaveTextContent("No playable position found");
  });
});

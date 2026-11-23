import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { rememberNeck } from "../neck";
import { defaultChordRoute, formatRoute, parseRoute } from "../route";

/** Highlighted fret positions as "string/fret:role", sorted. */
const highlightedFrets = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"][data-string]')]
    .map(
      (dot) =>
        `${dot.getAttribute("data-string")}/${dot.getAttribute("data-fret")}:${dot.getAttribute("data-role")}`,
    )
    .sort();

describe("ukulele, bass and mandolin in the route", () => {
  it("writes the instrument to the link and reads it back", () => {
    for (const on of ["ukulele", "bass", "bass5", "mandolin"] as const) {
      const route = { ...defaultChordRoute(on) };
      expect(formatRoute(route)).toBe(`#/C/major?on=${on}`);
      expect(parseRoute(`#/C/major?on=${on}`)).toMatchObject({ instrument: on });
    }
  });

  it("keeps the hand, but only the guitar has a tuning", () => {
    const uke = parseRoute("#/G/major?on=ukulele&tuning=dropD&hand=left");
    expect(uke).toMatchObject({ instrument: "ukulele", left: true });
    expect(uke).not.toHaveProperty("tuning");
    expect(formatRoute({ ...defaultChordRoute("ukulele"), tuning: "dropD", left: true })).toBe(
      "#/C/major?on=ukulele&hand=left",
    );
    expect(parseRoute("#/G/scale/major?on=banjo")).toMatchObject({ instrument: "piano" });
  });
});

describe("the instrument picker", () => {
  it("shows the ukulele with four strings and the familiar C chord", async () => {
    const user = userEvent.setup();
    rememberNeck({ instrument: "ukulele" });
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    expect(window.location.hash).toBe("#/C/major?on=ukulele");
    expect(
      screen.getByRole("img", {
        name: /^Ukulele neck showing C major, shape 1 of \d+, open position: 0 0 0 3/,
      }),
    ).toBeInTheDocument();
    // Only the A string is fretted, at the third fret; the other three are open.
    expect(highlightedFrets(container)).toEqual(["1/3:root", "2/0:third", "3/0:root", "4/0:fifth"]);
    expect(container.querySelectorAll(".fretboard__string")).toHaveLength(4);
    // The tuning is named, with a way to change it.
    expect(screen.getByText(/Ukulele, GCEA: C E G A/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "#/settings");
  });

  it("shows the mandolin, a bass with five strings, and keeps the choice in the link for scales", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "mandolin");
    await user.click(screen.getByRole("tab", { name: "Chords" }));
    await user.click(screen.getByRole("radio", { name: "Fretboard" }));
    expect(container.querySelectorAll(".fretboard__string")).toHaveLength(4);
    expect(screen.getByRole("img", { name: /^Mandolin neck showing C major/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Preset" }), "bass5");
    await user.click(screen.getByRole("tab", { name: "Chords" }));
    expect(container.querySelectorAll(".fretboard__string")).toHaveLength(5);
    expect(
      screen.getByRole("img", { name: /^5-string bass neck showing C major/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Scales" }));
    expect(window.location.hash).toBe("#/C/scale/major?on=bass5");
    expect(
      screen.getByRole("img", { name: /^5-string bass neck showing C major scale/ }),
    ).toBeInTheDocument();
  });

  it("opens a left-handed bass from a link and names it in the saved choices", async () => {
    window.location.hash = "#/E/minor?on=bass&hand=left";
    render(<App />);
    expect(screen.getByRole("radio", { name: "Fretboard" })).toBeChecked();
    expect(
      screen.getByRole("img", { name: /^Left-handed bass neck showing E minor/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Em (Bass)" })).toBeInTheDocument();
  });
});

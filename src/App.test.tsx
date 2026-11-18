import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const notesIn = (listName: string) =>
  within(screen.getByRole("list", { name: listName }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".tone__note")?.textContent);

const chordNotes = () => notesIn("Notes in the chord");
const scaleNotes = () => notesIn("Notes in the scale");

/** Highlighted piano keys as "midi:role", sorted. */
const highlightedKeys = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map((key) => `${key.getAttribute("data-midi")}:${key.getAttribute("data-role")}`)
    .sort();

/** Highlighted guitar positions as "string/fret:role", sorted. */
const highlightedFrets = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map(
      (dot) =>
        `${dot.getAttribute("data-string")}/${dot.getAttribute("data-fret")}:${dot.getAttribute("data-role")}`,
    )
    .sort();

describe("App", () => {
  it("starts on C major", () => {
    const { container } = render(<App />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C major");
    expect(chordNotes()).toEqual(["C", "E", "G"]);
    expect(
      screen.getByRole("img", { name: "Piano keyboard showing C major: C, E, G" }),
    ).toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(["60:root", "64:third", "67:fifth"]);
  });

  it("shows inversions on the piano with the bass marked", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const inversions = within(screen.getByRole("group", { name: "Inversion" }));
    expect(inversions.getAllByRole("radio")).toHaveLength(3);
    expect(container.querySelector('[data-bass="true"]')?.getAttribute("data-midi")).toBe("60");

    await user.click(inversions.getByRole("radio", { name: "1st inversion" }));
    expect(highlightedKeys(container)).toEqual(["64:third", "67:fifth", "72:root"]);
    expect(container.querySelector('[data-bass="true"]')?.getAttribute("data-midi")).toBe("64");

    await user.click(inversions.getByRole("radio", { name: "2nd inversion" }));
    expect(container.querySelector('[data-bass="true"]')?.getAttribute("data-midi")).toBe("67");

    // A seventh chord has a third inversion; the inversion picker adapts to the chord.
    await user.click(screen.getByRole("button", { name: "7" }));
    expect(
      within(screen.getByRole("group", { name: "Inversion" })).getAllByRole("radio"),
    ).toHaveLength(4);
  });

  it("offers all 12 roots and the seven base chords", () => {
    render(<App />);
    expect(within(screen.getByRole("group", { name: "Root" })).getAllByRole("radio")).toHaveLength(
      12,
    );
    expect(
      within(screen.getByRole("group", { name: "Base chord" })).getAllByRole("radio"),
    ).toHaveLength(7);
  });

  it("shows each base chord as a symbol on the chosen root", async () => {
    const user = userEvent.setup();
    render(<App />);
    const symbolOf = (name: string) =>
      screen.getByRole("radio", { name }).closest("label")?.textContent;
    expect(symbolOf("Major")).toBe("C");
    expect(symbolOf("Suspended fourth")).toBe("Csus4");
    expect(symbolOf("Power chord")).toBe("C5");

    // Each chord gets its own root spelling: D♭ major but C♯ minor and C♯°.
    await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
    expect(symbolOf("Major")).toBe("D♭");
    expect(symbolOf("Minor")).toBe("C♯m");
    expect(symbolOf("Diminished")).toBe("C♯°");
  });

  describe("chord builder", () => {
    it("opens the chord that is typed in the chord symbol field", async () => {
      const user = userEvent.setup();
      render(<App />);
      const field = screen.getByRole("textbox", { name: "Chord symbol" });
      await user.clear(field);
      await user.type(field, "Dm7b5");
      await waitFor(() => expect(window.location.hash).toBe("#/D/diminished?with=7&on=piano"));
      expect(chordNotes()).toEqual(["D", "F", "A♭", "C"]);
      // Changing the chord with the builder updates the field.
      await user.click(screen.getByRole("radio", { name: "Major" }));
      // The builder keeps the seventh and drops what no longer fits: D7.
      expect(field).toHaveValue("D7");
    });

    const quality = (name: string) => screen.queryByRole("button", { name });
    const group = (name: string) => screen.queryByRole("group", { name });
    const heading = () => screen.getByRole("heading", { level: 2 });

    it("offers only the qualities that fit the chord as it looks now", async () => {
      const user = userEvent.setup();
      render(<App />);
      // A plain major chord: no 9, 11 or 13 until there is a seventh.
      expect(quality("7")).toBeInTheDocument();
      expect(quality("9")).not.toBeInTheDocument();
      expect(quality("♭9")).not.toBeInTheDocument();

      await user.click(quality("7") as HTMLElement);
      expect(quality("9")).toBeInTheDocument();
      expect(quality("♭9")).toBeInTheDocument();
      expect(quality("maj7")).not.toBeInTheDocument(); // one seventh at a time
      expect(quality("add9")).not.toBeInTheDocument(); // added tones are for chords without a seventh
      expect(quality("6")).not.toBeInTheDocument();

      // On a minor chord ♭5 would make it diminished, so it is not offered.
      await user.click(screen.getByRole("radio", { name: "Minor" }));
      expect(quality("♭5")).not.toBeInTheDocument();
      expect(quality("♯9")).not.toBeInTheDocument();

      // On a diminished chord the seventh is either 7 or °7, and maj7 is not offered.
      await user.click(quality("7") as HTMLElement); // off again
      await user.click(screen.getByRole("radio", { name: "Diminished" }));
      expect(quality("°7")).toBeInTheDocument();
      expect(quality("maj7")).not.toBeInTheDocument();

      // Csus4 has the eleventh as its fourth.
      await user.click(screen.getByRole("radio", { name: "Suspended fourth" }));
      await user.click(quality("7") as HTMLElement);
      expect(quality("11")).not.toBeInTheDocument();
      expect(quality("13")).toBeInTheDocument();
    });

    it("has no qualities on a power chord, and hides groups with nothing to offer", async () => {
      const user = userEvent.setup();
      render(<App />);
      expect(group("Altered")).toBeInTheDocument();
      await user.click(screen.getByRole("radio", { name: "Diminished" }));
      expect(group("Sixth")).not.toBeInTheDocument();
      expect(group("Altered")).not.toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "Power chord" }));
      for (const name of ["Seventh", "Sixth", "Extensions", "Altered", "Added"]) {
        expect(group(name)).not.toBeInTheDocument();
      }
      expect(screen.getByText("A power chord has no qualities to add.")).toBeInTheDocument();
      expect(chordNotes()).toEqual(["C", "G"]);
    });

    it("builds named chords from toggle buttons and names them", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(quality("7") as HTMLElement);
      expect(quality("7")).toHaveAttribute("aria-pressed", "true");
      expect(heading()).toHaveTextContent("C dominant seventh");
      expect(window.location.hash).toBe("#/C/major?with=7&on=piano");

      await user.click(quality("♯9") as HTMLElement);
      expect(heading()).toHaveTextContent("C dominant seventh sharp nine");
      expect(window.location.hash).toBe("#/C/major?with=7,sharp9&on=piano");

      await user.click(screen.getByRole("radio", { name: "Minor" }));
      expect(quality("♯9")).not.toBeInTheDocument();
      expect(heading()).toHaveTextContent("C minor seventh");

      await user.click(quality("7") as HTMLElement); // toggled off again
      expect(quality("7")).toHaveAttribute("aria-pressed", "false");
      expect(heading()).toHaveTextContent("C minor");
    });

    it("removes what depended on a quality with it", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(quality("7") as HTMLElement);
      await user.click(quality("9") as HTMLElement);
      await user.click(quality("♭13") as HTMLElement);
      expect(heading()).toHaveTextContent("C dominant ninth flat thirteen");

      await user.click(quality("7") as HTMLElement);
      expect(heading()).toHaveTextContent("C major");
      expect(quality("9")).not.toBeInTheDocument();
      expect(quality("♭13")).not.toBeInTheDocument();
    });

    it("builds a free combination and keeps it while the choice is made here", async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(quality("7") as HTMLElement);
      await user.click(quality("♭5") as HTMLElement);
      await user.click(quality("♭9") as HTMLElement);
      expect(heading()).toHaveTextContent("C7♭5♭9");
      expect(chordNotes()).toEqual(["C", "E", "G♭", "B♭", "D♭"]);
      expect(highlightedKeys(container)).toHaveLength(5);
      expect(window.location.hash).toBe("#/C/major?with=7,flat5,flat9&on=piano");

      // It follows the root, and the inversions are those of the built chord.
      await user.click(screen.getByRole("radio", { name: "D" }));
      expect(heading()).toHaveTextContent("D7♭5♭9");
      expect(
        within(screen.getByRole("group", { name: "Inversion" })).getAllByRole("radio"),
      ).toHaveLength(4);
    });

    it("opens a recent free combination as the same chord", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(quality("7") as HTMLElement);
      await user.click(quality("♭5") as HTMLElement);
      await user.click(quality("♭9") as HTMLElement);
      expect(heading()).toHaveTextContent("C7♭5♭9");

      await user.click(screen.getByRole("radio", { name: "D" }));
      expect(heading()).toHaveTextContent("D7♭5♭9");
      await user.click(screen.getByRole("button", { name: "Open C7♭5♭9 (Piano)" }));
      expect(heading()).toHaveTextContent("C7♭5♭9");
      expect(quality("♭9")).toHaveAttribute("aria-pressed", "true");
      expect(window.location.hash).toBe("#/C/major?with=7,flat5,flat9&on=piano");
    });

    it("shows a progression on its own tab and keeps it when switching tabs", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("tab", { name: "Progressions" }));
      expect(window.location.hash).toBe("#/progression/C/pop");
      await user.click(screen.getByRole("radio", { name: "12-bar blues" }));
      expect(window.location.hash).toBe("#/progression/C/blues");

      await user.click(screen.getByRole("tab", { name: "Chords & scales" }));
      expect(window.location.hash).toBe("#/C/major?on=piano");
      await user.click(screen.getByRole("tab", { name: "Progressions" }));
      expect(window.location.hash).toBe("#/progression/C/blues");
    });

    it("opens a progression link and a chord of it in the chord view", async () => {
      window.location.hash = "#/progression/Ab/pop";
      const user = userEvent.setup();
      render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("I–V–vi–IV in A♭ major");
      await user.click(screen.getByRole("button", { name: "Open Fm in Chords & scales" }));
      expect(window.location.hash).toBe("#/F/minor?on=piano");
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("F minor");
    });

    it("keeps a free combination when switching tabs and back", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(quality("7") as HTMLElement);
      await user.click(quality("♭5") as HTMLElement);
      await user.click(quality("♭9") as HTMLElement);

      await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
      await user.click(screen.getByRole("tab", { name: "Chords & scales" }));
      expect(heading()).toHaveTextContent("C7♭5♭9");
      expect(window.location.hash).toBe("#/C/major?with=7,flat5,flat9&on=piano");
    });

    it("shows an opened free combination in an inversion and on the guitar", async () => {
      const user = userEvent.setup();
      window.history.replaceState(null, "", "#/C/major?with=7,flat5,flat9&inv=2&on=piano");
      render(<App />);
      expect(heading()).toHaveTextContent("C7♭5♭9");
      expect(screen.getByRole("radio", { name: "2nd inversion" })).toBeChecked();

      await user.click(screen.getByRole("radio", { name: "Guitar" }));
      expect(window.location.hash).toBe("#/C/major?with=7,flat5,flat9&on=guitar");
      expect(heading()).toHaveTextContent("C7♭5♭9");
      expect(screen.queryByRole("img", { name: /^Piano keyboard/ })).not.toBeInTheDocument();
    });
  });

  it("shows a seventh chord with four tones", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "A♯/B♭" }));
    await user.click(screen.getByRole("button", { name: "7" }));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("B♭ dominant seventh");
    expect(chordNotes()).toEqual(["B♭", "D", "F", "A♭"]);
    expect(highlightedKeys(container)).toEqual(["70:root", "74:third", "77:fifth", "80:seventh"]);
    expect(screen.getByText("Often left out")).toBeInTheDocument();
  });

  it("widens the keyboard for chords that reach past B5", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(container.querySelectorAll("[data-midi]")).toHaveLength(24);

    await user.click(screen.getByRole("radio", { name: "B" }));
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("button", { name: "13" }));
    expect(chordNotes()).toEqual(["B", "D♯", "F♯", "A", "C♯", "G♯"]);
    expect(container.querySelectorAll("[data-midi]")).toHaveLength(36);
    expect(highlightedKeys(container)).toEqual([
      "71:root",
      "75:third",
      "78:fifth",
      "81:seventh",
      "85:ninth",
      "92:thirteenth",
    ]);
  });

  it("switches between the piano and the guitar neck", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(screen.getByRole("radio", { name: "Piano" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Guitar" }));
    expect(screen.queryByRole("img", { name: /^Piano keyboard/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Guitar neck showing C major, shape 1 of 7, open position: x 3 2 0 1 0, fingers x 3 2 – 1 –",
      }),
    ).toBeInTheDocument();
    // Only the open C chord is marked, with the low E string muted.
    expect(highlightedFrets(container)).toEqual([
      "1/0:third",
      "2/1:root",
      "3/0:fifth",
      "4/2:third",
      "5/3:root",
    ]);
    expect(container.querySelector('[data-muted="6"]')).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Piano" }));
    expect(screen.queryByRole("img", { name: /^Guitar neck/ })).not.toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(["60:root", "64:third", "67:fifth"]);
  });

  it("shows the guitar in another tuning and for the left hand", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/D/major?on=guitar";
    render(<App />);
    expect(screen.getByRole("radio", { name: "Standard" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Drop D" }));
    expect(
      screen.getByRole("img", {
        name: /^Guitar neck showing D major in Drop D tuning, shape 1 of/,
      }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#/D/major?on=guitar&tuning=dropD");

    await user.click(screen.getByRole("radio", { name: "Left-handed" }));
    expect(screen.getByRole("img", { name: /^Left-handed guitar neck/ })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/D/major?on=guitar&tuning=dropD&hand=left");

    // The choice follows a switch to a scale.
    await user.click(screen.getByRole("radio", { name: "Scale" }));
    expect(window.location.hash).toBe("#/D/scale/major?on=guitar&tuning=dropD&hand=left");
  });

  it("steps through the chord shapes with the arrows", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "Guitar" }));
    const previous = screen.getByRole("button", { name: "Previous shape" });
    const next = screen.getByRole("button", { name: "Next shape" });
    expect(previous).toBeDisabled();
    expect(screen.getByText("Shape 1 of 7")).toBeInTheDocument();
    expect(screen.getByText("Open position")).toBeInTheDocument();

    // The second shape is a variant of the open chord, with G on the high E string.
    await user.click(next);
    expect(screen.getByText("Shape 2 of 7")).toBeInTheDocument();
    expect(screen.getByText("Open position")).toBeInTheDocument();
    expect(highlightedFrets(container)).toEqual([
      "1/3:fifth",
      "2/1:root",
      "3/0:fifth",
      "4/2:third",
      "5/3:root",
    ]);

    await user.click(next);
    expect(screen.getByText("Shape 3 of 7")).toBeInTheDocument();
    expect(screen.getByText("Frets 3–6")).toBeInTheDocument();
    expect(highlightedFrets(container)).toEqual([
      "1/3:fifth",
      "2/5:third",
      "3/5:root",
      "4/5:fifth",
      "5/3:root",
    ]);
    expect(previous).toBeEnabled();

    for (let i = 0; i < 4; i++) await user.click(next);
    expect(screen.getByText("Shape 7 of 7")).toBeInTheDocument();
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(screen.getByText("Shape 6 of 7")).toBeInTheDocument();
  });

  it("stays in the same area of the neck when the chord changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("radio", { name: "Guitar" }));
    await user.click(screen.getByRole("button", { name: "Next shape" }));
    await user.click(screen.getByRole("button", { name: "Next shape" }));
    expect(screen.getByText("Frets 3–6")).toBeInTheDocument();

    // D major has shapes at frets 1, 2, 5, 7, 10 and 12; fret 2 is closest to 3.
    await user.click(screen.getByRole("radio", { name: "D" }));
    expect(
      screen.getByRole("img", {
        name: "Guitar neck showing D major, shape 2 of 6, frets 2–5: x 5 4 2 3 2, fingers x 4 3 1 2 1",
      }),
    ).toBeInTheDocument();
  });

  it("spells E♭ minor with flats on the guitar neck", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "Guitar" }));
    await user.click(screen.getByRole("radio", { name: "D♯/E♭" }));
    await user.click(screen.getByRole("radio", { name: "Minor" }));

    expect(
      screen.getByRole("img", {
        name: "Guitar neck showing E♭ minor, shape 1 of 4, frets 1–4: x x 1 3 4 2, fingers x x 1 3 4 2",
      }),
    ).toBeInTheDocument();
    const notes = [...container.querySelectorAll('[data-highlighted="true"]')].map(
      (dot) => dot.textContent,
    );
    expect(notes).toEqual(["G♭", "E♭", "B♭", "E♭"]);
  });

  it("spells E♭ minor with flats", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "D♯/E♭" }));
    await user.click(screen.getByRole("radio", { name: "Minor" }));

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("E♭ minor");
    expect(chordNotes()).toEqual(["E♭", "G♭", "B♭"]);
    expect(highlightedKeys(container)).toEqual(["63:root", "66:third", "70:fifth"]);
  });

  it("spells the C♯/D♭ key as D♭ major but C♯ minor", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
    expect(chordNotes()).toEqual(["D♭", "F", "A♭"]);

    await user.click(screen.getByRole("radio", { name: "Minor" }));
    expect(chordNotes()).toEqual(["C♯", "E", "G♯"]);
  });

  it("switches between the chord and circle of fifths tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("tab", { name: "Chords & scales" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
    expect(screen.getByRole("tab", { name: "Circle of fifths" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Circle of fifths");
    expect(screen.getByRole("radiogroup", { name: /Circle of fifths/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Root" })).not.toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Chords & scales" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "Root" })).toBeInTheDocument();
  });

  it("opens a diatonic chord from the circle in the chord tab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
    await user.click(screen.getByRole("radio", { name: "A minor" }));
    await user.click(screen.getByRole("button", { name: "Open B° in Chords & scales" }));

    expect(screen.getByRole("tab", { name: "Chords & scales" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("B diminished");
    expect(chordNotes()).toEqual(["B", "D", "F"]);
    expect(window.location.hash).toBe("#/B/diminished?on=piano");
  });

  it("opens the key-signature quiz from its tab and from its link", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Practice" }));
    expect(window.location.hash).toBe("#/quiz");
    expect(screen.getByRole("heading", { level: 2, name: "Key signatures" })).toBeInTheDocument();
    expect(screen.getByText(/^(How many|Which)/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Chords & scales" }));
    expect(screen.queryByText("Nothing answered yet.")).toBeNull();
  });

  it("opens the Tonnetz from its tab, moves with L and keeps the triad across tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Tonnetz" }));
    expect(window.location.hash).toBe("#/tonnetz/C/major");
    expect(screen.getByRole("heading", { level: 2, name: "Tonnetz" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^L, leading tone: E minor/ }));
    expect(window.location.hash).toBe("#/tonnetz/E/minor");
    await user.click(screen.getByRole("tab", { name: "Chords & scales" }));
    await user.click(screen.getByRole("tab", { name: "Tonnetz" }));
    expect(window.location.hash).toBe("#/tonnetz/E/minor");
  });

  it("opens a Tonnetz triad as a chord", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/tonnetz/A/minor";
    render(<App />);
    expect(screen.getByRole("tab", { name: "Tonnetz" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Open Am as a chord" }));
    expect(window.location.hash).toBe("#/A/minor?on=piano");
  });

  it("opens the spelling drill from its link and keeps the seed", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/quiz/spelling?seed=5&groups=triads";
    render(<App />);
    expect(screen.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Spelling" })).toBeInTheDocument();
    expect(screen.getByText(/^Spell /)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Sevenths" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Sevenths" }));
    expect(window.location.hash).toBe("#/quiz/spelling?seed=5&groups=triads,sevenths");
  });

  it("finds a chord from pressed keys and opens it in the chord tab", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "What chord is this?" }));
    expect(window.location.hash).toBe("#/identify");

    // The pressed keys survive a visit to another tab.
    await user.click(screen.getByRole("button", { name: "E4" }));
    await user.click(screen.getByRole("button", { name: "G4" }));
    await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
    await user.click(screen.getByRole("tab", { name: "What chord is this?" }));
    expect(screen.getByRole("button", { name: "E4" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "C5" }));
    await user.click(screen.getByRole("button", { name: /^C\/E/ }));

    expect(screen.getByRole("tab", { name: "Chords & scales" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(chordNotes()).toEqual(["C", "E", "G"]);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C/E");
    expect(window.location.hash).toBe("#/C/major?on=piano&inv=1");
  });

  it("shows B major across the octave break", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("radio", { name: "B" }));

    expect(chordNotes()).toEqual(["B", "D♯", "F♯"]);
    expect(highlightedKeys(container)).toEqual(["71:root", "75:third", "78:fifth"]);
  });

  describe("tritone substitute", () => {
    it("shows the substitute under a dominant seventh and opens it", async () => {
      const user = userEvent.setup();
      render(<App />);
      expect(screen.queryByRole("heading", { name: "Tritone substitute" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "7" }));
      expect(screen.getByRole("heading", { name: "Tritone substitute" })).toBeInTheDocument();
      const text = screen.getByText(/can stand in for C7/);
      expect(text).toHaveTextContent("F♯7");
      expect(text).toHaveTextContent("E–B♭");
      expect(text).toHaveTextContent("A♯–E");

      await user.click(screen.getByRole("button", { name: "Open F♯7" }));
      expect(window.location.hash).toBe("#/Fs/major?with=7&on=piano");
      expect(chordNotes()).toEqual(["F♯", "A♯", "C♯", "E"]);
      // The substitute has a substitute of its own: the original.
      expect(screen.getByRole("button", { name: "Open C7" })).toBeInTheDocument();
    });

    it("disappears once the chord is more than a plain dominant seventh", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "7" }));
      expect(screen.getByRole("heading", { name: "Tritone substitute" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "♯9" }));
      expect(screen.queryByRole("heading", { name: "Tritone substitute" })).not.toBeInTheDocument();
    });
  });

  describe("chords and scales that fit", () => {
    it("opens a scale that fits the chord, on the same root", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("button", { name: "7" }));
      expect(screen.getByRole("heading", { name: "Scales that fit" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "C Lydian dominant" }));
      expect(window.location.hash).toBe("#/C/scale/lydianDominant?on=piano");
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "C lydian dominant scale",
      );
      expect(scaleNotes()).toEqual(["C", "D", "E", "F♯", "G", "A", "B♭"]);
    });

    it("opens a chord built on a degree of the scale", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      expect(screen.getByRole("heading", { name: "Chords that fit" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Am7" }));
      expect(window.location.hash).toBe("#/A/minor?with=7&on=piano");
      expect(chordNotes()).toEqual(["A", "C", "E", "G"]);
    });

    it("leaves the section out for scales with fewer than seven tones", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      await user.click(screen.getByRole("radio", { name: "Major pentatonic" }));
      expect(screen.queryByRole("heading", { name: "Chords that fit" })).not.toBeInTheDocument();
    });
  });

  describe("scales", () => {
    it("switches to the major scale on the same root", async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C major scale");
      expect(scaleNotes()).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
      expect(screen.queryByRole("group", { name: "Qualities" })).not.toBeInTheDocument();
      expect(
        within(screen.getByRole("group", { name: "Scale" })).getAllByRole("radio"),
      ).toHaveLength(18);
      expect(
        within(screen.getByRole("group", { name: "Tonic" })).getAllByRole("radio"),
      ).toHaveLength(12);
      expect(
        screen.getByRole("img", {
          name: "Piano keyboard showing C major scale: C, D, E, F, G, A, B, C",
        }),
      ).toBeInTheDocument();
      expect(highlightedKeys(container)).toEqual([
        "60:degree-1",
        "62:degree-2",
        "64:degree-3",
        "65:degree-4",
        "67:degree-5",
        "69:degree-6",
        "71:degree-7",
        "72:degree-8",
      ]);
    });

    it("shows E♭ natural minor with flats", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      await user.click(screen.getByRole("radio", { name: "D♯/E♭" }));
      await user.click(screen.getByRole("radio", { name: "Natural minor (Aeolian)" }));

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("E♭ natural minor scale");
      expect(scaleNotes()).toEqual(["E♭", "F", "G♭", "A♭", "B♭", "C♭", "D♭"]);
    });

    it("comes back to the same seventh chord after looking at its scale", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Minor" }));
      await user.click(screen.getByRole("button", { name: "7" }));
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      expect(screen.getByRole("radio", { name: "Natural minor (Aeolian)" })).toBeChecked();

      await user.click(screen.getByRole("radio", { name: "Chord" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C minor seventh");
    });

    it("keeps root and major/minor when switching between chord and scale", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "A" }));
      await user.click(screen.getByRole("radio", { name: "Minor" }));
      await user.click(screen.getByRole("radio", { name: "Scale" }));

      expect(screen.getByRole("radio", { name: "Natural minor (Aeolian)" })).toBeChecked();
      expect(scaleNotes()).toEqual(["A", "B", "C", "D", "E", "F", "G"]);

      await user.click(screen.getByRole("radio", { name: "Major (Ionian)" }));
      await user.click(screen.getByRole("radio", { name: "Chord" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("A major");
      expect(chordNotes()).toEqual(["A", "C♯", "E"]);
    });

    it("shows modes, pentatonic and blues scales", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "D" }));
      await user.click(screen.getByRole("radio", { name: "Scale" }));

      await user.click(screen.getByRole("radio", { name: "Dorian" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D dorian scale");
      expect(scaleNotes()).toEqual(["D", "E", "F", "G", "A", "B", "C"]);
      expect(window.location.hash).toBe("#/D/scale/dorian?on=piano");

      await user.click(screen.getByRole("radio", { name: "Minor blues" }));
      expect(scaleNotes()).toEqual(["D", "F", "G", "A♭", "A", "C"]);

      await user.click(screen.getByRole("radio", { name: "Major pentatonic" }));
      expect(scaleNotes()).toEqual(["D", "E", "F♯", "A", "B"]);
    });

    it("goes back to a plain triad from a mode", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      await user.click(screen.getByRole("radio", { name: "Locrian" }));
      await user.click(screen.getByRole("radio", { name: "Chord" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C diminished");
    });

    it("shows a scale on the guitar neck", async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      await user.click(screen.getByRole("radio", { name: "Guitar" }));

      expect(
        screen.getByRole("img", {
          name: "Guitar neck showing C major scale, position 1 of 7, open position: C, D, E, F, G, A, B",
        }),
      ).toBeInTheDocument();
      // The low E string in the open position: E F G, skipping F♯ and G♯ at frets 2 and 4.
      const lowE = () =>
        [...container.querySelectorAll('[data-string="6"]')].map(
          (dot) => `${dot.getAttribute("data-fret")}:${dot.textContent}`,
        );
      expect(lowE()).toEqual(["0:E", "1:F", "3:G"]);
      expect(container.querySelector('[data-string="5"][data-fret="3"]')).toHaveAttribute(
        "data-role",
        "degree-1",
      );

      await user.click(screen.getByRole("button", { name: "Next position" }));
      expect(screen.getByText("Frets 3–6")).toBeInTheDocument();
      expect(lowE()).toEqual(["3:G", "5:A"]);
    });
  });

  describe("links", () => {
    const open = (hash: string) => {
      window.history.replaceState(null, "", hash);
    };

    it("shows the chord in the URL and opens a link on the same chord", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
      await user.click(screen.getByRole("radio", { name: "Minor" }));
      await user.click(screen.getByRole("button", { name: "7" }));
      expect(window.location.hash).toBe("#/Cs/minor?with=7&on=piano");
      unmount();

      render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C♯ minor seventh");
      expect(screen.getByRole("radio", { name: "Minor" })).toBeChecked();
      expect(screen.getByRole("button", { name: "7" })).toHaveAttribute("aria-pressed", "true");
    });

    it("opens a link to D♭ major", () => {
      open("#/Db/major");
      render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D♭ major");
      expect(chordNotes()).toEqual(["D♭", "F", "A♭"]);
    });

    it("opens a link to a chord built from a base chord and qualities", () => {
      open("#/C/minor?with=7,9");
      render(<App />);
      expect(chordNotes()).toEqual(["C", "E♭", "G", "B♭", "D"]);
      expect(screen.getByRole("radio", { name: "Minor" })).toBeChecked();
      expect(screen.getByRole("button", { name: "9" })).toHaveAttribute("aria-pressed", "true");
    });

    it("opens a free combination and one that does not fit is normalized", () => {
      open("#/C/major?with=7,flat5,flat9");
      const { unmount } = render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C7♭5♭9");
      unmount();

      open("#/C/minor?with=flat5,9");
      render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C minor");
    });

    it("opens a link from before the chord builder", () => {
      open("#/C/dominant7Sharp9");
      render(<App />);
      expect(screen.getByRole("button", { name: "♯9" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "7" })).toHaveAttribute("aria-pressed", "true");
    });

    it("falls back to C major for a broken link", () => {
      open("#/H/whatever");
      render(<App />);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C major");
    });

    it("goes back and forward through the choices", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "D" }));
      await user.click(screen.getByRole("radio", { name: "Minor" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D minor");

      window.history.back();
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D major"),
      );
      window.history.back();
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C major"),
      );
      window.history.forward();
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D major"),
      );
    });

    it("follows a link that is opened while the app is running", async () => {
      render(<App />);
      act(() => {
        window.location.hash = "#/A/scale/naturalMinor?on=guitar";
      });
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
          "A natural minor scale",
        ),
      );
      expect(screen.getByRole("radio", { name: "Guitar" })).toBeChecked();
    });

    it("links to a scale and an inversion", async () => {
      const user = userEvent.setup();
      const { container, unmount } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "1st inversion" }));
      expect(window.location.hash).toBe("#/C/major?on=piano&inv=1");
      unmount();

      render(<App />);
      expect(screen.getByRole("radio", { name: "1st inversion" })).toBeChecked();
      await userEvent.click(screen.getByRole("radio", { name: "Scale" }));
      expect(window.location.hash).toBe("#/C/scale/major?on=piano");
      expect(container).toBeTruthy();
    });

    it("links to a key on the circle of fifths, and to the tab", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
      expect(window.location.hash).toBe("#/circle/C/major");
      await user.click(screen.getByRole("radio", { name: "E♭ major" }));
      expect(window.location.hash).toBe("#/circle/Eb/major");
      unmount();

      render(<App />);
      expect(screen.getByRole("tab", { name: "Circle of fifths" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("E♭ major");
    });

    it("keeps each tab's choice when switching between the tabs", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "A" }));
      await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
      await user.click(screen.getByRole("radio", { name: "D major" }));
      await user.click(screen.getByRole("tab", { name: "Chords & scales" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("A major");
      await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("D major");
    });
  });

  describe("instrument memory", () => {
    it("puts the instrument in the link", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "Guitar" }));
      expect(window.location.hash).toBe("#/C/major?on=guitar");
    });

    it("remembers the instrument for links that do not name one", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "Guitar" }));
      unmount();

      window.history.replaceState(null, "", "#/D/major");
      render(<App />);
      expect(screen.getByRole("radio", { name: "Guitar" })).toBeChecked();
    });

    it("lets a link override the remembered instrument", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "Guitar" }));
      unmount();

      window.history.replaceState(null, "", "#/D/major?on=piano");
      render(<App />);
      expect(screen.getByRole("radio", { name: "Piano" })).toBeChecked();
    });
  });

  describe("tone display", () => {
    /** What the highlighted piano keys say, lowest first. */
    const keyLabels = (container: HTMLElement) =>
      [...container.querySelectorAll('[data-highlighted="true"]')]
        .sort((a, b) => Number(a.getAttribute("data-midi")) - Number(b.getAttribute("data-midi")))
        .map((key) => key.querySelector(".key__label")?.textContent ?? "");

    const choose = (name: string) =>
      userEvent.click(
        within(screen.getByRole("group", { name: "Labels" })).getByRole("radio", { name }),
      );

    it("writes note names by default", () => {
      const { container } = render(<App />);
      expect(
        within(screen.getByRole("group", { name: "Labels" })).getByRole("radio", { name: "Names" }),
      ).toBeChecked();
      expect(keyLabels(container)).toEqual(["C", "E", "G"]);
    });

    it("shows intervals on the keys and puts the choice in the link", async () => {
      const { container } = render(<App />);
      await choose("Intervals");
      expect(keyLabels(container)).toEqual(["R", "3", "5"]);
      expect(window.location.hash).toBe("#/C/major?on=piano&show=intervals");
    });

    it("writes a minor seventh as ♭7, never as ♯6", () => {
      window.history.replaceState(null, "", "#/C/major?with=7&on=piano&show=intervals");
      const { container } = render(<App />);
      expect(keyLabels(container)).toEqual(["R", "3", "5", "♭7"]);
    });

    it("numbers the tones as steps, and the scale degrees on a scale", async () => {
      const { container } = render(<App />);
      await choose("Steps");
      expect(keyLabels(container)).toEqual(["1", "2", "3"]);
      await userEvent.click(screen.getByRole("radio", { name: "Scale" }));
      expect(keyLabels(container).slice(0, 7)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
      expect(window.location.hash).toContain("show=steps");
    });

    it("shows intervals on the guitar neck too", async () => {
      window.history.replaceState(null, "", "#/C/minor?on=guitar&show=intervals");
      const { container } = render(<App />);
      const labels = [...container.querySelectorAll(".fret-dot__label")].map((t) => t.textContent);
      expect(labels.length).toBeGreaterThan(0);
      expect(new Set(labels)).toEqual(new Set(["R", "♭3", "5"]));
    });

    it("shows nothing in practice mode until the answer is asked for", async () => {
      const { container } = render(<App />);
      await choose("None");
      expect(keyLabels(container)).toEqual(["", "", ""]);
      expect(screen.getByRole("img", { name: /tone labels hidden/ })).toBeInTheDocument();

      const reveal = screen.getByRole("button", { name: "Show the notes" });
      expect(reveal).toHaveAttribute("aria-pressed", "false");
      await userEvent.click(reveal);
      expect(keyLabels(container)).toEqual(["C", "E", "G"]);
      expect(screen.getByRole("button", { name: "Hide the notes" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // The answer is hidden again for the next chord.
      await userEvent.click(screen.getByRole("radio", { name: "Minor" }));
      expect(keyLabels(container)).toEqual(["", "", ""]);
    });

    it("hides the answer from the guitar neck's description too", async () => {
      window.history.replaceState(null, "", "#/C/scale/major?on=guitar&show=none");
      const { container } = render(<App />);
      expect(container.querySelectorAll(".fret-dot__label")[0]?.textContent).toBe("");
      expect(screen.getByRole("img", { name: /tone labels hidden/ })).toBeInTheDocument();
    });

    it("remembers the choice for links that do not name one", async () => {
      const { unmount } = render(<App />);
      await choose("Intervals");
      unmount();

      window.history.replaceState(null, "", "#/D/major?on=piano");
      const { container } = render(<App />);
      expect(screen.getByRole("radio", { name: "Intervals" })).toBeChecked();
      expect(keyLabels(container)).toEqual(["R", "3", "5"]);
    });

    it("lets a link override the remembered choice", async () => {
      const { unmount } = render(<App />);
      await choose("Intervals");
      unmount();

      window.history.replaceState(null, "", "#/D/major?on=piano&show=names");
      render(<App />);
      expect(screen.getByRole("radio", { name: "Names" })).toBeChecked();
    });

    it("keeps the choice when switching between chord and scale and between instruments", async () => {
      render(<App />);
      await choose("Intervals");
      await userEvent.click(screen.getByRole("radio", { name: "Scale" }));
      expect(screen.getByRole("radio", { name: "Intervals" })).toBeChecked();
      await userEvent.click(screen.getByRole("radio", { name: "Guitar" }));
      expect(window.location.hash).toContain("show=intervals");
      await userEvent.click(screen.getByRole("radio", { name: "Chord" }));
      expect(screen.getByRole("radio", { name: "Intervals" })).toBeChecked();
    });

    it("still works when storage is blocked", async () => {
      const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const { container } = render(<App />);
      await choose("Intervals");
      expect(keyLabels(container)).toEqual(["R", "3", "5"]);
      blocked.mockRestore();
    });
  });

  describe("enharmonic spelling", () => {
    const spelling = () => within(screen.getByRole("group", { name: "Spelling" }));

    it("only offers a choice for black keys", async () => {
      const user = userEvent.setup();
      render(<App />);
      expect(screen.queryByRole("group", { name: "Spelling" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
      expect(
        spelling()
          .getAllByRole("radio")
          .map((r) => r.closest("label")?.textContent),
      ).toEqual(["C♯", "D♭"]);
      expect(spelling().getByRole("radio", { name: "D♭" })).toBeChecked();
    });

    it("spells C♯ major instead of D♭ major", async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
      await user.click(spelling().getByRole("radio", { name: "C♯" }));

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C♯ major");
      expect(chordNotes()).toEqual(["C♯", "E♯", "G♯"]);
      expect(highlightedKeys(container)).toEqual(["61:root", "65:third", "68:fifth"]);
      expect(window.location.hash).toBe("#/Cs/major?on=piano");
    });

    it("keeps the chosen spelling when the quality changes, and shows it on every symbol", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
      await user.click(spelling().getByRole("radio", { name: "C♯" }));
      await user.click(screen.getByRole("button", { name: "7" }));
      expect(chordNotes()[0]).toBe("C♯");
      expect(screen.getByRole("radio", { name: "Major" }).closest("label")?.textContent).toBe("C♯");
    });

    it("goes back to the automatic spelling when another root is picked", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "C♯/D♭" }));
      await user.click(spelling().getByRole("radio", { name: "C♯" }));
      await user.click(screen.getByRole("radio", { name: "D♯/E♭" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("E♭ major");
    });

    it("spells scales and keeps the spelling when switching to the scale", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "F♯/G♭" }));
      await user.click(spelling().getByRole("radio", { name: "G♭" }));
      await user.click(screen.getByRole("radio", { name: "Scale" }));
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("G♭ major scale");
      expect(scaleNotes()).toEqual(["G♭", "A♭", "B♭", "C♭", "D♭", "E♭", "F"]);
    });
  });

  describe("piano on a narrow screen", () => {
    const viewBox = (container: HTMLElement) =>
      container.querySelector("svg")?.getAttribute("viewBox");

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const narrow = (matches: boolean) =>
      vi.stubGlobal("matchMedia", () => ({
        matches,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));

    it("shows the whole keyboard on a wide screen", () => {
      narrow(false);
      const { container } = render(<App />);
      expect(viewBox(container)).toBe("-1 -1 562 162");
    });

    it("shows only the part around the chord on a narrow screen", () => {
      narrow(true);
      const { container } = render(<App />);
      // C–E–G plus a key to spare on each side, at least 8 white keys wide, clamped to the left end.
      expect(viewBox(container)).toBe("-1 -1 322 162");
      expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(3);
    });

    it("stays inside the keyboard for a chord near the end", async () => {
      narrow(true);
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole("radio", { name: "B" }));
      const [x, , width] = (viewBox(container) ?? "").split(" ").map(Number);
      expect(x).toBeGreaterThanOrEqual(-1);
      expect((x ?? 0) + (width ?? 0)).toBeLessThanOrEqual(562);
    });
  });
});

describe("playback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("plays the chord in its current inversion", async () => {
    const freqs: number[] = [];
    class FakeContext {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        const osc = {
          type: "",
          set frequency(_: unknown) {},
          get frequency() {
            return {
              set value(v: number) {
                freqs.push(Math.round(v));
              },
            };
          },
          connect: (n: unknown) => n,
          start: () => {},
          stop: () => {},
        };
        return osc;
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: (n: unknown) => n,
        };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Play C major together" }));
    expect(freqs).toEqual([262, 330, 392]);
  });

  it("offers no buttons without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    render(<App />);
    expect(screen.queryByRole("group", { name: "Listen" })).not.toBeInTheDocument();
  });
});

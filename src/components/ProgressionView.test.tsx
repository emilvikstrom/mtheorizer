import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Note, type ProgressionId, note } from "../theory";
import { ProgressionView } from "./ProgressionView";

const opened = vi.fn();

/** Every oscillator started through the fake Web Audio below: when, and at what frequency. */
const starts: { at: number; hz: number }[] = [];

// The audio module keeps the first context it creates, so every test shares one fake class.
class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createOscillator() {
    const osc = {
      type: "",
      frequency: { value: 0 },
      connect: (n: unknown) => n,
      start: (at: number) => starts.push({ at, hz: osc.frequency.value }),
      stop: () => undefined,
    };
    return osc;
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
      connect: (n: unknown) => n,
    };
  }
  resume() {
    return Promise.resolve();
  }
}

function Harness({
  start = note("C"),
  startId = "pop",
}: {
  start?: Note;
  startId?: ProgressionId;
}) {
  const [tonic, setTonic] = useState(start);
  const [id, setId] = useState<ProgressionId>(startId);
  return (
    <ProgressionView
      tonic={tonic}
      id={id}
      onChange={(t, i) => {
        setTonic(t);
        setId(i);
      }}
      onOpenChord={opened}
    />
  );
}

const chords = () =>
  within(screen.getByRole("list", { name: "Chords of the progression" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("ProgressionView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    opened.mockReset();
  });

  it("starts with I–V–vi–IV in C major, with step numbers", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("I–V–vi–IV in C major");
    expect(chords()).toEqual(["IC", "VG", "viAm", "IVF"]);
  });

  it("spells the chords in the chosen tonic", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "G♯/A♭" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("in A♭ major");
    expect(chords()).toEqual(["IA♭", "VE♭", "viFm", "IVD♭"]);
  });

  it("offers a choice of spelling for a black key and follows it", async () => {
    const user = userEvent.setup();
    render(<Harness start={note("D", -1)} />);
    expect(chords()).toEqual(["ID♭", "VA♭", "viB♭m", "IVG♭"]);
    await user.click(screen.getByRole("radio", { name: "C♯" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("in C♯ major");
    expect(chords()).toEqual(["IC♯", "VG♯", "viA♯m", "IVF♯"]);
  });

  it("shows the 12-bar blues as twelve bars", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /^12-bar blues:/ }));
    expect(chords()).toEqual([
      "I7C7",
      "I7C7",
      "I7C7",
      "I7C7",
      "IV7F7",
      "IV7F7",
      "I7C7",
      "I7C7",
      "V7G7",
      "IV7F7",
      "I7C7",
      "V7G7",
    ]);
  });

  it("keeps the tonic's spelling when the progression is in another tonality", async () => {
    const user = userEvent.setup();
    render(<Harness start={note("E", -1)} />);
    await user.click(screen.getByRole("button", { name: /^Aeolian loop:/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("in E♭ minor");
    expect(chords()).toEqual(["iE♭m", "♭VIC♭", "♭IIIG♭", "♭VIID♭"]);
  });

  it("respells the tonic when it would not read well in the new tonality", async () => {
    const user = userEvent.setup();
    render(<Harness start={note("D", -1)} />);
    await user.click(screen.getByRole("button", { name: /^Classical minor:/ }));
    // D♭ harmonic minor would need eight flats and a double flat.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "i–iv–V–i in C♯ harmonic minor",
    );
    expect(chords()).toEqual(["iC♯m", "ivF♯m", "VG♯", "iC♯m"]);
  });

  it("finds progressions by keyword and tonality", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const list = () =>
      within(screen.getByRole("list", { name: "Progressions" }))
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label"));
    await user.click(screen.getByRole("button", { name: "metal", pressed: false }));
    expect(list().every((name) => /phrygian|minor/.test(name ?? ""))).toBe(true);
    await user.click(screen.getByRole("button", { name: "loop", pressed: false }));
    expect(list()).toEqual([
      "Minor climb: i–♭VI–♭VII–i, minor",
      "Phrygian vamp: i–♭II, phrygian",
      "Phrygian riff: i–♭II–♭III–♭II, phrygian",
    ]);
    await user.click(screen.getByRole("radio", { name: "Phrygian" }));
    expect(list()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Phrygian vamp: i–♭II, phrygian" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("i–♭II in C phrygian");
    expect(chords()).toEqual(["iCm", "♭IID♭"]);
    await user.click(screen.getByRole("button", { name: "Clear keywords" }));
    await user.click(screen.getByRole("radio", { name: "Any" }));
    expect(list().length).toBeGreaterThan(30);
  });

  it("hides cadences and chromatic chords for a mode, which are about major and minor keys", async () => {
    const user = userEvent.setup();
    render(<Harness startId="dorianVamp" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("i7–IV7 in C dorian");
    expect(chords()).toEqual(["i7Cm7", "IV7F7"]);
    expect(screen.queryByText(/Cadences in/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Pop progression:/ }));
    expect(screen.getByText("Cadences in C major")).toBeInTheDocument();
  });

  it("opens the builder with the progression's chords when they all belong to the tonality", async () => {
    const build = vi.fn();
    const user = userEvent.setup();
    render(
      <ProgressionView
        tonic={note("D")}
        id="dorianLoop"
        onChange={() => {}}
        onBuild={build}
        onOpenChord={opened}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit this progression" }));
    expect(build).toHaveBeenCalledWith({ tonic: note("D"), scale: "dorian" }, [
      { degree: 1, size: "triad" },
      { degree: 7, size: "triad" },
      { degree: 4, size: "triad" },
      { degree: 1, size: "triad" },
    ]);
  });

  it("opens a chord in the chord view", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open Am in Chords" }));
    expect(opened).toHaveBeenCalledWith(note("A"), "minor");
  });

  it("plays the progression and a cadence through Web Audio", async () => {
    starts.length = 0;
    vi.stubGlobal("AudioContext", FakeContext);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Play I–V–vi–IV in C major" }));
    // Four triads, three tones each, one block of tones per chord.
    expect(starts).toHaveLength(12);
    expect(new Set(starts.map((t) => +t.at.toFixed(3))).size).toBe(4);

    // A cadence is two chords: two triads of three tones, in two blocks.
    starts.length = 0;
    await user.click(screen.getByRole("button", { name: "Play authentic cadence in C major" }));
    expect(starts).toHaveLength(6);
    expect(new Set(starts.map((t) => +t.at.toFixed(3))).size).toBe(2);
  });

  const voiceLeadingSteps = () =>
    within(screen.getByRole("list", { name: "Voice leading between the chords" }))
      .getAllByRole("listitem")
      .map(
        (item) =>
          (item.querySelector(".voice-leading__chords")?.textContent ?? "") +
          (item.querySelector(".voice-leading__text")?.textContent ?? ""),
      );

  it("shows how the chords move once smooth voicing is on", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "Smooth voicing" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("list", { name: "Voice leading between the chords" }),
    ).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    // C → G keeps G; G → Am moves every tone up a step; Am → F keeps C and A.
    expect(voiceLeadingSteps()).toEqual([
      "C → GG stays · C → B · E → D · 3 semitones in total",
      "G → AmB → C · D → E · G → A · 5 semitones in total",
      "Am → FC and A stay · E → F · 1 semitone in total",
    ]);

    await user.click(toggle);
    expect(
      screen.queryByRole("list", { name: "Voice leading between the chords" }),
    ).not.toBeInTheDocument();
  });

  it("draws each step on two keyboards with a line for every tone", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Smooth voicing" }));
    const steps = within(
      screen.getByRole("list", { name: "Voice leading between the chords" }),
    ).getAllByRole("listitem");

    // C → G: G stays, C → B (down 1), E → D (down 2).
    const first = steps[0] as HTMLElement;
    const piano = within(first).getByRole("img", {
      name: "Voice leading from C to G: G stays · C → B · E → D · 3 semitones in total",
    });
    const kinds = [...piano.querySelectorAll("[data-kind]")].map((el) =>
      el.getAttribute("data-kind"),
    );
    expect(kinds.sort()).toEqual(["down", "down", "stay"]);
    // The distance is written out, so the direction does not rest on the arrow or colour.
    const labels = [...piano.querySelectorAll(".voice-link__label")].map((el) => el.textContent);
    expect(labels.sort()).toEqual(["stays", "−1", "−2"]);
    // Both chords are on the keyboards: three highlighted keys on each.
    expect(piano.querySelectorAll('[data-row="from"] [data-highlighted]')).toHaveLength(3);
    expect(piano.querySelectorAll('[data-row="to"] [data-highlighted]')).toHaveLength(3);

    // Am → F: C and A stay, E → F.
    const last = within(steps[2] as HTMLElement).getByRole("img");
    const lastKinds = [...last.querySelectorAll("[data-kind]")].map((el) =>
      el.getAttribute("data-kind"),
    );
    expect(lastKinds.sort()).toEqual(["stay", "stay", "up"]);
  });

  it("plays the progression close together when smooth voicing is on", async () => {
    starts.length = 0;
    vi.stubGlobal("AudioContext", FakeContext);
    const user = userEvent.setup();
    render(<Harness />);
    const secondChord = () => {
      const times = [...new Set(starts.map((s) => +s.at.toFixed(3)))].sort((a, b) => a - b);
      return starts.filter((s) => +s.at.toFixed(3) === times[1]).map((s) => s.hz);
    };

    // In root position G major sounds from G4 (392 Hz) up to D5.
    await user.click(screen.getByRole("button", { name: "Play I–V–vi–IV in C major" }));
    expect(Math.max(...secondChord())).toBeGreaterThan(550);

    // Smoothly voiced it sounds B3–D4–G4, just under the C major chord, so nothing goes above G4.
    starts.length = 0;
    await user.click(screen.getByRole("button", { name: "Smooth voicing" }));
    await user.click(
      screen.getByRole("button", { name: "Play I–V–vi–IV in C major with smooth voicing" }),
    );
    expect(starts).toHaveLength(12);
    expect(Math.max(...secondChord())).toBeLessThan(400);
  });

  it("hides the play button when the browser has no Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /^Play / })).not.toBeInTheDocument();
  });

  const cadenceList = () =>
    within(screen.getByRole("region", { name: /^Cadences in/ })).getAllByRole("listitem");

  it("shows the four cadences in the key of the progression", () => {
    render(<Harness />);
    expect(screen.getByRole("region", { name: "Cadences in C major" })).toBeInTheDocument();
    expect(cadenceList().map((item) => item.textContent)).toEqual([
      expect.stringContaining("AuthenticV–I: G → C"),
      expect.stringContaining("PlagalIV–I: F → C"),
      expect.stringContaining("HalfI–V: C → G"),
      expect.stringContaining("DeceptiveV–vi: G → Am"),
    ]);
  });

  it("spells the cadences of a minor progression with the harmonic-minor dominant", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /^Aeolian loop:/ }));
    expect(screen.getByRole("region", { name: "Cadences in C minor" })).toBeInTheDocument();
    expect(cadenceList().map((item) => item.textContent)).toEqual([
      expect.stringContaining("AuthenticV–i: G → Cm"),
      expect.stringContaining("Plagaliv–i: Fm → Cm"),
      expect.stringContaining("Halfi–V: Cm → G"),
      expect.stringContaining("DeceptiveV–♭VI: G → A♭"),
    ]);
  });

  it("follows the tonic", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "G♯/A♭" }));
    expect(cadenceList()[0]).toHaveTextContent("AuthenticV–I: E♭ → A♭");
  });

  it("lists the chromatic chords of the progression's key, moved here from the circle", () => {
    render(<Harness />);
    expect(
      screen.getByRole("heading", { name: "Chromatic chords in C major" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Secondary leading-tone chords" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Chromatic chords" })).toBeInTheDocument();
  });
});

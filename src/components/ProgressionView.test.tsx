import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Note, type ProgressionId, note } from "../theory";
import { ProgressionView } from "./ProgressionView";

const opened = vi.fn();

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
    await user.click(screen.getByRole("radio", { name: "12-bar blues" }));
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

  it("respells the key when the progression is in the other mode", async () => {
    const user = userEvent.setup();
    render(<Harness start={note("E", -1)} />);
    await user.click(screen.getByRole("radio", { name: "i–♭VI–♭III–♭VII" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("in E♭ minor");
    expect(chords()).toEqual(["iE♭m", "♭VIC♭", "♭IIIG♭", "♭VIID♭"]);
  });

  it("opens a chord in the chord view", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open Am in Chords & scales" }));
    expect(opened).toHaveBeenCalledWith(note("A"), "minor");
  });

  it("plays the progression and a cadence through Web Audio", async () => {
    const started: number[] = [];
    class FakeContext {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: "",
          frequency: { value: 0 },
          connect: (n: unknown) => n,
          start: (at: number) => started.push(at),
          stop: () => undefined,
        };
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
    vi.stubGlobal("AudioContext", FakeContext);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Play I–V–vi–IV in C major" }));
    // Four triads, three tones each, one block of tones per chord.
    expect(started).toHaveLength(12);
    expect(new Set(started.map((t) => +t.toFixed(3))).size).toBe(4);

    // A cadence is two chords: two triads of three tones, in two blocks.
    started.length = 0;
    await user.click(screen.getByRole("button", { name: "Play authentic cadence in C major" }));
    expect(started).toHaveLength(6);
    expect(new Set(started.map((t) => +t.toFixed(3))).size).toBe(2);
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
    await user.click(screen.getByRole("radio", { name: "i–♭VI–♭III–♭VII" }));
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
});

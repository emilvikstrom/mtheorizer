import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { stopPlayback } from "../audio/playback";
import { TUNINGS } from "../theory";
import { Fretboard } from "./Fretboard";
import { Piano } from "./Piano";

const legend = { root: "Root", tone: "Chord tone" };

/** MIDI numbers of the piano keys marked as sounding. */
const soundingKeys = (container: HTMLElement) =>
  [...container.querySelectorAll('.key[data-sounding="true"]')]
    .map((key) => Number(key.getAttribute("data-midi")))
    .sort((a, b) => a - b);

class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  createOscillator() {
    return {
      type: "",
      frequency: { value: 0 },
      connect: (n: unknown) => n,
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: (n: unknown) => n,
    };
  }
  createBiquadFilter() {
    return {
      type: "",
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (n: unknown) => n,
    };
  }
}

describe("the keyboard marks tones that sound", () => {
  const tones = [
    { midi: 60, note: { letter: "C", accidental: 0 }, role: "root", isRoot: true },
    { midi: 64, note: { letter: "E", accidental: 0 }, role: "3rd", isRoot: false },
  ] as never;

  it("marks only the highlighted keys that sound, with a bar besides the colour", () => {
    const { container } = render(
      <Piano tones={tones} name="C major" legend={legend} sounding={new Set([60, 62])} />,
    );
    expect(soundingKeys(container)).toEqual([60]);
    expect(container.querySelectorAll(".key__sounding")).toHaveLength(1);
  });

  it("marks nothing when nothing sounds", () => {
    const { container } = render(<Piano tones={tones} name="C major" legend={legend} />);
    expect(soundingKeys(container)).toEqual([]);
    expect(container.querySelector(".key__sounding")).toBeNull();
  });
});

describe("the neck marks tones that sound", () => {
  it("rings the dots with the pitch class of a sounding tone", () => {
    const view = {
      firstFret: 0,
      frets: 4,
      muted: [],
      positions: [
        {
          midi: 52,
          note: { letter: "E", accidental: 0 },
          role: "root",
          isRoot: true,
          string: 6,
          fret: 0,
        },
        {
          midi: 55,
          note: { letter: "G", accidental: 0 },
          role: "3rd",
          isRoot: false,
          string: 5,
          fret: 0,
        },
      ],
    } as never;
    const { container } = render(
      <Fretboard
        views={[view]}
        kind="position"
        tones={[]}
        name="E minor"
        legend={legend}
        tuning={TUNINGS.standard}
        left={false}
        // An E an octave above the neck's still marks the E on the neck.
        sounding={new Set([64])}
      />,
    );
    const marked = [...container.querySelectorAll('.fret-dot[data-sounding="true"]')];
    expect(marked.map((dot) => dot.getAttribute("data-string"))).toEqual(["6"]);
    expect(container.querySelectorAll(".fret-dot__sounding")).toHaveLength(1);
  });
});

describe("playing a chord in the app", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", FakeContext);
    window.location.hash = "#/C/major";
  });
  afterEach(() => {
    stopPlayback();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("lights the keys while the chord sounds and puts them out afterwards", () => {
    const { container } = render(<App />);
    expect(soundingKeys(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Play C major together" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(soundingKeys(container)).toEqual([60, 64, 67]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(soundingKeys(container)).toEqual([]);
  });

  it("steps up through a broken chord", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Play C major broken" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(soundingKeys(container)).toEqual([60]);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(soundingKeys(container)).toEqual([60, 64]);
  });

  it("puts the keys out at once when another chord is chosen", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Play C major together" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(soundingKeys(container)).toHaveLength(3);
    act(() => {
      window.location.hash = "#/D/minor";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(soundingKeys(container)).toEqual([]);
  });
});

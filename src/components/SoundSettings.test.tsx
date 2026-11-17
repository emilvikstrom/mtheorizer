import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS, getAudioSettings, resetAudioSettings } from "../audio/settings";
import { PlayButtons } from "./PlayButtons";
import { SoundSettings } from "./SoundSettings";

beforeEach(() => {
  window.localStorage.clear();
  resetAudioSettings();
  vi.stubGlobal("AudioContext", class {});
});
afterEach(() => vi.unstubAllGlobals());

describe("SoundSettings", () => {
  it("is hidden when the browser has no Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { container } = render(<SoundSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts with the default settings", () => {
    render(<SoundSettings />);
    expect(screen.getByLabelText("Sound")).toHaveValue(DEFAULT_AUDIO_SETTINGS.timbre);
    expect(screen.getByLabelText(/tempo/i)).toHaveValue("1");
    expect(screen.getByLabelText(/volume/i)).toHaveValue("0.8");
    expect(screen.getByLabelText("A4 (Hz)")).toHaveValue(440);
  });

  it("changes the sound and remembers it", async () => {
    render(<SoundSettings />);
    await userEvent.selectOptions(screen.getByLabelText("Sound"), "pluck");
    expect(getAudioSettings().timbre).toBe("pluck");
    expect(window.localStorage.getItem("mtheorizer.audio")).toContain('"timbre":"pluck"');
  });

  it("changes tempo, volume and tuning and shows the new values", () => {
    render(<SoundSettings />);
    fireEvent.change(screen.getByLabelText(/tempo/i), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText(/volume/i), { target: { value: "0.5" } });
    fireEvent.change(screen.getByLabelText("A4 (Hz)"), { target: { value: "432" } });
    expect(getAudioSettings()).toMatchObject({ tempo: 1.5, volume: 0.5, reference: 432 });
    expect(screen.getByText("Tempo 150%")).toBeInTheDocument();
    expect(screen.getByText("Volume 50%")).toBeInTheDocument();
  });

  it("keeps the tuning while the field is empty and limits it to a sensible range", () => {
    render(<SoundSettings />);
    const field = screen.getByLabelText("A4 (Hz)");
    fireEvent.change(field, { target: { value: "" } });
    expect(getAudioSettings().reference).toBe(440);
    fireEvent.change(field, { target: { value: "9000" } });
    expect(getAudioSettings().reference).toBe(480);
  });

  it("goes back to the defaults on Reset", async () => {
    render(<SoundSettings />);
    await userEvent.selectOptions(screen.getByLabelText("Sound"), "sine");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(getAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(screen.getByLabelText("Sound")).toHaveValue(DEFAULT_AUDIO_SETTINGS.timbre);
  });

  it("sits next to the listen buttons", () => {
    render(<PlayButtons midis={[60, 64, 67]} kind="chord" name="C major" />);
    expect(screen.getByRole("group", { name: "Listen" })).toContainElement(
      screen.getByText("Sound settings"),
    );
  });
});

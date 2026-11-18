import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MidiInput } from "./MidiInput";
import type { MidiNavigator } from "../midiAccess";

type Message = { data: Uint8Array | null };

/** A fake Web MIDI access with one keyboard that the test can play. */
function fakeMidi(names: string[] = ["Test Keys"]) {
  const inputs = names.map((name) => ({
    name,
    onmidimessage: null as ((e: Message) => void) | null,
  }));
  const access = {
    inputs: { values: () => inputs[Symbol.iterator]() },
    onstatechange: null as (() => void) | null,
  };
  const nav: MidiNavigator = { requestMIDIAccess: vi.fn(async () => access) };
  const send = (...bytes: number[]) =>
    act(() => inputs[0]!.onmidimessage?.({ data: new Uint8Array(bytes) }));
  return { nav, access, inputs, send };
}

const chords = () => document.querySelector(".midi__chords");

describe("MidiInput", () => {
  it("shows nothing when the browser has no Web MIDI", () => {
    const { container } = render(<MidiInput onUse={() => {}} nav={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not ask for access until the button is pressed", async () => {
    const user = userEvent.setup();
    const { nav } = fakeMidi();
    render(<MidiInput onUse={() => {}} nav={nav} />);
    expect(nav.requestMIDIAccess).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    expect(nav.requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Connected: Test Keys")).toBeInTheDocument();
  });

  it("explains calmly when access is denied", async () => {
    const user = userEvent.setup();
    const nav: MidiNavigator = {
      requestMIDIAccess: vi.fn(async () => {
        throw new Error("SecurityError");
      }),
    };
    render(<MidiInput onUse={() => {}} nav={nav} />);
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    expect(await screen.findByText(/did not allow MIDI access/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect a MIDI keyboard" })).toBeEnabled();
  });

  it("names the chord played and keeps it after release", async () => {
    const user = userEvent.setup();
    const { nav, send } = fakeMidi();
    render(<MidiInput onUse={() => {}} nav={nav} />);
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    await screen.findByText("Connected: Test Keys");
    expect(screen.getByText("Play some notes on your keyboard.")).toBeInTheDocument();

    send(0x90, 60, 90);
    expect(screen.getByText("One note is not a chord yet.")).toBeInTheDocument();
    send(0x90, 64, 90);
    send(0x90, 67, 90);
    expect(chords()).toHaveTextContent("Sounds like C");
    send(0x80, 60, 0);
    send(0x90, 64, 0);
    send(0x80, 67, 0);
    expect(chords()).toHaveTextContent("Sounds like C");
  });

  it("changes the finder's keys only when 'Use these keys' is pressed", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const { nav, send } = fakeMidi();
    render(<MidiInput onUse={onUse} nav={nav} />);
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    await screen.findByText("Connected: Test Keys");
    expect(screen.getByRole("button", { name: "Use these keys" })).toBeDisabled();

    send(0x90, 69, 90);
    send(0x90, 72, 90);
    send(0x90, 76, 90);
    expect(onUse).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Use these keys" }));
    expect(onUse).toHaveBeenCalledWith([69, 72, 76]);
  });

  it("gives a calm message when the keyboard is unplugged mid-session", async () => {
    const user = userEvent.setup();
    const { nav, access, inputs } = fakeMidi();
    render(<MidiInput onUse={() => {}} nav={nav} />);
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    await screen.findByText("Connected: Test Keys");

    inputs.length = 0;
    act(() => access.onstatechange?.());
    expect(screen.getByText(/No MIDI keyboard is connected/)).toBeInTheDocument();
  });

  it("disconnects and stops listening", async () => {
    const user = userEvent.setup();
    const { nav, inputs } = fakeMidi();
    render(<MidiInput onUse={() => {}} nav={nav} />);
    await user.click(screen.getByRole("button", { name: "Connect a MIDI keyboard" }));
    await screen.findByText("Connected: Test Keys");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(inputs[0]!.onmidimessage).toBeNull();
    expect(screen.getByRole("button", { name: "Connect a MIDI keyboard" })).toBeInTheDocument();
  });
});

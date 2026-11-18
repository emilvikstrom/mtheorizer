/** The part of the Web MIDI API this app uses. */
interface MidiInputPort {
  readonly name: string | null;
  onmidimessage: ((event: { readonly data: Uint8Array | null }) => void) | null;
}

interface MidiAccessLike {
  readonly inputs: { values(): Iterable<MidiInputPort> };
  onstatechange: (() => void) | null;
}

export interface MidiNavigator {
  requestMIDIAccess?: () => Promise<MidiAccessLike>;
}

/** The browser's own `navigator`, seen through the parts of Web MIDI this app uses. */
const browserNavigator = (): MidiNavigator => navigator as unknown as MidiNavigator;

/** Does this browser have Web MIDI? (Not Safari, and Firefox only after an add-on prompt.) */
export const midiSupported = (nav: MidiNavigator = browserNavigator()): boolean =>
  typeof nav.requestMIDIAccess === "function";

export interface MidiConnection {
  readonly close: () => void;
}

export type MidiFailure = "unsupported" | "denied";

/**
 * Asks for access to the MIDI keyboards, which makes the browser prompt. Messages
 * from every input go to `onMessage`; `onInputs` gets the names of the connected
 * keyboards now and every time one is plugged in or removed.
 * Rejects with "unsupported" or "denied".
 */
export async function connectMidi(
  onMessage: (data: Uint8Array) => void,
  onInputs: (names: readonly string[]) => void,
  nav: MidiNavigator = browserNavigator(),
): Promise<MidiConnection> {
  if (!nav.requestMIDIAccess) throw "unsupported" satisfies MidiFailure;
  let access: MidiAccessLike;
  try {
    access = await nav.requestMIDIAccess();
  } catch {
    throw "denied" satisfies MidiFailure;
  }
  const attach = () => {
    const names: string[] = [];
    for (const input of access.inputs.values()) {
      input.onmidimessage = (event) => {
        if (event.data) onMessage(event.data);
      };
      names.push(input.name ?? "MIDI keyboard");
    }
    onInputs(names);
  };
  access.onstatechange = attach;
  attach();
  return {
    close() {
      access.onstatechange = null;
      for (const input of access.inputs.values()) input.onmidimessage = null;
    },
  };
}

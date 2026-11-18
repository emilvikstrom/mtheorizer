/**
 * MIDI input, in two layers. This file is the pure part: reading raw messages and
 * keeping track of which notes are held. `midiAccess.ts` is the thin browser wrapper.
 */

/** A note on or off message. Other messages (clock, controllers, pitch bend) are ignored. */
export interface MidiNoteMessage {
  readonly type: "on" | "off";
  /** MIDI note number, 0–127. Middle C is 60. */
  readonly note: number;
  readonly channel: number;
}

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;

/**
 * Reads one raw MIDI message. A note on with velocity 0 is a note off, which is how
 * many keyboards release keys. Returns undefined for anything that is not a note.
 */
export function parseMidiMessage(data: ArrayLike<number>): MidiNoteMessage | undefined {
  if (data.length < 3) return undefined;
  const status = data[0]!;
  const note = data[1]!;
  const velocity = data[2]!;
  if (note > 127) return undefined;
  const kind = status & 0xf0;
  const channel = status & 0x0f;
  if (kind === NOTE_OFF) return { type: "off", note, channel };
  if (kind === NOTE_ON) return { type: velocity === 0 ? "off" : "on", note, channel };
  return undefined;
}

/**
 * The keys that are down now, and the chord to show. The chord is the notes of the
 * latest group of keys played together: it stays on screen after the keys are
 * released and is replaced when the next key goes down with all keys up.
 */
export interface HeldNotes {
  readonly down: readonly number[];
  readonly shown: readonly number[];
}

export const NO_HELD_NOTES: HeldNotes = { down: [], shown: [] };

export function applyNote(state: HeldNotes, message: MidiNoteMessage): HeldNotes {
  const { note } = message;
  if (message.type === "off") {
    return state.down.includes(note)
      ? { ...state, down: state.down.filter((n) => n !== note) }
      : state;
  }
  const fresh = state.down.length === 0;
  const shown = fresh ? [] : state.shown;
  return {
    down: state.down.includes(note) ? state.down : [...state.down, note],
    shown: shown.includes(note) ? shown : [...shown, note].sort((a, b) => a - b),
  };
}

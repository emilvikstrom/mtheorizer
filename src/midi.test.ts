import { describe, expect, it } from "vitest";
import { NO_HELD_NOTES, type HeldNotes, applyNote, parseMidiMessage } from "./midi";
import { identifyChords } from "./theory";

const on = (note: number): HeldNotes => applyNote(NO_HELD_NOTES, { type: "on", note, channel: 0 });
const play = (...events: [type: "on" | "off", note: number][]) =>
  events.reduce<HeldNotes>(
    (state, [type, note]) => applyNote(state, { type, note, channel: 0 }),
    NO_HELD_NOTES,
  );

describe("parseMidiMessage", () => {
  it("reads note on and note off", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: "on", note: 60, channel: 0 });
    expect(parseMidiMessage([0x80, 60, 0])).toEqual({ type: "off", note: 60, channel: 0 });
  });

  it("treats note on with velocity 0 as note off", () => {
    expect(parseMidiMessage([0x90, 64, 0])).toEqual({ type: "off", note: 64, channel: 0 });
  });

  it("reads the channel from every channel's status byte", () => {
    for (let channel = 0; channel < 16; channel++) {
      expect(parseMidiMessage([0x90 | channel, 60, 90])?.channel).toBe(channel);
      expect(parseMidiMessage([0x80 | channel, 60, 0])?.type).toBe("off");
    }
  });

  it.each([
    ["control change", [0xb0, 64, 127]],
    ["pitch bend", [0xe0, 0, 64]],
    ["program change", [0xc0, 5]],
    ["clock", [0xf8]],
    ["empty", []],
    ["a note number out of range", [0x90, 200, 90]],
  ])("ignores %s", (_name, data) => {
    expect(parseMidiMessage(data)).toBeUndefined();
  });

  it("accepts a Uint8Array", () => {
    expect(parseMidiMessage(new Uint8Array([0x90, 72, 1]))?.note).toBe(72);
  });
});

describe("applyNote", () => {
  it("collects keys held together, lowest first", () => {
    const state = play(["on", 67], ["on", 60], ["on", 64]);
    expect(state.down).toEqual([67, 60, 64]);
    expect(state.shown).toEqual([60, 64, 67]);
  });

  it("keeps showing the chord after the keys are released", () => {
    const state = play(["on", 60], ["on", 64], ["on", 67], ["off", 67], ["off", 64], ["off", 60]);
    expect(state.down).toEqual([]);
    expect(state.shown).toEqual([60, 64, 67]);
  });

  it("starts a new chord when a key goes down with all keys up", () => {
    const state = play(["on", 60], ["on", 64], ["off", 60], ["off", 64], ["on", 62]);
    expect(state.shown).toEqual([62]);
  });

  it("keeps adding while any key is still held (arpeggios and legato)", () => {
    const state = play(["on", 60], ["on", 64], ["off", 60], ["on", 67]);
    expect(state.shown).toEqual([60, 64, 67]);
  });

  it("ignores a release of a key that was not down and a repeated press", () => {
    expect(play(["off", 60])).toEqual(NO_HELD_NOTES);
    const once = on(60);
    expect(applyNote(once, { type: "on", note: 60, channel: 0 })).toEqual(once);
  });

  it("identifies the played chord for every root, with the lowest key as bass", () => {
    const majorTriad = [0, 4, 7];
    for (let root = 0; root < 12; root++) {
      const state = play(...majorTriad.map((i): ["on", number] => ["on", 48 + root + i]));
      const pcs = state.shown.map((n) => n % 12);
      const [best] = identifyChords(pcs, { bass: state.shown[0]! % 12 });
      expect(best?.chord.quality.id).toBe("major");
      expect(best?.inverted).toBe(false);
    }
  });

  it("names an inversion as a slash chord", () => {
    const state = play(["on", 52], ["on", 55], ["on", 60]); // E G C
    const [best] = identifyChords(
      state.shown.map((n) => n % 12),
      { bass: state.shown[0]! % 12 },
    );
    expect(best?.symbol).toBe("C/E");
  });
});

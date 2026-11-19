import { describe, expect, it } from "vitest";
import { chordOnPitchClass } from "./chords";
import {
  FRET_WINDOW_STARTS,
  MAX_PICK_FRET,
  STRING_INSTRUMENT_IDS,
  TUNINGS,
  formatPicks,
  openStringMidi,
  parsePicks,
  pickedMidi,
  togglePick,
  tuningFor,
} from "./fretboard";
import { chordShapes, lowestString } from "./guitarShapes";
import { identifyChords } from "./identify";
import { chordHighlights } from "./voicing";

const E_MAJOR_OPEN = [
  { string: 6, fret: 0 },
  { string: 5, fret: 2 },
  { string: 4, fret: 2 },
  { string: 3, fret: 1 },
  { string: 2, fret: 0 },
  { string: 1, fret: 0 },
];

describe("pressing places on the neck", () => {
  it("sounds the pressed places lowest first, in the tuning of the instrument", () => {
    // Open E major on a guitar: E2 B2 E3 G♯3 B3 E4.
    expect(pickedMidi(E_MAJOR_OPEN)).toEqual([40, 47, 52, 56, 59, 64]);
    // The ukulele has strings 1-4 only (A4 E4 C4 G4); strings 5 and 6 are ignored.
    expect(pickedMidi(E_MAJOR_OPEN, TUNINGS.ukulele.strings)).toEqual([61, 64, 69, 69]);
  });

  it("sounds nothing when nothing is pressed", () => {
    expect(pickedMidi([])).toEqual([]);
  });

  it("lets a string sound one note, and lets go when the same place is pressed again", () => {
    const first = togglePick([], { string: 2, fret: 3 });
    expect(first).toEqual([{ string: 2, fret: 3 }]);
    expect(togglePick(first, { string: 2, fret: 5 })).toEqual([{ string: 2, fret: 5 }]);
    expect(togglePick(first, { string: 2, fret: 3 })).toEqual([]);
    expect(togglePick(first, { string: 1, fret: 0 }).map((p) => p.string)).toEqual([1, 2]);
  });

  it.each(Object.values(TUNINGS))(
    "puts the bass on the lowest string of $instrument $label",
    (tuning) => {
      const low = lowestString(tuning.strings);
      const lowOpen = openStringMidi(tuning.strings[low - 1]!);
      for (let root = 0; root < 12; root++) {
        const fret = (root - (lowOpen % 12) + 12) % 12;
        const picks = [
          { string: low, fret },
          ...tuning.strings
            .map((_, i) => ({ string: i + 1, fret: 12 }))
            .filter((p) => p.string !== low),
        ];
        const [bass] = pickedMidi(picks, tuning.strings);
        // A fret on another string can sound lower only if that string is lower; the lowest one is not.
        expect(bass! % 12).toBe(root);
      }
    },
  );

  it.each(STRING_INSTRUMENT_IDS)(
    "names a major chord from every grip found on the %s",
    (instrument) => {
      const tuning = tuningFor(instrument);
      for (let root = 0; root < 12; root++) {
        const chord = chordOnPitchClass(root, "major");
        for (const grip of chordShapes(chordHighlights(chord), tuning.strings, {
          rootInBass: tuning.rootInBass,
        })) {
          const picks = grip.positions.map((p) => ({ string: p.string, fret: p.fret }));
          const midi = pickedMidi(picks, tuning.strings);
          const found = identifyChords(
            midi.map((m) => m % 12),
            { bass: midi[0]! % 12 },
          );
          expect(found.map((m) => m.chord.quality.id)).toContain("major");
        }
      }
    },
  );
});

describe("picks in a link", () => {
  it("formats places as string.fret", () => {
    expect(formatPicks([])).toBe("");
    expect(formatPicks(E_MAJOR_OPEN)).toBe("6.0,5.2,4.2,3.1,2.0,1.0");
  });

  it("goes round trip for every instrument, every string and every fret", () => {
    for (const id of STRING_INSTRUMENT_IDS) {
      const count = tuningFor(id).strings.length;
      const all = Array.from({ length: count }, (_, i) => i + 1);
      for (let fret = 0; fret <= MAX_PICK_FRET; fret++) {
        // One place on each string, at a fret that differs from string to string.
        const picks = all.map((string) => ({
          string,
          fret: (fret + string) % (MAX_PICK_FRET + 1),
        }));
        expect(parsePicks(formatPicks(picks), count)).toEqual(picks);
        for (const string of all) {
          expect(parsePicks(formatPicks([{ string, fret }]), count)).toEqual([{ string, fret }]);
        }
      }
    }
  });

  it("drops what the instrument cannot press", () => {
    expect(parsePicks(null, 6)).toEqual([]);
    expect(parsePicks("", 6)).toEqual([]);
    expect(parsePicks("5.2,x,1,1.,.3,1.-1,1.2.3", 6)).toEqual([{ string: 5, fret: 2 }]);
    // No fifth string on the ukulele, nothing above fret 24, no string 0.
    expect(parsePicks("5.0,4.0,0.1,3.25,2.24", 4)).toEqual([
      { string: 2, fret: 24 },
      { string: 4, fret: 0 },
    ]);
  });

  it("keeps the first place on a string and sorts by string", () => {
    expect(parsePicks("3.2,1.0,3.5", 6)).toEqual([
      { string: 1, fret: 0 },
      { string: 3, fret: 2 },
    ]);
  });

  it("windows start at the first fret and the thirteenth", () => {
    expect(FRET_WINDOW_STARTS).toEqual([1, 13]);
  });
});

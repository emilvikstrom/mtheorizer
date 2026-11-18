import { describe, expect, it } from "vitest";
import { chordOnPitchClass } from "./chords";
import {
  STRING_INSTRUMENT_IDS,
  TUNINGS,
  openStringMidi,
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

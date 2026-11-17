import { describe, expect, it } from "vitest";
import { CHORD_QUALITY_IDS, chordOnPitchClass } from "./chords";
import { formatNote, mod12, naturalPitchClass, note, parseNote, pitchClass } from "./notes";
import { SCALES, type ScaleId, scaleOnPitchClass } from "./scales";
import {
  accidentalColumns,
  clefFor,
  diatonicStep,
  displacedSteps,
  ledgerLines,
  noteOctave,
  placeOnStaff,
  scaleSignature,
  signatureStep,
  staffPosition,
} from "./staff";
import { chordOnKeyboard, scaleOnKeyboard } from "./voicing";

const ROOTS = Array.from({ length: 12 }, (_, pc) => pc);

describe("octave and step", () => {
  it("puts middle C at step 28 and E4 on the bottom line of the treble clef", () => {
    expect(diatonicStep("C", 4)).toBe(28);
    expect(diatonicStep("E", 4)).toBe(30);
    expect(diatonicStep("G", 2)).toBe(18);
  });

  it("takes the octave from the spelling, not the sound", () => {
    // B♯3 sounds as middle C (MIDI 60) but is written in octave 3.
    expect(noteOctave(parseNote("B#"), 60)).toBe(3);
    expect(noteOctave(parseNote("C"), 60)).toBe(4);
    // C♭5 sounds as B4 (MIDI 71).
    expect(noteOctave(parseNote("Cb"), 71)).toBe(5);
    expect(noteOctave(parseNote("Bbb"), 69)).toBe(4);
  });

  it("writes middle C and above in the treble clef, below it in the bass clef", () => {
    expect(clefFor(28)).toBe("treble");
    expect(clefFor(27)).toBe("bass");
    expect(staffPosition("treble", 30)).toBe(0);
    expect(staffPosition("bass", 26)).toBe(8);
  });
});

describe("ledger lines", () => {
  it("gives middle C one ledger line in the treble clef", () => {
    expect(ledgerLines("treble", 28)).toEqual([28]);
    // D4 hangs below the bottom line and needs none.
    expect(ledgerLines("treble", 29)).toEqual([]);
  });

  it("adds a line for each even step above the top line", () => {
    expect(ledgerLines("treble", 38)).toEqual([]);
    expect(ledgerLines("treble", 39)).toEqual([]);
    expect(ledgerLines("treble", 40)).toEqual([40]);
    expect(ledgerLines("treble", 43)).toEqual([40, 42]);
  });

  it("does the same below the bass clef", () => {
    expect(ledgerLines("bass", 18)).toEqual([]);
    expect(ledgerLines("bass", 17)).toEqual([]);
    expect(ledgerLines("bass", 16)).toEqual([16]);
    expect(ledgerLines("bass", 13)).toEqual([16, 14]);
  });
});

describe("placing tones", () => {
  it.each(ROOTS)("keeps the spelling and the sound of every chord quality on root %i", (pc) => {
    for (const quality of CHORD_QUALITY_IDS) {
      const chord = chordOnPitchClass(pc, quality);
      const placed = placeOnStaff(chordOnKeyboard(chord, 4, 0));
      expect(placed).toHaveLength(chord.tones.length);
      for (const p of placed) {
        // The letter and octave plus the accidental give back the sounding note.
        expect(12 * (p.octave + 1) + naturalPitchClass(p.note.letter) + p.note.accidental).toBe(
          p.midi,
        );
        expect(p.step).toBe(diatonicStep(p.note.letter, p.octave));
        expect(p.clef).toBe(p.step >= 28 ? "treble" : "bass");
      }
    }
  });

  it.each(ROOTS)("stacks a root-position triad on %i in thirds", (pc) => {
    for (const quality of ["major", "minor", "diminished", "augmented"] as const) {
      const chord = chordOnPitchClass(pc, quality);
      const steps = placeOnStaff(chordOnKeyboard(chord, 4, 0)).map((p) => p.step);
      // Line, line, line or space, space, space: two steps between the tones.
      expect(steps[1]! - steps[0]!).toBe(2);
      expect(steps[2]! - steps[1]!).toBe(2);
    }
  });

  it("writes E♭ major as E♭–G–B♭ with flats on E and B", () => {
    const chord = chordOnPitchClass(3, "major");
    const placed = placeOnStaff(chordOnKeyboard(chord, 4, 0));
    expect(placed.map((p) => formatNote(p.note))).toEqual(["E♭", "G", "B♭"]);
    expect(placed.map((p) => p.sign)).toEqual([-1, undefined, -1]);
    expect(placed.map((p) => p.position)).toEqual([
      // E♭4 is on the bottom line, G4 on the second line, B♭4 on the third.
      staffPosition("treble", diatonicStep("E", 4)),
      staffPosition("treble", diatonicStep("G", 4)),
      staffPosition("treble", diatonicStep("B", 4)),
    ]);
  });

  it("marks a natural against the key signature", () => {
    const placed = placeOnStaff(
      [
        { note: note("F", 1), midi: 66 },
        { note: note("F", 0), midi: 65 },
        { note: note("F", 0), midi: 65 },
        { note: note("F", 1), midi: 78 },
      ],
      [note("F", 1)],
    );
    // The first F♯ is in the signature, the F♮ needs a natural sign once, and
    // the F♯ an octave up is a different place and goes back to the signature.
    expect(placed.map((p) => p.sign)).toEqual([undefined, 0, undefined, undefined]);
  });

  it("writes an accidental once for the same note in the same octave", () => {
    const placed = placeOnStaff([
      { note: note("C", 1), midi: 61 },
      { note: note("C", 1), midi: 61 },
      { note: note("C", 1), midi: 73 },
    ]);
    expect(placed.map((p) => p.sign)).toEqual([1, undefined, 1]);
  });

  it("puts a tone below middle C in the bass clef", () => {
    const [low] = placeOnStaff([{ note: note("C", 0), midi: 48 }]);
    expect(low?.clef).toBe("bass");
    expect(low?.position).toBe(staffPosition("bass", diatonicStep("C", 3)));
    expect(low?.position).toBe(3);
  });
});

describe("key signatures", () => {
  const names = (pc: number, id: ScaleId) =>
    scaleSignature(scaleOnPitchClass(pc, id)).map(formatNote);

  it("lists sharps and flats in the order they are written", () => {
    expect(names(0, "major")).toEqual([]);
    expect(names(2, "major")).toEqual(["F♯", "C♯"]);
    expect(names(3, "major")).toEqual(["B♭", "E♭", "A♭"]);
    expect(names(6, "major")).toEqual(["F♯", "C♯", "G♯", "D♯", "A♯", "E♯"]);
    expect(names(9, "naturalMinor")).toEqual([]);
    expect(names(0, "naturalMinor")).toEqual(["B♭", "E♭", "A♭"]);
  });

  it("gives a mode the signature of its parent major key", () => {
    expect(names(0, "dorian")).toEqual(["B♭", "E♭"]);
    expect(names(0, "lydian")).toEqual(["F♯"]);
    expect(names(0, "mixolydian")).toEqual(["B♭"]);
  });

  it("leaves scales that are not modes of a major key without one", () => {
    for (const id of [
      "harmonicMinor",
      "melodicMinor",
      "minorBlues",
      "majorPentatonic",
      "altered",
    ] as const) {
      expect(names(7, id)).toEqual([]);
    }
  });

  it.each(ROOTS)("makes the signature of every scale on %i cover its altered notes", (pc) => {
    for (const id of Object.keys(SCALES) as ScaleId[]) {
      const scale = scaleOnPitchClass(pc, id);
      const signature = scaleSignature(scale);
      const placed = placeOnStaff(scaleOnKeyboard(scale), signature);
      // With a signature, the only accidentals left are the ones it cannot cover.
      if (signature.length > 0) expect(placed.every((p) => p.sign === undefined)).toBe(true);
      // Without one, the first altered tone of each letter and octave carries its accidental.
      else {
        const seen = new Set<string>();
        for (const p of placed) {
          const place = `${p.note.letter}${p.octave}`;
          if (!seen.has(place) && p.note.accidental !== 0) expect(p.sign).toBe(p.note.accidental);
          seen.add(place);
        }
      }
      expect(pitchClass(scale.tonic)).toBe(mod12(pc));
    }
  });

  it("writes each accidental of a signature on its line or space", () => {
    // F♯ on the top line of the treble clef, B♭ on the middle line.
    expect(staffPosition("treble", signatureStep("treble", note("F", 1)))).toBe(8);
    expect(staffPosition("treble", signatureStep("treble", note("B", -1)))).toBe(4);
    // F♯ on the fourth line of the bass clef, B♭ on the second.
    expect(staffPosition("bass", signatureStep("bass", note("F", 1)))).toBe(6);
    expect(staffPosition("bass", signatureStep("bass", note("B", -1)))).toBe(2);
  });

  it("keeps every signature accidental on the staff", () => {
    for (const clef of ["treble", "bass"] as const) {
      for (const letter of ["F", "C", "G", "D", "A", "E", "B"] as const) {
        for (const accidental of [1, -1]) {
          const position = staffPosition(clef, signatureStep(clef, note(letter, accidental)));
          expect(position).toBeGreaterThanOrEqual(0);
          expect(position).toBeLessThanOrEqual(9);
        }
      }
    }
  });
});

describe("chord layout", () => {
  it("fans accidentals out to the left when they are close", () => {
    // C♯–E–G♯ as steps: thirds apart, so the second accidental needs a new column.
    expect(accidentalColumns([28, 30, 32])).toEqual([
      { step: 32, column: 0 },
      { step: 30, column: 1 },
      { step: 28, column: 2 },
    ]);
    // A seventh apart or more share a column.
    expect(accidentalColumns([28, 34])).toEqual([
      { step: 34, column: 0 },
      { step: 28, column: 0 },
    ]);
  });

  it("moves the upper note of a second to the right", () => {
    // C–D–E: D moves, E does not (D is already displaced).
    expect([...displacedSteps([28, 29, 30])]).toEqual([29]);
    expect([...displacedSteps([28, 30, 32])]).toEqual([]);
    expect([...displacedSteps([28, 29])]).toEqual([29]);
  });
});

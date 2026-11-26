import { describe, expect, it } from "vitest";
import {
  type BuilderChord,
  borrowedDegrees,
  builderChords,
  secondaryTargets,
} from "./progressionBuilder";
import { formatNote, note } from "./notes";
import { scaleSignature, placeProgression, tonalitySignature } from "./staff";
import { spellScale } from "./scales";
import { TONALITY_IDS, isMajorTonality, tonality, tonalitySpellings } from "./tonality";
import { chordOnKeyboard } from "./voicing";
import { voiceProgression } from "./voiceLeading";
import type { Note } from "./notes";

const triad = (degree: number): BuilderChord => ({ degree, size: "triad" });
const borrowed = (degree: number): BuilderChord => ({ degree, size: "triad", from: "borrowed" });
const secondary = (degree: number): BuilderChord => ({
  degree,
  size: "seventh",
  from: "secondary",
});

const pcs = Array.from({ length: 12 }, (_, pc) => pc);
const keysOf = (id: "major" | "naturalMinor") =>
  pcs.flatMap((pc) => tonalitySpellings(pc, id).map((tonic) => tonality(tonic, id)));

/** What the signature says for a letter (0 when it says nothing). */
const signed = (signature: readonly Note[], n: Note) =>
  signature.find((s) => s.letter === n.letter)?.accidental ?? 0;

/** The bars of a progression placed in root position, with the tonality's signature. */
function bars(t: ReturnType<typeof tonality>, steps: readonly BuilderChord[]) {
  const chords = builderChords(t, steps);
  return placeProgression(
    chords.map(({ chord }) => chordOnKeyboard(chord)),
    tonalitySignature(t),
  );
}

describe("tonalitySignature", () => {
  it("is the key's own signature for major, minor and the modes", () => {
    expect(tonalitySignature(tonality(note("E", -1), "major")).map(formatNote)).toEqual([
      "B♭",
      "E♭",
      "A♭",
    ]);
    expect(tonalitySignature(tonality(note("D"), "dorian"))).toEqual([]);
  });

  it("borrows the signature of the major or minor key on the tonic for other tonalities", () => {
    for (const id of TONALITY_IDS) {
      for (const pc of pcs) {
        for (const tonic of tonalitySpellings(pc, id)) {
          const t = tonality(tonic, id);
          const own = scaleSignature(spellScale(tonic, id));
          const fallback = scaleSignature(
            spellScale(tonic, isMajorTonality(id) ? "major" : "naturalMinor"),
          );
          const expected = ["harmonicMinor", "melodicMinor"].includes(id) ? fallback : undefined;
          if (expected) expect(tonalitySignature(t)).toEqual(expected);
          // Either way every tone of the signature is a single sharp or flat.
          expect(tonalitySignature(t).every((n) => Math.abs(n.accidental) === 1)).toBe(true);
          if (own.length > 0) expect(tonalitySignature(t)).toEqual(own);
        }
      }
    }
    // A harmonic minor is written in A minor: no signature, a sharp on each G.
    expect(tonalitySignature(tonality(note("A"), "harmonicMinor"))).toEqual([]);
  });
});

describe("placeProgression", () => {
  it.each(keysOf("major"))(
    "writes I–IV–V–vi in $tonic.letter major with no accidentals beside the notes",
    (t) => {
      for (const bar of bars(t, [1, 4, 5, 6].map(triad))) {
        for (const placed of bar) expect(placed.sign).toBeUndefined();
      }
    },
  );

  it.each(keysOf("naturalMinor"))(
    "writes i–iv–v–♭VI in $tonic.letter minor with no accidentals beside the notes",
    (t) => {
      for (const bar of bars(t, [1, 4, 5, 6].map(triad))) {
        for (const placed of bar) expect(placed.sign).toBeUndefined();
      }
    },
  );

  it.each([...keysOf("major"), ...keysOf("naturalMinor")])(
    "marks exactly the notes against the signature in $tonic.letter $scale",
    (t) => {
      const signature = tonalitySignature(t);
      const steps = [triad(1), ...secondaryTargets(t).map(secondary), borrowed(borrowedDegrees(t)[0] ?? 1), triad(1)];
      for (const bar of bars(t, steps)) {
        for (const placed of bar) {
          const against = placed.note.accidental !== signed(signature, placed.note);
          expect(placed.sign !== undefined, formatNote(placed.note)).toBe(against);
          if (against) expect(placed.sign).toBe(placed.note.accidental);
        }
      }
    },
  );

  it("marks the borrowed ♭VI and ♭VII in C major, and the raised note of V7/V", () => {
    const c = tonality(note("C"), "major");
    const placed = bars(c, [triad(1), borrowed(6), borrowed(7), secondary(5)]);
    const signs = placed.map((bar) =>
      bar.filter((p) => p.sign !== undefined).map((p) => `${formatNote(p.note)}${p.octave}`),
    );
    expect(signs).toEqual([[], ["A♭4", "E♭5"], ["B♭4"], ["F♯4"]]);
  });

  it("repeats an accidental after the bar line", () => {
    const c = tonality(note("C"), "major");
    const placed = bars(c, [secondary(5), secondary(5)]);
    expect(placed.map((bar) => bar.filter((p) => p.sign === 1).map((p) => formatNote(p.note))))
      .toEqual([["F♯"], ["F♯"]]);
  });

  it("follows the notes of a smooth voicing, naturals and all", () => {
    const c = tonality(note("C"), "major");
    const chords = builderChords(c, [triad(1), secondary(2), triad(2), triad(5)]);
    const voiced = voiceProgression(chords.map(({ chord }) => chord));
    const placed = placeProgression(voiced.voicings, tonalitySignature(c));
    expect(placed.map((bar) => bar.map((p) => p.midi))).toEqual(
      voiced.voicings.map((tones) => tones.map((t) => t.midi)),
    );
    // A7 brings C♯, and Dm after it needs no natural, since the bar line cancels the sharp.
    expect(placed[1]?.some((p) => formatNote(p.note) === "C♯" && p.sign === 1)).toBe(true);
    expect(placed[2]?.every((p) => p.sign === undefined)).toBe(true);
  });
});

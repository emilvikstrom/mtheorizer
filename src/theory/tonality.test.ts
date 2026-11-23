import { describe, expect, it } from "vitest";
import { diatonicSevenths, diatonicTriads, key, keysAt } from "./keys";
import { type Note, formatNote, note, pitchClass } from "./notes";
import {
  TONALITY_IDS,
  type TonalityId,
  characteristic,
  formatTonality,
  isReadableTonic,
  keyTonality,
  nextChords,
  retune,
  tonality,
  tonalityKey,
  tonalityLabel,
  tonalityOnPitchClass,
  tonalityScale,
  tonalitySevenths,
  tonalitySpellings,
  tonalityTriads,
} from "./tonality";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

const on = (tonic: Note, id: TonalityId) => tonality(tonic, id);
const symbols = (chords: readonly { symbol: string }[]) => chords.map((c) => c.symbol).join(" ");
const romans = (chords: readonly { roman: string }[]) => chords.map((c) => c.roman).join(" ");

// The triads of every tonality on C, with step numbers against the major scale.
const ON_C: Record<TonalityId, [string, string]> = {
  major: ["C Dm Em F G Am B°", "I ii iii IV V vi vii°"],
  naturalMinor: ["Cm D° E♭ Fm Gm A♭ B♭", "i ii° ♭III iv v ♭VI ♭VII"],
  harmonicMinor: ["Cm D° E♭+ Fm G A♭ B°", "i ii° ♭III+ iv V ♭VI vii°"],
  melodicMinor: ["Cm Dm E♭+ F G A° B°", "i ii ♭III+ IV V vi° vii°"],
  dorian: ["Cm Dm E♭ F Gm A° B♭", "i ii ♭III IV v vi° ♭VII"],
  phrygian: ["Cm D♭ E♭ Fm G° A♭ B♭m", "i ♭II ♭III iv v° ♭VI ♭vii"],
  lydian: ["C D Em F♯° G Am Bm", "I II iii ♯iv° V vi vii"],
  mixolydian: ["C Dm E° F Gm Am B♭", "I ii iii° IV v vi ♭VII"],
  locrian: ["C° D♭ E♭m Fm G♭ A♭ B♭m", "i° ♭II ♭iii iv ♭V ♭VI ♭vii"],
  phrygianDominant: ["C D♭ E° Fm G° A♭+ B♭m", "I ♭II iii° iv v° ♭VI+ ♭vii"],
  lydianDominant: ["C D E° F♯° Gm Am B♭+", "I II iii° ♯iv° v vi ♭VII+"],
  mixolydianFlat6: ["C D° E° Fm Gm A♭+ B♭", "I ii° iii° iv v ♭VI+ ♭VII"],
};

describe("tonality chords", () => {
  it.each(TONALITY_IDS)("%s: triads on C", (id) => {
    const triads = tonalityTriads(on(note("C"), id));
    expect(symbols(triads)).toBe(ON_C[id][0]);
    expect(romans(triads)).toBe(ON_C[id][1]);
  });

  it("writes seventh chords: D dorian and C harmonic minor", () => {
    const dorian = tonalitySevenths(on(note("D"), "dorian"));
    expect(symbols(dorian)).toBe("Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5 Cmaj7");
    expect(romans(dorian)).toBe("i7 ii7 ♭IIImaj7 IV7 v7 viø7 ♭VIImaj7");
    const harmonic = tonalitySevenths(on(note("C"), "harmonicMinor"));
    expect(symbols(harmonic)).toBe("Cm(maj7) Dm7♭5 E♭maj7♯5 Fm7 G7 A♭maj7 B°7");
    expect(romans(harmonic)).toBe("i(maj7) iiø7 ♭III+maj7 iv7 V7 ♭VImaj7 vii°7");
  });

  it("agrees with the key's own chords for major and minor, on every key of the circle", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let position = 0; position < 12; position++) {
        for (const k of keysAt(position, mode)) {
          const t = keyTonality(k);
          expect(symbols(tonalityTriads(t))).toBe(symbols(diatonicTriads(k)));
          expect(symbols(tonalitySevenths(t))).toBe(symbols(diatonicSevenths(k)));
        }
      }
    }
  });

  it.each(TONALITY_IDS)("%s: builds on every readable tonic with correct spelling", (id) => {
    for (const pc of PITCH_CLASSES) {
      for (const tonic of tonalitySpellings(pc, id)) {
        const t = on(tonic, id);
        const scale = tonalityScale(t).map(formatNote);
        const triads = tonalityTriads(t);
        const sevenths = tonalitySevenths(t);
        expect(triads).toHaveLength(7);
        expect(sevenths).toHaveLength(7);
        for (const chord of [...triads, ...sevenths]) {
          // Every chord is spelled from the scale: seven letters, no D♯ where E♭ belongs.
          for (const n of chord.notes) expect(scale, formatTonality(t)).toContain(formatNote(n));
          expect(formatNote(chord.notes[0] ?? tonic)).toBe(scale[chord.degree - 1]);
        }
      }
    }
  });
});

describe("tonality names and spellings", () => {
  it("names a tonality after its tonic", () => {
    expect(formatTonality(on(note("A"), "naturalMinor"))).toBe("A minor");
    expect(formatTonality(on(note("E", -1), "dorian"))).toBe("E♭ dorian");
    expect(formatTonality(on(note("G"), "mixolydianFlat6"))).toBe("G mixolydian ♭6");
    expect(tonalityLabel("naturalMinor")).toBe("Minor");
    expect(tonalityLabel("phrygianDominant")).toBe("Phrygian dominant");
  });

  it("spells the tonic with the fewest accidentals and offers both spellings when both read well", () => {
    expect(formatNote(tonalityOnPitchClass(1, "major").tonic)).toBe("D♭");
    expect(formatNote(tonalityOnPitchClass(1, "dorian").tonic)).toBe("C♯");
    expect(formatNote(tonalityOnPitchClass(6, "lydian").tonic)).toBe("G♭");
    expect(tonalitySpellings(1, "major").map(formatNote)).toEqual(["C♯", "D♭"]);
    expect(tonalitySpellings(1, "lydian").map(formatNote)).toEqual(["D♭"]);
    expect(tonalitySpellings(0, "major").map(formatNote)).toEqual(["C"]);
    for (const id of TONALITY_IDS) {
      for (const pc of PITCH_CLASSES) {
        const t = tonalityOnPitchClass(pc, id);
        expect(pitchClass(t.tonic)).toBe(pc);
        expect(isReadableTonic(t.tonic, id)).toBe(true);
      }
    }
  });

  it("moves to another tonality and keeps the spelling while it reads well", () => {
    expect(formatTonality(retune(on(note("A", -1), "major"), "naturalMinor"))).toBe("A♭ minor");
    expect(formatTonality(retune(on(note("D", -1), "major"), "naturalMinor"))).toBe("C♯ minor");
  });

  it("is a key of the circle only for major and natural minor", () => {
    expect(tonalityKey(on(note("C"), "major"))).toEqual(key(note("C"), "major"));
    expect(tonalityKey(on(note("C"), "naturalMinor"))).toEqual(key(note("C"), "minor"));
    expect(tonalityKey(on(note("C"), "dorian"))).toBeUndefined();
  });
});

describe("characteristic", () => {
  it("finds the note that sets a mode apart, and the chords that hold it", () => {
    expect(characteristic("major")).toEqual({
      reference: "major",
      degrees: [],
      labels: [],
      chordDegrees: [],
    });
    expect(characteristic("dorian")).toMatchObject({
      reference: "naturalMinor",
      labels: ["♮6"],
      chordDegrees: [2, 4, 6],
    });
    expect(characteristic("lydian")).toMatchObject({ labels: ["♯4"], chordDegrees: [2, 4, 7] });
    expect(characteristic("mixolydian")).toMatchObject({
      labels: ["♭7"],
      chordDegrees: [3, 5, 7],
    });
    expect(characteristic("phrygian")).toMatchObject({ labels: ["♭2"], chordDegrees: [2, 5, 7] });
    expect(characteristic("harmonicMinor").labels).toEqual(["♮7"]);
    expect(characteristic("locrian").labels).toEqual(["♭2", "♭5"]);
  });
});

describe("nextChords", () => {
  const c = on(note("C"), "major");
  const degrees = (t = c, last?: number) => nextChords(t, last).map((n) => n.degree);

  it("starts on the tonic", () => {
    expect(nextChords(c, undefined)).toEqual([{ degree: 1, reason: "start" }]);
  });

  it("follows the strong root movements", () => {
    // V → I (fifth down), V → iii (third down), V → vi (step up), V → IV (step down).
    expect(nextChords(c, 5)).toEqual([
      { degree: 1, reason: "fifthDown" },
      { degree: 3, reason: "thirdDown" },
      { degree: 6, reason: "stepUp" },
      { degree: 4, reason: "stepDown" },
    ]);
    // ii → V, ii → vii° is skipped (diminished), ii → iii, home, then up a fifth to vi.
    expect(degrees(c, 2)).toEqual([5, 3, 1, 6]);
    expect(degrees(c, 1)).toEqual([4, 6, 2, 5]);
  });

  it("resolves the leading-tone chord up to the tonic first", () => {
    expect(nextChords(c, 7)[0]).toEqual({ degree: 1, reason: "resolve" });
  });

  it("brings in the mode's colour", () => {
    // D dorian: i → IV (fifth down), the ♮6 in ii, then ♭VII (step down) and v.
    expect(nextChords(on(note("D"), "dorian"), 1)).toEqual([
      { degree: 4, reason: "fifthDown" },
      { degree: 2, reason: "colour" },
      { degree: 7, reason: "stepDown" },
      { degree: 5, reason: "fifthUp" },
    ]);
    // G mixolydian: I → IV, then the ♭7 in v and ♭VII.
    expect(degrees(on(note("G"), "mixolydian"), 1)).toEqual([4, 5, 7, 6]);
  });

  it("never suggests the same chord or a diminished one, in any tonality", () => {
    for (const id of TONALITY_IDS) {
      const t = on(note("C"), id);
      const triads = tonalityTriads(t);
      for (let last = 1; last <= 7; last++) {
        const ideas = nextChords(t, last);
        expect(ideas.length).toBeGreaterThan(0);
        expect(ideas.length).toBeLessThanOrEqual(4);
        for (const idea of ideas) {
          expect(idea.degree).not.toBe(last);
          if (idea.degree !== 1) {
            expect(["major", "minor"]).toContain(triads[idea.degree - 1]?.quality);
          }
        }
      }
    }
  });
});

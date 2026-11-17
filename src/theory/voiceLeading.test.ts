import { describe, expect, it } from "vitest";
import {
  CHORD_QUALITY_IDS,
  type Chord,
  type ChordQualityId,
  buildChord,
  chordOnPitchClass,
} from "./chords";
import { formatNote, mod12, note, pitchClass } from "./notes";
import { PROGRESSIONS, progressionChords, progressionKeyOn } from "./progressions";
import { describeVoiceLeading, voiceLeading, voiceProgression, voicingsOf } from "./voiceLeading";
import { rootPosition } from "./voicing";

const C = note("C");
const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

const chord = (letter: Parameters<typeof note>[0], q: ChordQualityId, acc: -1 | 0 | 1 = 0) =>
  buildChord(note(letter, acc), q);

const names = (tones: readonly { note: Parameters<typeof formatNote>[0] }[]) =>
  tones.map((t) => formatNote(t.note)).join("–");

/** The movement between two chords in root position, paired in order: what you get without voice leading. */
function plainTotal(a: Chord, b: Chord) {
  const x = rootPosition(a)
    .map((t) => t.midi)
    .sort((p, q) => p - q);
  const y = rootPosition(b)
    .map((t) => t.midi)
    .sort((p, q) => p - q);
  const n = Math.min(x.length, y.length);
  // Pair the lowest tones with each other; extra tones take no part.
  return x.slice(0, n).reduce((sum, m, i) => sum + Math.abs(m - (y[i] ?? m)), 0);
}

describe("voiceLeading", () => {
  // from, to, tones that stay, moves (as "from→to"), dropped, added, total
  const TABLE: ReadonlyArray<
    readonly [
      string,
      ReturnType<typeof buildChord>,
      ReturnType<typeof buildChord>,
      string[],
      string[],
      string[],
      string[],
      number,
    ]
  > = [
    ["C → Am", chord("C", "major"), chord("A", "minor"), ["C", "E"], ["G→A"], [], [], 2],
    ["C → F", chord("C", "major"), chord("F", "major"), ["C"], ["E→F", "G→A"], [], [], 3],
    ["C → G", chord("C", "major"), chord("G", "major"), ["G"], ["C→B", "E→D"], [], [], 3],
    ["C → C", chord("C", "major"), chord("C", "major"), ["C", "E", "G"], [], [], [], 0],
    ["C → Cm", chord("C", "major"), chord("C", "minor"), ["C", "G"], ["E→E♭"], [], [], 1],
    ["C7 → F", chord("C", "dominant7"), chord("F", "major"), ["C"], ["E→F", "B♭→A"], ["G"], [], 2],
    [
      "Dm7 → G7",
      chord("D", "minor7"),
      chord("G", "dominant7"),
      ["D", "F"],
      ["A→G", "C→B"],
      [],
      [],
      3,
    ],
    ["F → C7", chord("F", "major"), chord("C", "dominant7"), ["C"], ["A→B♭", "F→E"], [], ["G"], 2],
  ];

  it.each(TABLE)("%s", (_name, from, to, stay, moves, dropped, added, total) => {
    const result = voiceLeading(from, to);
    const stayed = result.moves.filter((m) => m.semitones === 0);
    const moved = result.moves.filter((m) => m.semitones !== 0);
    expect(stayed.map((m) => formatNote(m.from.note)).sort()).toEqual([...stay].sort());
    expect(moved.map((m) => `${formatNote(m.from.note)}→${formatNote(m.to.note)}`).sort()).toEqual(
      [...moves].sort(),
    );
    expect(result.dropped.map((t) => formatNote(t.note)).sort()).toEqual([...dropped].sort());
    expect(result.added.map((t) => formatNote(t.note)).sort()).toEqual([...added].sort());
    expect(result.total).toBe(total);
  });

  it("states the total as the sum of how far each tone moves", () => {
    for (const pc of PITCH_CLASSES) {
      for (const [a, b] of [
        ["major", "minor"],
        ["major", "dominant7"],
        ["minor7", "dominant7"],
        ["dominant7", "major7"],
        ["diminished", "minor"],
      ] as const) {
        const result = voiceLeading(chordOnPitchClass(pc, a), chordOnPitchClass(mod12(pc + 5), b));
        expect(result.total).toBe(result.moves.reduce((sum, m) => sum + Math.abs(m.semitones), 0));
        expect(result.moves.length + result.dropped.length).toBe(result.from.length);
        expect(result.moves.length + result.added.length).toBe(result.to.length);
      }
    }
  });

  it("spells every voiced tone as the chord does and keeps only the chord's pitch classes", () => {
    for (const q of CHORD_QUALITY_IDS) {
      for (const pc of PITCH_CLASSES) {
        const from = chordOnPitchClass(pc, "major");
        const to = chordOnPitchClass(mod12(pc + 7), q);
        const result = voiceLeading(from, to);
        expect(result.to.map((t) => pitchClass(t.note)).sort((a, b) => a - b)).toEqual(
          to.tones.map((t) => pitchClass(t.note)).sort((a, b) => a - b),
        );
        for (const t of result.to) expect(mod12(t.midi)).toBe(pitchClass(t.note));
        expect(result.to.map((t) => formatNote(t.note)).sort()).toEqual(
          to.tones.map((t) => formatNote(t.note)).sort(),
        );
      }
    }
  });

  it("never moves more than the chords in root position do", () => {
    for (const a of ["major", "minor", "dominant7", "minor7", "major7"] as const) {
      for (const b of ["major", "minor", "dominant7", "minor7", "major7"] as const) {
        for (const pc of PITCH_CLASSES) {
          for (const step of PITCH_CLASSES) {
            const from = chordOnPitchClass(pc, a);
            const to = chordOnPitchClass(mod12(pc + step), b);
            const smooth = voiceLeading(from, to).total;
            expect(smooth).toBeLessThanOrEqual(plainTotal(from, to));
          }
        }
      }
    }
  });

  it("uses the voicing it is given for the first chord", () => {
    const am = chordOnPitchClass(9, "minor");
    const [secondInversion] = voicingsOf(am).filter((v) => names(v) === "C–E–A");
    expect(secondInversion).toBeDefined();
    const result = voiceLeading(am, chord("C", "major"), secondInversion);
    expect(names(result.from)).toBe("C–E–A");
    expect(result.total).toBe(2);
  });

  it("keeps the common tones of a neighbouring key in place on the circle of fifths", () => {
    // Neighbouring major chords share one tone: G stays from C to G.
    const result = voiceLeading(chord("C", "major"), chord("G", "major"));
    expect(result.moves.filter((m) => m.semitones === 0)).toHaveLength(1);
  });
});

describe("voicingsOf", () => {
  it("offers every inversion, with root position near middle C first", () => {
    const voicings = voicingsOf(chord("C", "major"));
    expect(voicings[0]?.map((t) => t.midi)).toEqual([60, 64, 67]);
    const shapes = new Set(voicings.map((v) => names(v)));
    expect(shapes).toEqual(new Set(["C–E–G", "E–G–C", "G–C–E"]));
  });

  it("offers a chord that reaches too high in root position as it is", () => {
    const b13 = buildChord(note("B"), "dominant13");
    expect(voicingsOf(b13).length).toBeGreaterThan(0);
  });
});

describe("voiceProgression", () => {
  it("returns nothing for no chords", () => {
    expect(voiceProgression([])).toEqual({ voicings: [], transitions: [], total: 0 });
  });

  it("starts in root position and gives one transition per step", () => {
    const k = progressionKeyOn(PROGRESSIONS["pop"], C);
    const chords = progressionChords(PROGRESSIONS["pop"], k).map((c) => c.chord);
    const result = voiceProgression(chords);
    expect(result.voicings).toHaveLength(chords.length);
    expect(result.transitions).toHaveLength(chords.length - 1);
    expect(result.voicings[0]?.map((t) => t.midi)).toEqual([60, 64, 67]);
    expect(result.total).toBe(result.transitions.reduce((sum, t) => sum + t.total, 0));
  });

  it("voices I–V–vi–IV in C with little movement (C–Am keeps C and E, C–G keeps G)", () => {
    const k = progressionKeyOn(PROGRESSIONS["pop"], C);
    const chords = progressionChords(PROGRESSIONS["pop"], k).map((c) => c.chord);
    const { voicings, total } = voiceProgression(chords);
    expect(names(voicings[1] ?? [])).toContain("G");
    // Root position, pairing the lowest tones, moves far more (G to the B above, and so on).
    const naive = chords.slice(1).reduce((sum, c, i) => sum + plainTotal(chords[i] ?? c, c), 0);
    expect(total).toBeLessThan(naive);
  });

  it("is never worse than voicing each step on its own", () => {
    for (const id of Object.keys(PROGRESSIONS) as (keyof typeof PROGRESSIONS)[]) {
      for (const pc of PITCH_CLASSES) {
        const progression = PROGRESSIONS[id];
        const tonic = chordOnPitchClass(pc, "major").root;
        const kk = progressionKeyOn(progression, tonic);
        const chords = progressionChords(progression, kk).map((c) => c.chord);
        const whole = voiceProgression(chords).total;
        let greedy = 0;
        let current = rootPosition(chords[0] ?? chordOnPitchClass(pc, "major"));
        for (const next of chords.slice(1)) {
          const step = voiceLeading(chords[0] ?? next, next, current);
          greedy += step.total;
          current = [...step.to];
        }
        expect(whole).toBeLessThanOrEqual(greedy);
      }
    }
  });
});

describe("describeVoiceLeading", () => {
  it("names the tones that stay, move, drop out and join", () => {
    expect(describeVoiceLeading(voiceLeading(chord("C", "major"), chord("A", "minor")))).toBe(
      "C and E stay · G → A · 2 semitones in total",
    );
    expect(describeVoiceLeading(voiceLeading(chord("C", "dominant7"), chord("F", "major")))).toBe(
      "C stays · E → F · B♭ → A · G dropped · 2 semitones in total",
    );
    expect(describeVoiceLeading(voiceLeading(chord("F", "major"), chord("C", "dominant7")))).toBe(
      "C stays · F → E · A → B♭ · G added · 2 semitones in total",
    );
  });

  it("says so when nothing moves", () => {
    expect(describeVoiceLeading(voiceLeading(chord("C", "major"), chord("C", "major")))).toBe(
      "C, E and G stay · 0 semitones in total",
    );
  });

  it("uses the singular for one semitone", () => {
    expect(describeVoiceLeading(voiceLeading(chord("C", "major"), chord("C", "minor")))).toBe(
      "C and G stay · E → E♭ · 1 semitone in total",
    );
  });
});

import { describe, expect, it } from "vitest";
import { CHORD_QUALITIES } from "./chords";
import {
  DEFAULT_LISTENING_LEVEL,
  LISTENING_LEVELS,
  gradeListening,
  listeningChoices,
  listeningChord,
  listeningDeck,
  listeningKeys,
  listeningLevel,
  listeningQuestions,
} from "./listeningQuiz";
import { mod12, pitchClass } from "./notes";
import { inversionCount } from "./voicing";

describe.each(LISTENING_LEVELS)("listening level $id", ({ id, qualities }) => {
  it("asks every quality on all 12 roots once", () => {
    const questions = listeningQuestions(id);
    expect(questions).toHaveLength(qualities.length * 12);
    for (const qualityId of qualities) {
      const roots = questions.filter((q) => q.qualityId === qualityId).map((q) => q.pitchClass);
      expect([...roots].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
  });

  it("has a deck of the same questions in any order, the same for a seed", () => {
    const deck = listeningDeck(3, id);
    expect(deck).toEqual(listeningDeck(3, id));
    expect(deck).not.toEqual(listeningDeck(4, id));
    const key = (q: { pitchClass: number; qualityId: string }) => `${q.qualityId}:${q.pitchClass}`;
    expect(deck.map(key).sort()).toEqual(listeningQuestions(id).map(key).sort());
  });

  it("builds every question's chord with the right tones on the keyboard, in every inversion", () => {
    for (const q of listeningQuestions(id)) {
      const chord = listeningChord(q);
      expect(pitchClass(chord.root)).toBe(q.pitchClass);
      for (let inversion = 0; inversion <= inversionCount(chord); inversion++) {
        const keys = listeningKeys({ ...q, inversion });
        const played = new Set(keys.map((k) => mod12(k.midi)));
        const expected = new Set(chord.tones.map((t) => pitchClass(t.note)));
        expect(played).toEqual(expected);
        // The lowest key is the chord tone the inversion puts in the bass.
        expect(keys.filter((k) => k.isBass)).toHaveLength(1);
      }
    }
  });

  it("offers the level's qualities as answers, in order, without repeating one", () => {
    const choices = listeningChoices(id);
    expect(choices.map((c) => c.id)).toEqual([...qualities]);
    expect(new Set(choices.map((c) => c.name)).size).toBe(choices.length);
  });

  it("accepts only the quality that was played", () => {
    for (const q of listeningQuestions(id)) {
      for (const answer of qualities) {
        expect(gradeListening(q, answer)).toBe(answer === q.qualityId);
      }
    }
  });
});

describe("listening deck with inversions", () => {
  it("stays in root position without inversions", () => {
    expect(listeningDeck(1, "mixed").every((q) => q.inversion === 0)).toBe(true);
  });

  it("turns chords over within what the chord has, the same for a seed", () => {
    const deck = listeningDeck(9, "mixed", true);
    expect(deck).toEqual(listeningDeck(9, "mixed", true));
    for (const q of deck) {
      expect(q.inversion).toBeGreaterThanOrEqual(0);
      expect(q.inversion).toBeLessThanOrEqual(inversionCount(listeningChord(q)));
    }
    expect(deck.some((q) => q.inversion > 0)).toBe(true);
  });

  it("asks the same chords with and without inversions", () => {
    const plain = listeningDeck(9, "triads");
    const turned = listeningDeck(9, "triads", true);
    expect(turned.map(({ pitchClass: p, qualityId }) => [p, qualityId])).toEqual(
      plain.map(({ pitchClass: p, qualityId }) => [p, qualityId]),
    );
  });
});

describe("listening levels", () => {
  it("only name chord qualities that exist and grow from easy to hard", () => {
    for (const level of LISTENING_LEVELS) {
      for (const id of level.qualities) expect(CHORD_QUALITIES[id]).toBeDefined();
    }
    expect(listeningLevel("basic").qualities.length).toBeLessThan(
      listeningLevel("triads").qualities.length,
    );
    expect(listeningLevel("mixed").qualities).toEqual([
      ...listeningLevel("triads").qualities,
      ...listeningLevel("sevenths").qualities,
    ]);
    expect(LISTENING_LEVELS.some((l) => l.id === DEFAULT_LISTENING_LEVEL)).toBe(true);
  });
});

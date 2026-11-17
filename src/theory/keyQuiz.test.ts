import { describe, expect, it } from "vitest";
import {
  SIGNATURES,
  allKeys,
  allQuestions,
  answerTonics,
  formatKey,
  isCorrect,
  key,
  keySignature,
  newDeck,
  note,
  parseNote,
  pitchClass,
  relativeKey,
  sameSignature,
  seededRandom,
  shuffled,
  signatureOf,
} from ".";

describe("the keys that can be asked", () => {
  it("are 15 majors and 15 minors, covering all 12 + 12 sounds", () => {
    const keys = allKeys();
    expect(keys).toHaveLength(30);
    for (const mode of ["major", "minor"] as const) {
      const sounds = new Set(keys.filter((k) => k.mode === mode).map((k) => pitchClass(k.tonic)));
      expect(sounds.size).toBe(12);
    }
  });

  it("each have a signature of their own within a mode", () => {
    for (const mode of ["major", "minor"] as const) {
      const signatures = allKeys()
        .filter((k) => k.mode === mode)
        .map((k) => JSON.stringify(signatureOf(k)));
      expect(new Set(signatures).size).toBe(SIGNATURES.length);
    }
  });
});

describe("signatureOf", () => {
  it.each([
    ["C", "major", "none", 0],
    ["A", "minor", "none", 0],
    ["G", "major", "sharps", 1],
    ["F♯", "minor", "sharps", 3],
    ["E♭", "major", "flats", 3],
    ["C", "minor", "flats", 3],
    ["C♯", "major", "sharps", 7],
    ["C♭", "major", "flats", 7],
  ] as const)("%s %s has %s %i", (tonic, mode, kind, count) => {
    expect(signatureOf(key(parseNote(tonic), mode))).toEqual({ kind, count });
  });

  it("agrees with keySignature for every key", () => {
    for (const k of allKeys()) {
      const { kind, accidentals } = keySignature(k);
      expect(signatureOf(k)).toEqual({ kind, count: accidentals.length });
    }
  });

  it("is the same for a major key and its relative minor", () => {
    for (const k of allKeys().filter((x) => x.mode === "major")) {
      expect(sameSignature(signatureOf(k), signatureOf(relativeKey(k)))).toBe(true);
    }
  });
});

describe("the questions", () => {
  it("ask every key both ways", () => {
    const questions = allQuestions();
    const keys = allKeys();
    expect(questions).toHaveLength(keys.length * 2);
    for (const k of keys) {
      for (const type of ["count", "find"] as const) {
        expect(
          questions.filter((q) => q.type === type && formatKey(q.key) === formatKey(k)),
        ).toHaveLength(1);
      }
    }
  });

  it("are not repeated within a deck, and the deck holds them all", () => {
    const deck = newDeck(seededRandom(7));
    expect(deck).toHaveLength(allQuestions().length);
    const ids = deck.map((q) => `${q.type}:${formatKey(q.key)}`);
    expect(new Set(ids).size).toBe(deck.length);
  });

  it("come in the same order for the same seed, and another order for another", () => {
    const order = (seed: number) => newDeck(seededRandom(seed)).map((q) => formatKey(q.key));
    expect(order(1)).toEqual(order(1));
    expect(order(1)).not.toEqual(order(2));
  });

  it("shuffles without losing or adding anything", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect([...shuffled(items, seededRandom(3))].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("isCorrect", () => {
  it("accepts exactly one signature per key", () => {
    for (const k of allKeys()) {
      const right = SIGNATURES.filter((s) => isCorrect({ type: "count", key: k }, s));
      expect(right).toEqual([signatureOf(k)]);
    }
  });

  it("accepts exactly one tonic per signature and mode when asking which key", () => {
    for (const q of allQuestions().filter((x) => x.type === "find")) {
      const right = answerTonics(q.key.mode).filter((tonic) => isCorrect(q, tonic));
      expect(right).toEqual([q.key.tonic]);
    }
  });

  it("does not take a tonic for a signature or the other way round", () => {
    const [count, find] = [allQuestions()[0], allQuestions().at(-1)];
    expect(count && isCorrect(count, note("C"))).toBe(false);
    expect(find && isCorrect(find, { kind: "none", count: 0 })).toBe(false);
  });

  it("counts the right pitch class with the wrong spelling as wrong", () => {
    // Three flats is E♭ major; D♯ major would need nine sharps.
    const question = {
      type: "find",
      key: key(note("E", -1), "major"),
      mode: "major",
      signature: { kind: "flats", count: 3 },
    } as const;
    expect(isCorrect(question, note("E", -1))).toBe(true);
    expect(isCorrect(question, note("D", 1))).toBe(false);
  });

  it("tells F♯ major (six sharps) from G♭ major (six flats)", () => {
    const six = (kind: "sharps" | "flats") =>
      ({
        type: "find",
        key: key(note("F", kind === "sharps" ? 1 : 0), "major"),
        mode: "major",
        signature: { kind, count: 6 },
      }) as const;
    expect(isCorrect(six("sharps"), note("F", 1))).toBe(true);
    expect(isCorrect(six("sharps"), note("G", -1))).toBe(false);
    expect(isCorrect(six("flats"), note("G", -1))).toBe(true);
    expect(isCorrect(six("flats"), note("F", 1))).toBe(false);
  });
});

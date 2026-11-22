import { describe, expect, it } from "vitest";
import {
  MAX_ACCIDENTALS,
  SIGNATURES,
  allKeys,
  allQuestions,
  answerTonics,
  formatKey,
  isCorrect,
  key,
  keyDeck,
  keySignature,
  keysFor,
  missedKeys,
  newDeck,
  note,
  overLimit,
  parseNote,
  pitchClass,
  recordResult,
  relativeKey,
  sameSignature,
  seededRandom,
  shuffled,
  signatureOf,
  tonicOverLimit,
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

describe("what to practise", () => {
  const ups = Array.from({ length: MAX_ACCIDENTALS + 1 }, (_, n) => n);

  it("is every key with no options, or with no limit", () => {
    expect(keysFor()).toEqual(allKeys());
    expect(keysFor({ maxAccidentals: MAX_ACCIDENTALS })).toEqual(allKeys());
    expect(allQuestions()).toEqual(allQuestions({}));
  });

  it.each(["major", "minor"] as const)("keeps only the %s keys", (mode) => {
    const keys = keysFor({ mode });
    expect(keys).toHaveLength(15);
    expect(keys.every((k) => k.mode === mode)).toBe(true);
  });

  it.each(ups)("keeps the keys with %i accidentals or fewer, in either mode", (max) => {
    for (const mode of [undefined, "major", "minor"] as const) {
      const keys = keysFor({ ...(mode ? { mode } : {}), maxAccidentals: max });
      // Every key that fits is there, and none that does not.
      const expected = allKeys().filter(
        (k) => (mode === undefined || k.mode === mode) && keySignature(k).accidentals.length <= max,
      );
      expect(keys.map(formatKey)).toEqual(expected.map(formatKey));
      expect(keys.every((k) => signatureOf(k).count <= max)).toBe(true);
    }
  });

  it("has two keys with no accidentals, and so a question set is never empty", () => {
    expect(keysFor({ maxAccidentals: 0 }).map(formatKey)).toEqual(["C major", "A minor"]);
    for (const mode of ["major", "minor"] as const) {
      for (const max of ups) {
        expect(keysFor({ mode, maxAccidentals: max }).length).toBeGreaterThan(0);
      }
    }
  });

  it("adds four keys for each size of signature above none", () => {
    // A sharp and a flat signature of each size, in both modes.
    const sizes = ups.map((max) => keysFor({ maxAccidentals: max }).length);
    expect(sizes).toEqual([2, 6, 10, 14, 18, 22, 26, 30]);
  });

  it("asks only about the keys that fit, both ways", () => {
    const options = { mode: "minor", maxAccidentals: 2 } as const;
    const questions = allQuestions(options);
    expect(questions).toHaveLength(keysFor(options).length * 2);
    expect(questions.every((q) => q.key.mode === "minor" && signatureOf(q.key).count <= 2)).toBe(
      true,
    );
    expect(questions.filter((q) => q.type === "count")).toHaveLength(5);
    expect(questions.filter((q) => q.type === "find")).toHaveLength(5);
  });

  it("deals decks of only those questions", () => {
    const deck = newDeck(seededRandom(4), { mode: "major", maxAccidentals: 3 });
    expect(deck).toHaveLength(14);
    expect(new Set(deck.map((q) => `${q.type}:${formatKey(q.key)}`)).size).toBe(14);
  });
});

describe("a seeded session", () => {
  const order = (seed: number, round = 0, options = {}) =>
    keyDeck(seed, round, options).map((q) => `${q.type}:${formatKey(q.key)}`);

  it("is the same every time for the same seed and options", () => {
    expect(order(7)).toEqual(order(7));
    expect(order(7, 0, { mode: "minor", maxAccidentals: 4 })).toEqual(
      order(7, 0, { mode: "minor", maxAccidentals: 4 }),
    );
  });

  it("starts with the deck that the seeded random gives", () => {
    expect(keyDeck(7)).toEqual(newDeck(seededRandom(7)));
    expect(keyDeck(7, 0, { mode: "major" })).toEqual(newDeck(seededRandom(7), { mode: "major" }));
  });

  it("is another set for another seed, and another round is another order", () => {
    expect(order(7)).not.toEqual(order(8));
    expect(order(7, 1)).not.toEqual(order(7, 0));
    expect(order(7, 1)).toEqual(order(7, 1));
    expect([...order(7, 1)].sort()).toEqual([...order(7, 0)].sort());
  });

  it.each([0, 1, 4_000_000_000, 0xffffffff])("holds every question for seed %i", (seed) => {
    expect(keyDeck(seed)).toHaveLength(allQuestions().length);
    expect(keyDeck(seed, 3, { mode: "minor", maxAccidentals: 1 })).toHaveLength(6);
  });
});

describe("answers over the limit", () => {
  const ups = Array.from({ length: MAX_ACCIDENTALS + 1 }, (_, n) => n);

  it.each(ups)("greys exactly the signatures with more than %i accidentals", (max) => {
    for (const s of SIGNATURES) expect(overLimit(s, max)).toBe(s.count > max);
  });

  it("never greys the right answer of a question in the set", () => {
    for (const max of ups) {
      for (const q of allQuestions({ maxAccidentals: max })) {
        expect(overLimit(signatureOf(q.key), max)).toBe(false);
        expect(tonicOverLimit(q.key.tonic, q.key.mode, max)).toBe(false);
      }
    }
  });

  it("greys a tonic by the signature of its own key", () => {
    // D♭ major has five flats, C♯ major seven sharps, and C major none.
    expect(tonicOverLimit(note("D", -1), "major", 4)).toBe(true);
    expect(tonicOverLimit(note("D", -1), "major", 5)).toBe(false);
    expect(tonicOverLimit(note("C", 1), "major", 6)).toBe(true);
    expect(tonicOverLimit(note("C"), "major", 0)).toBe(false);
  });

  it("is no limit with no number", () => {
    for (const s of SIGNATURES) expect(overLimit(s)).toBe(false);
  });
});

describe("the log of keys answered wrong", () => {
  const dFlat = key(note("D", -1), "major");
  const aMinor = key(note("A"), "minor");

  it("adds a key answered wrong once, and drops it when answered right", () => {
    let log: readonly string[] = [];
    log = recordResult(log, dFlat, false);
    log = recordResult(log, dFlat, false);
    expect(log).toEqual(["D♭ major"]);
    log = recordResult(log, aMinor, false);
    expect(log).toEqual(["D♭ major", "A minor"]);
    log = recordResult(log, dFlat, true);
    expect(log).toEqual(["A minor"]);
    expect(recordResult(log, dFlat, true)).toEqual(["A minor"]);
  });

  it.each(allKeys().map((k) => [formatKey(k), k] as const))(
    "finds %s again from its name",
    (name, k) => {
      expect(missedKeys([name])).toEqual([k]);
    },
  );

  it("gives the keys in circle order and drops names that are not keys", () => {
    expect(missedKeys(["A minor", "nonsense", "C major"]).map(formatKey)).toEqual([
      "C major",
      "A minor",
    ]);
  });

  it("limits the set to those keys", () => {
    expect(keysFor({ only: [dFlat, aMinor] }).map(formatKey)).toEqual(["D♭ major", "A minor"]);
    expect(keysFor({ only: [dFlat, aMinor], mode: "minor" }).map(formatKey)).toEqual(["A minor"]);
    expect(keysFor({ only: [dFlat], maxAccidentals: 4 })).toEqual([]);
    expect(allQuestions({ only: [dFlat] })).toHaveLength(2);
  });
});

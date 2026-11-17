import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  type SignatureKind,
  key,
  keySignature,
  relativeKey,
} from "./keys";
import { type Note } from "./notes";

/** A key signature as an answer: how many sharps or flats (`none` means zero). */
export interface SignatureAnswer {
  readonly kind: SignatureKind;
  readonly count: number;
}

/** "How many sharps or flats does `key` have?" */
export interface CountQuestion {
  readonly type: "count";
  readonly key: Key;
}

/** "Which `mode` key has `signature`?" The signature is that of `key`, the intended answer. */
export interface FindQuestion {
  readonly type: "find";
  readonly key: Key;
  readonly mode: KeyMode;
  readonly signature: SignatureAnswer;
}

export type KeyQuestion = CountQuestion | FindQuestion;

/** The signature of `k` as an answer, as `keys.ts` works it out. */
export function signatureOf(k: Key): SignatureAnswer {
  const { kind, accidentals } = keySignature(k);
  return { kind, count: accidentals.length };
}

export function sameSignature(a: SignatureAnswer, b: SignatureAnswer): boolean {
  return a.count === b.count && (a.count === 0 || a.kind === b.kind);
}

/** Every signature there is: none, one to seven sharps and one to seven flats. */
export const SIGNATURES: readonly SignatureAnswer[] = [
  { kind: "none", count: 0 },
  ...[1, 2, 3, 4, 5, 6, 7].map((count) => ({ kind: "sharps" as const, count })),
  ...[1, 2, 3, 4, 5, 6, 7].map((count) => ({ kind: "flats" as const, count })),
];

/**
 * The keys that have a signature of seven accidentals or fewer: 15 majors and their 15
 * relative minors. They cover all 12 + 12 keys, and B, F♯ and D♭ (and their minors) also
 * come with their other spelling (C♭, G♭ and C♯), which has a signature of its own.
 */
export function allKeys(): Key[] {
  const majors = CIRCLE_OF_FIFTHS.flat().map((tonic) => key(tonic, "major"));
  return [...majors, ...majors.map(relativeKey)];
}

/** Every question once: each key asked both ways, "how many?" and "which key?". */
export function allQuestions(): KeyQuestion[] {
  const keys = allKeys();
  return [
    ...keys.map((k): KeyQuestion => ({ type: "count", key: k })),
    ...keys.map((k): KeyQuestion => ({
      type: "find",
      key: k,
      mode: k.mode,
      signature: signatureOf(k),
    })),
  ];
}

/** The tonics a "which key?" answer can be chosen from, in circle order. */
export function answerTonics(mode: KeyMode): Note[] {
  return allKeys()
    .filter((k) => k.mode === mode)
    .map((k) => k.tonic);
}

/** Right or wrong, worked out by `keys.ts` and not by comparing with the intended key. */
export function isCorrect(question: KeyQuestion, answer: SignatureAnswer | Note): boolean {
  if (question.type === "count") {
    return "kind" in answer && sameSignature(signatureOf(question.key), answer);
  }
  if ("kind" in answer) return false;
  return sameSignature(signatureOf(key(answer, question.mode)), question.signature);
}

/** Uniform random numbers in [0, 1), as `Math.random`. Pass a seeded one for repeatable sessions. */
export type Random = () => number;

/** A small seeded generator (mulberry32), so a session can be repeated. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The items in a random order (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/** A deck of every question in random order. Draw from the front; build a new deck when it is empty. */
export function newDeck(random: Random = Math.random): KeyQuestion[] {
  return shuffled(allQuestions(), random);
}

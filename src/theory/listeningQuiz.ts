import { CHORD_QUALITIES, type ChordQualityId, type NamedChord, chordOnPitchClass } from "./chords";
import { seededRandom, shuffled } from "./keyQuiz";
import { type KeyboardTone, chordOnKeyboard, inversionCount } from "./voicing";

/** How many chord qualities the listening drill chooses between. */
export type ListeningLevelId = "basic" | "triads" | "sevenths" | "mixed";

export interface ListeningLevel {
  readonly id: ListeningLevelId;
  readonly name: string;
  readonly qualities: readonly ChordQualityId[];
}

const TRIADS: readonly ChordQualityId[] = ["major", "minor", "diminished", "augmented"];
const SEVENTHS: readonly ChordQualityId[] = [
  "major7",
  "dominant7",
  "minor7",
  "halfDiminished7",
  "diminished7",
  "minorMajor7",
];

export const LISTENING_LEVELS: readonly ListeningLevel[] = [
  { id: "basic", name: "Major or minor", qualities: ["major", "minor"] },
  { id: "triads", name: "Triads", qualities: TRIADS },
  { id: "sevenths", name: "Seventh chords", qualities: SEVENTHS },
  { id: "mixed", name: "Triads and sevenths", qualities: [...TRIADS, ...SEVENTHS] },
];

export const DEFAULT_LISTENING_LEVEL: ListeningLevelId = "triads";

export const isListeningLevel = (text: string): text is ListeningLevelId =>
  LISTENING_LEVELS.some((level) => level.id === text);

export function listeningLevel(id: ListeningLevelId): ListeningLevel {
  return LISTENING_LEVELS.find((level) => level.id === id) ?? LISTENING_LEVELS[1]!;
}

/** "Which quality is this chord?": a chord to play, in an inversion (0 is root position). */
export interface ListeningQuestion {
  readonly pitchClass: number;
  readonly qualityId: ChordQualityId;
  readonly inversion: number;
}

/** The chord of the question, spelled the usual way for its root. */
export function listeningChord(q: ListeningQuestion): NamedChord {
  return chordOnPitchClass(q.pitchClass, q.qualityId);
}

/** The keys to play and show for the question, from the octave starting at middle C. */
export function listeningKeys(q: ListeningQuestion): KeyboardTone[] {
  return chordOnKeyboard(listeningChord(q), 4, q.inversion);
}

/** Every chord of the level on every root, in root position, in a fixed order. */
export function listeningQuestions(level: ListeningLevelId): ListeningQuestion[] {
  return listeningLevel(level).qualities.flatMap((qualityId) =>
    Array.from({ length: 12 }, (_, pitchClass) => ({ pitchClass, qualityId, inversion: 0 })),
  );
}

/**
 * The questions in the order a seed gives, so a link can repeat a set. With `inversions` each
 * chord is also turned over to a random inversion, again decided by the seed.
 */
export function listeningDeck(
  seed: number,
  level: ListeningLevelId = DEFAULT_LISTENING_LEVEL,
  inversions = false,
): ListeningQuestion[] {
  const deck = shuffled(listeningQuestions(level), seededRandom(seed));
  if (!inversions) return deck;
  const random = seededRandom(seed ^ 0x9e3779b9);
  return deck.map((q) => ({
    ...q,
    inversion: Math.floor(random() * (inversionCount(listeningChord(q)) + 1)),
  }));
}

/** Whether `answer` is the quality that was played. */
export function gradeListening(q: ListeningQuestion, answer: ChordQualityId): boolean {
  return q.qualityId === answer;
}

/** The names the answer buttons carry, in the level's order: "major", "minor", "diminished" … */
export function listeningChoices(
  level: ListeningLevelId,
): { id: ChordQualityId; name: string; symbol: string }[] {
  return listeningLevel(level).qualities.map((id) => ({
    id,
    name: CHORD_QUALITIES[id].name,
    symbol: CHORD_QUALITIES[id].symbol,
  }));
}

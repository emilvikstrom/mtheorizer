import {
  CHORD_GROUPS,
  CHORD_QUALITIES,
  CHORD_QUALITY_IDS,
  type ChordGroupId,
  type ChordQualityId,
  buildChord,
} from "./chords";
import { seededRandom, shuffled } from "./keyQuiz";
import {
  LETTERS,
  type Note,
  formatNote,
  mod12,
  naturalPitchClass,
  note,
  noteEquals,
  parseNote,
} from "./notes";
import { SCALES, type ScaleId, buildScale, scaleLabel } from "./scales";

/** What a spelling question can be about: a chord family, or the scales. */
export type SpellingGroupId = ChordGroupId | "scales";

export const SPELLING_GROUPS: readonly { readonly id: SpellingGroupId; readonly name: string }[] = [
  ...CHORD_GROUPS,
  { id: "scales", name: "Scales" },
];

export const ALL_SPELLING_GROUPS: readonly SpellingGroupId[] = SPELLING_GROUPS.map((g) => g.id);

export const isSpellingGroup = (text: string): text is SpellingGroupId =>
  (ALL_SPELLING_GROUPS as readonly string[]).includes(text);

/** "Spell the chord `qualityId` on `root`." */
export interface ChordSpelling {
  readonly kind: "chord";
  readonly group: ChordGroupId;
  readonly root: Note;
  readonly qualityId: ChordQualityId;
}

/** "Spell the `scaleId` scale on `tonic`." */
export interface ScaleSpelling {
  readonly kind: "scale";
  readonly group: "scales";
  readonly tonic: Note;
  readonly scaleId: ScaleId;
}

export type SpellingQuestion = ChordSpelling | ScaleSpelling;

const WHITE_KEYS = new Set([0, 2, 4, 5, 7, 9, 11]);

/** The roots asked about: the seven white keys, five sharps (C♯ … A♯) and five flats (D♭ … B♭). */
export function spellingRoots(): Note[] {
  return LETTERS.flatMap((letter) =>
    [0, 1, -1]
      .filter(
        (accidental) =>
          accidental === 0 || !WHITE_KEYS.has(mod12(naturalPitchClass(letter) + accidental)),
      )
      .map((accidental) => note(letter, accidental)),
  );
}

/** The tones the answer has to contain, and those it may also contain (a dropped fifth, say). */
export function expectedNotes(q: SpellingQuestion): { required: Note[]; optional: Note[] } {
  if (q.kind === "scale") {
    return { required: buildScale(q.tonic, SCALES[q.scaleId]), optional: [] };
  }
  const { tones } = buildChord(q.root, q.qualityId);
  return {
    required: tones.filter((t) => !t.optional).map((t) => t.note),
    optional: tones.filter((t) => t.optional).map((t) => t.note),
  };
}

/** A triple sharp or flat can neither be chosen nor typed in this drill, so such questions are left out. */
function askable(q: SpellingQuestion): boolean {
  const { required, optional } = expectedNotes(q);
  return [...required, ...optional].every((n) => Math.abs(n.accidental) <= 2);
}

/** Every question of the `groups` (all of them by default), in a fixed order. */
export function spellingQuestions(
  groups: readonly SpellingGroupId[] = ALL_SPELLING_GROUPS,
): SpellingQuestion[] {
  const roots = spellingRoots();
  const questions: SpellingQuestion[] = [];
  for (const qualityId of CHORD_QUALITY_IDS) {
    const group = CHORD_QUALITIES[qualityId].group;
    if (!groups.includes(group)) continue;
    for (const root of roots) questions.push({ kind: "chord", group, root, qualityId });
  }
  if (groups.includes("scales")) {
    for (const scaleId of Object.keys(SCALES) as ScaleId[]) {
      for (const tonic of roots) questions.push({ kind: "scale", group: "scales", tonic, scaleId });
    }
  }
  return questions.filter(askable);
}

/** The question as it is asked: "E♭m7" or "E♭ Dorian scale". */
export function spellingTitle(q: SpellingQuestion): string {
  return q.kind === "chord"
    ? `${formatNote(q.root)}${CHORD_QUALITIES[q.qualityId].symbol}`
    : `${formatNote(q.tonic)} ${scaleLabel(SCALES[q.scaleId])} scale`;
}

/** How an answer fared against the spelling the theory module gives. */
export interface SpellingGrade {
  readonly right: boolean;
  /** Tones that had to be there and are not. */
  readonly missing: Note[];
  /** Answered tones that do not belong, among them right pitch classes with the wrong spelling. */
  readonly wrong: Note[];
}

/**
 * Grades a spelled answer. The order does not matter and a tone given twice counts once, but
 * the spelling does: D♯ for E♭ is wrong. A chord's optional tones may be left out.
 */
export function gradeSpelling(q: SpellingQuestion, answer: readonly Note[]): SpellingGrade {
  const { required, optional } = expectedNotes(q);
  const given = answer.filter((n, i) => answer.findIndex((m) => noteEquals(m, n)) === i);
  const has = (list: readonly Note[], n: Note) => list.some((m) => noteEquals(m, n));
  const missing = required.filter((n) => !has(given, n));
  const wrong = given.filter((n) => !has(required, n) && !has(optional, n));
  return { right: missing.length === 0 && wrong.length === 0, missing, wrong };
}

/** The spellings of a pitch class with up to two accidentals, naturals first: E, E♯ … F♭, D𝄫 for pitch class 4. */
export function allSpellings(pc: number): Note[] {
  const target = mod12(pc);
  const spellings: Note[] = [];
  for (const letter of LETTERS) {
    let offset = mod12(target - naturalPitchClass(letter));
    if (offset > 6) offset -= 12;
    if (Math.abs(offset) <= 2) spellings.push(note(letter, offset));
  }
  // 0, +1, -1, +2, -2
  const rank = (n: Note) => Math.abs(n.accidental) * 2 - (n.accidental > 0 ? 1 : 0);
  return spellings.sort((a, b) => rank(a) - rank(b));
}

/** The notes of a typed answer ("Eb G Bb", "E♭, G, B♭"), or undefined when it holds no note or a word that is none. */
export function parseSpelledNotes(text: string): Note[] | undefined {
  const words = text
    .replace(/𝄪/gu, "##")
    .replace(/𝄫/gu, "bb")
    .split(/[\s,;]+/u)
    .filter(Boolean);
  if (words.length === 0) return undefined;
  try {
    return words.map(parseNote);
  } catch {
    return undefined;
  }
}

/** The questions in the order a seed gives, so a link can repeat a set. */
export function spellingDeck(
  seed: number,
  groups: readonly SpellingGroupId[] = ALL_SPELLING_GROUPS,
): SpellingQuestion[] {
  return shuffled(spellingQuestions(groups), seededRandom(seed));
}

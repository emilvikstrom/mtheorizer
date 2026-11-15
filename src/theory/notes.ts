/**
 * Spelled notes.
 *
 * A note is a letter plus an accidental, never just a pitch class. Keeping the
 * letter is what lets us spell chords and scales correctly (E♭–G–B♭, not
 * D♯–G–A♯). The pitch class is always derived from the spelling.
 */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

/** Pitch class (0–11) of each natural letter, C = 0. */
const NATURAL_PITCH_CLASS: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Accidental as a semitone offset from the natural letter:
 * -2 = double flat, -1 = flat, 0 = natural, 1 = sharp, 2 = double sharp.
 */
export type Accidental = number;

export interface Note {
  readonly letter: Letter;
  readonly accidental: Accidental;
}

export function note(letter: Letter, accidental: Accidental = 0): Note {
  return { letter, accidental };
}

/** Modulo that always returns 0–11, also for negative numbers. */
export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function naturalPitchClass(letter: Letter): number {
  return NATURAL_PITCH_CLASS[letter];
}

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Letter `steps` letters above `letter`, wrapping around (B + 1 = C). */
export function letterAt(letter: Letter, steps: number): Letter {
  return LETTERS[(((letterIndex(letter) + steps) % 7) + 7) % 7] as Letter;
}

export function pitchClass(n: Note): number {
  return mod12(NATURAL_PITCH_CLASS[n.letter] + n.accidental);
}

export function isNatural(n: Note): boolean {
  return n.accidental === 0;
}

export function noteEquals(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

function accidentalSymbol(accidental: Accidental): string {
  if (accidental === 2) return "𝄪";
  if (accidental === -2) return "𝄫";
  return accidental > 0 ? "♯".repeat(accidental) : "♭".repeat(-accidental);
}

/** Display name with proper music symbols, e.g. "E♭", "F♯", "C". */
export function formatNote(n: Note): string {
  return n.letter + accidentalSymbol(n.accidental);
}

/** Plain ASCII name, e.g. "Eb", "F#", "C". Handy for ids and URLs. */
export function formatNoteAscii(n: Note): string {
  return n.letter + (n.accidental > 0 ? "#".repeat(n.accidental) : "b".repeat(-n.accidental));
}

/**
 * Parse a note name such as "C", "Eb", "F#", "Bbb", "E♭" or "F♯".
 * Throws on anything else.
 */
export function parseNote(name: string): Note {
  const match = /^([A-Ga-g])([#♯]*|[b♭]*)$/u.exec(name.trim());
  if (!match) {
    throw new Error(`Not a note name: "${name}"`);
  }
  const letter = (match[1] ?? "").toUpperCase() as Letter;
  const accidentals = [...(match[2] ?? "")];
  const accidental = accidentals.reduce((sum, ch) => sum + (ch === "#" || ch === "♯" ? 1 : -1), 0);
  return note(letter, accidental);
}

/**
 * Every spelling of a pitch class that uses at most one accidental,
 * naturals first, then sharps, then flats. For pitch class 1 that is
 * [C♯, D♭]; for pitch class 0 it is [C, B♯].
 */
export function spellingsOf(pc: number): Note[] {
  const target = mod12(pc);
  const spellings: Note[] = [];
  for (const letter of LETTERS) {
    let offset = mod12(target - NATURAL_PITCH_CLASS[letter]);
    if (offset > 6) offset -= 12;
    if (Math.abs(offset) <= 1) spellings.push(note(letter, offset));
  }
  const rank = (n: Note) => (n.accidental === 0 ? 0 : n.accidental > 0 ? 1 : 2);
  return spellings.sort((a, b) => rank(a) - rank(b));
}

/**
 * The everyday names of a pitch class: the natural name for white keys,
 * or the sharp and flat names for black keys (["C♯", "D♭"]).
 */
export function commonSpellings(pc: number): Note[] {
  const spellings = spellingsOf(pc);
  const natural = spellings.find(isNatural);
  return natural ? [natural] : spellings;
}

/** Label for a pitch class, e.g. "C" or "C♯/D♭". */
export function pitchClassLabel(pc: number): string {
  return commonSpellings(pc).map(formatNote).join("/");
}

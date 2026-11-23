import { type ChordQualityId, buildChord, chordSymbol } from "./chords";
import { type Key, key } from "./keys";
import { type Note, formatNote, mod12, pitchClass, spellingsOf } from "./notes";
import {
  MAJOR_SCALE,
  NATURAL_MINOR_SCALE,
  SCALES,
  type ScaleId,
  buildScale,
  keySignatureAccidentals,
  preferredTonicSpelling,
} from "./scales";

/**
 * A tonality is a tonic and a seven-note scale to make chords from: C major, A minor, but also
 * D dorian, G mixolydian or A harmonic minor. Stacking thirds within the scale gives seven triads
 * and seven seventh chords, just as in a major or minor key, and their step numbers are written
 * against the major scale: dorian has a major IV, mixolydian a ♭VII, phrygian a ♭II.
 */

export const TONALITY_IDS = [
  "major",
  "naturalMinor",
  "harmonicMinor",
  "melodicMinor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
  "phrygianDominant",
  "lydianDominant",
  "mixolydianFlat6",
] as const satisfies readonly ScaleId[];

export type TonalityId = (typeof TONALITY_IDS)[number];

export const isTonalityId = (id: string): id is TonalityId =>
  (TONALITY_IDS as readonly string[]).includes(id);

export interface Tonality {
  readonly tonic: Note;
  readonly scale: TonalityId;
}

export const tonality = (tonic: Note, scale: TonalityId): Tonality => ({ tonic, scale });

/** Short, lower-case names as they follow a tonic: "C major", "A minor", "D dorian". */
const TONALITY_NAMES: Record<TonalityId, string> = {
  major: "major",
  naturalMinor: "minor",
  harmonicMinor: "harmonic minor",
  melodicMinor: "melodic minor",
  dorian: "dorian",
  phrygian: "phrygian",
  lydian: "lydian",
  mixolydian: "mixolydian",
  locrian: "locrian",
  phrygianDominant: "phrygian dominant",
  lydianDominant: "lydian dominant",
  mixolydianFlat6: "mixolydian ♭6",
};

/** One line on how each tonality sounds, for a picker or a heading. */
export const TONALITY_DESCRIPTIONS: Record<TonalityId, string> = {
  major: "Bright and settled: the home of most pop and classical harmony.",
  naturalMinor: "Dark and open, with ♭III, ♭VI and ♭VII instead of a leading tone.",
  harmonicMinor: "Minor with a raised seventh, so V is major and pulls hard to i.",
  melodicMinor: "Minor with a raised sixth and seventh: a smooth, jazzy minor.",
  dorian: "Minor with a major sixth, so IV is major: soulful rather than sad.",
  phrygian: "Minor with a ♭2: the dark, Spanish-sounding ♭II over the tonic.",
  lydian: "Major with a ♯4, so II is major: floating and dreamy.",
  mixolydian: "Major with a ♭7, so ♭VII is a major chord: bluesy, rock and folk.",
  locrian: "The ♭5 makes the tonic chord diminished: unstable and rarely home.",
  phrygianDominant: "Phrygian with a major third: flamenco and Middle-Eastern colour.",
  lydianDominant: "Lydian with a ♭7: a bright dominant sound with a ♯4.",
  mixolydianFlat6: "Major third with a ♭6 and ♭7: bittersweet, between major and minor.",
};

/** The name of a tonality after its tonic: "minor", "dorian", "harmonic minor". */
export const tonalityName = (id: TonalityId): string => TONALITY_NAMES[id];

/** The picker label: "Major", "Dorian", "Harmonic minor". */
export const tonalityLabel = (id: TonalityId): string => {
  const name = id === "naturalMinor" ? "minor" : TONALITY_NAMES[id];
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** "C major", "A minor", "D dorian". */
export const formatTonality = (t: Tonality): string =>
  `${formatNote(t.tonic)} ${TONALITY_NAMES[t.scale]}`;

/** The seven notes of the tonality, from the tonic. */
export const tonalityScale = (t: Tonality): Note[] => buildScale(t.tonic, SCALES[t.scale]);

/** A key of the circle as a tonality: major stays major, minor is natural minor. */
export const keyTonality = (k: Key): Tonality =>
  tonality(k.tonic, k.mode === "major" ? "major" : "naturalMinor");

/** The key of the circle for a major or (natural) minor tonality; undefined for the others. */
export function tonalityKey(t: Tonality): Key | undefined {
  if (t.scale === "major") return key(t.tonic, "major");
  if (t.scale === "naturalMinor") return key(t.tonic, "minor");
  return undefined;
}

/** Whether the third above the tonic is major (major, lydian, mixolydian …) or minor. */
export const isMajorTonality = (id: TonalityId): boolean =>
  (SCALES[id].degrees[2]?.semitones ?? 0) === 4;

// --- Spelling of the tonic ----------------------------------------------------

/** The most accidentals a tonality may have to be offered (as on the circle of fifths). */
const MAX_ACCIDENTALS = 7;

/** The tonic on pitch class `pc` with the fewest accidentals: D♭ major, C♯ minor, E♭ dorian. */
export const tonalityOnPitchClass = (pc: number, id: TonalityId): Tonality =>
  tonality(preferredTonicSpelling(pc, SCALES[id]), id);

/**
 * The spellings of the tonic on `pc` that make a readable tonality: at most seven accidentals and
 * no double sharp or flat in the scale, as on the circle of fifths. C♯ and D♭ major, G♯ and A♭
 * minor, but only D♭ lydian (C♯ lydian would need eight sharps) and only C♯ harmonic minor
 * (D♭ harmonic minor would need B𝄫). The usual spelling (`tonalityOnPitchClass`) is always
 * offered, so every pitch class has at least one.
 */
export function tonalitySpellings(pc: number, id: TonalityId): Note[] {
  const usual = preferredTonicSpelling(pc, SCALES[id]);
  return spellingsOf(pc).filter(
    (n) =>
      (n.letter === usual.letter && n.accidental === usual.accidental) ||
      (Math.abs(n.accidental) <= 1 &&
        keySignatureAccidentals(n, SCALES[id]) <= MAX_ACCIDENTALS &&
        buildScale(n, SCALES[id]).every((x) => Math.abs(x.accidental) <= 1)),
  );
}

/** Whether `tonic` is one of the spellings `tonalitySpellings` offers. */
export const isReadableTonic = (tonic: Note, id: TonalityId): boolean =>
  tonalitySpellings(pitchClass(tonic), id).some(
    (n) => n.letter === tonic.letter && n.accidental === tonic.accidental,
  );

/**
 * `t` moved to another tonality on the same tonic, keeping the tonic's spelling while it still
 * reads well: A♭ major → A♭ minor, but D♭ major → C♯ minor (D♭ minor would need eight flats).
 */
export function retune(t: Tonality, id: TonalityId): Tonality {
  return isReadableTonic(t.tonic, id)
    ? tonality(t.tonic, id)
    : tonalityOnPitchClass(pitchClass(t.tonic), id);
}

// --- Chords of the tonality -----------------------------------------------------

export type TonalityTriadQuality = "major" | "minor" | "diminished" | "augmented";

/** A chord built by stacking thirds within the tonality's scale. */
export interface TonalityChord {
  /** Scale degree, 1–7. */
  readonly degree: number;
  /** Step number against the major scale: "I", "♭VII", "ii°", "♭IIImaj7", "iv7". */
  readonly roman: string;
  readonly quality: ChordQualityId;
  readonly notes: readonly Note[];
  /** Chord symbol, e.g. "B♭" or "Em7". */
  readonly symbol: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
const MAJOR_DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;

function triadQuality(third: number, fifth: number): TonalityTriadQuality | undefined {
  if (third === 4 && fifth === 7) return "major";
  if (third === 3 && fifth === 7) return "minor";
  if (third === 3 && fifth === 6) return "diminished";
  if (third === 4 && fifth === 8) return "augmented";
  return undefined;
}

function seventhQuality(triad: TonalityTriadQuality, seventh: number): ChordQualityId | undefined {
  switch (triad) {
    case "major":
      return seventh === 11 ? "major7" : seventh === 10 ? "dominant7" : undefined;
    case "minor":
      return seventh === 10 ? "minor7" : seventh === 11 ? "minorMajor7" : undefined;
    case "diminished":
      return seventh === 10 ? "halfDiminished7" : seventh === 9 ? "diminished7" : undefined;
    case "augmented":
      return seventh === 11 ? "augmentedMajor7" : seventh === 10 ? "augmented7" : undefined;
  }
}

/** "♭" or "♯" before the numeral when the degree differs from the major scale's. */
function degreePrefix(degree: number, semitones: number): string {
  const diff = mod12(semitones - (MAJOR_DEGREE_SEMITONES[degree - 1] ?? 0) + 6) - 6;
  return diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff);
}

/** The numeral of a triad: upper case for major and augmented, lower case for minor and diminished. */
function triadNumeral(degree: number, semitones: number, quality: TonalityTriadQuality): string {
  const numeral = ROMAN[degree - 1] ?? "";
  const upper = quality === "major" || quality === "augmented";
  return `${degreePrefix(degree, semitones)}${upper ? numeral : numeral.toLowerCase()}`;
}

const TRIAD_ROMAN_SUFFIX: Record<TonalityTriadQuality, string> = {
  major: "",
  minor: "",
  diminished: "°",
  augmented: "+",
};

const SEVENTH_ROMAN_SUFFIX: Partial<Record<ChordQualityId, string>> = {
  major7: "maj7",
  dominant7: "7",
  minor7: "7",
  minorMajor7: "(maj7)",
  halfDiminished7: "ø7",
  diminished7: "°7",
  augmentedMajor7: "+maj7",
  augmented7: "+7",
};

interface Stacked {
  readonly degree: number;
  readonly root: Note;
  readonly semitones: number;
  readonly triad: TonalityTriadQuality;
  readonly seventh: ChordQualityId;
}

function stack(t: Tonality): Stacked[] {
  const scale = tonalityScale(t);
  const at = (i: number) => scale[i % 7] ?? t.tonic;
  const above = (i: number, by: number) => mod12(pitchClass(at(i + by)) - pitchClass(at(i)));
  return scale.map((root, i) => {
    const triad = triadQuality(above(i, 2), above(i, 4));
    const seventh = triad && seventhQuality(triad, above(i, 6));
    if (!triad || !seventh) {
      throw new Error(`${formatTonality(t)} has no tertian chord on degree ${i + 1}`);
    }
    return {
      degree: i + 1,
      root,
      semitones: mod12(pitchClass(root) - pitchClass(t.tonic)),
      triad,
      seventh,
    };
  });
}

/** The seven triads of the tonality: D dorian gives Dm, Em, F, G, Am, B°, C. */
export function tonalityTriads(t: Tonality): TonalityChord[] {
  return stack(t).map((s) => {
    const quality: ChordQualityId = s.triad;
    return {
      degree: s.degree,
      roman: `${triadNumeral(s.degree, s.semitones, s.triad)}${TRIAD_ROMAN_SUFFIX[s.triad]}`,
      quality,
      notes: buildChord(s.root, quality).tones.map((tone) => tone.note),
      symbol: chordSymbol(s.root, quality),
    };
  });
}

/** The seven seventh chords of the tonality: D dorian gives Dm7, Em7, Fmaj7, G7, Am7, Bm7♭5, Cmaj7. */
export function tonalitySevenths(t: Tonality): TonalityChord[] {
  return stack(t).map((s) => {
    const numeral = triadNumeral(s.degree, s.semitones, s.triad);
    return {
      degree: s.degree,
      roman: `${numeral}${SEVENTH_ROMAN_SUFFIX[s.seventh] ?? ""}`,
      quality: s.seventh,
      notes: buildChord(s.root, s.seventh).tones.map((tone) => tone.note),
      symbol: chordSymbol(s.root, s.seventh),
    };
  });
}

// --- What sets a tonality apart ---------------------------------------------------

export interface Characteristic {
  /** The plain scale it is heard against: major or natural minor. */
  readonly reference: "major" | "naturalMinor";
  /** Degrees (1–7) whose note differs from the reference scale: 6 for dorian, 4 for lydian. */
  readonly degrees: readonly number[];
  /** The notes as step names: ["♮6"] for dorian, ["♯4"] for lydian, ["♭2", "♭5"] for locrian. */
  readonly labels: readonly string[];
  /** Degrees of the chords (not the tonic) that hold one of those notes. */
  readonly chordDegrees: readonly number[];
}

/** The degree `steps` scale steps above `degree` (1–7, wrapping). */
const degreeUp = (degree: number, steps: number): number =>
  ((((degree - 1 + steps) % 7) + 7) % 7) + 1;

const accidentalName = (diff: number): string => (diff < 0 ? "♭" : diff > 0 ? "♯" : "♮");

/**
 * The notes that give a tonality its colour, found by comparing it with the plain scale that has
 * the same third: major for major-third tonalities, natural minor for the others. Dorian is
 * natural minor with a ♮6, so its ii, IV and vi° carry the dorian sound; mixolydian is major with
 * a ♭7, so iii°, v and ♭VII do. Major and natural minor have none.
 */
export function characteristic(id: TonalityId): Characteristic {
  const own = SCALES[id].degrees.map((d) => d.semitones);
  const reference = isMajorTonality(id) ? "major" : "naturalMinor";
  const theirs = (reference === "major" ? MAJOR_SCALE : NATURAL_MINOR_SCALE).degrees.map(
    (d) => d.semitones,
  );
  const degrees = own.flatMap((semis, i) => (semis !== theirs[i] ? [i + 1] : []));
  // Named against the major scale: dorian's raised sixth is ♮6, lydian's fourth ♯4.
  const labels = degrees.map(
    (d) => `${accidentalName((own[d - 1] ?? 0) - (MAJOR_DEGREE_SEMITONES[d - 1] ?? 0))}${d}`,
  );
  const chordTones = (root: number) => [root, degreeUp(root, 2), degreeUp(root, 4)];
  const chordDegrees = [2, 3, 4, 5, 6, 7].filter((root) =>
    chordTones(root).some((d) => degrees.includes(d)),
  );
  return { reference, degrees, labels, chordDegrees };
}

// --- What comes next ------------------------------------------------------------

export type NextReason =
  | "start"
  | "fifthDown"
  | "thirdDown"
  | "stepUp"
  | "stepDown"
  | "fifthUp"
  | "resolve"
  | "home"
  | "colour";

export interface NextChord {
  /** Scale degree of the suggested chord, 1–7. */
  readonly degree: number;
  readonly reason: NextReason;
}

/** One line per reason, as the builder shows it. */
export const NEXT_REASONS: Record<NextReason, string> = {
  start: "Start at home on the tonic.",
  fifthDown: "The root falls a fifth: the strongest pull in harmony.",
  thirdDown: "The root falls a third: two notes stay, a gentle change.",
  stepUp: "The root climbs a step: no shared notes, so it pushes forward.",
  stepDown: "The root falls a step: a modal and rock move, like ♭VII down from I.",
  fifthUp: "The root rises a fifth: moving away from where you are, as I does to V.",
  resolve: "The leading-tone chord resolves up by a half step.",
  home: "Back to the tonic to round the phrase off.",
  colour: "Brings out the note that gives this tonality its colour.",
};

/**
 * Up to four chords that follow well after the last chord of a progression in `t`, each with the
 * reason it works. The rules are root movements, so they hold in any tonality: down a fifth
 * (V → I, ii → V) first, then in a mode the chords that carry its characteristic note, then down
 * a third (I → vi, vi → IV), up a step (IV → V, V → vi), back to the tonic, down a step and up a
 * fifth. A diminished chord resolves up a step first (vii° → I). Diminished and augmented chords
 * are not suggested as places to go. An empty progression starts on the tonic.
 */
export function nextChords(t: Tonality, lastDegree: number | undefined): NextChord[] {
  if (lastDegree === undefined) return [{ degree: 1, reason: "start" }];
  const triads = tonalityTriads(t);
  const isUsable = (degree: number) => {
    const q = triads[degree - 1]?.quality;
    return degree === 1 || q === "major" || q === "minor";
  };
  const candidates: NextChord[] = [
    ...(triads[lastDegree - 1]?.quality === "diminished"
      ? [{ degree: degreeUp(lastDegree, 1), reason: "resolve" as const }]
      : []),
    { degree: degreeUp(lastDegree, 3), reason: "fifthDown" },
    ...characteristic(t.scale).chordDegrees.map((degree) => ({
      degree,
      reason: "colour" as const,
    })),
    { degree: degreeUp(lastDegree, 5), reason: "thirdDown" },
    { degree: degreeUp(lastDegree, 1), reason: "stepUp" },
    { degree: 1, reason: "home" },
    { degree: degreeUp(lastDegree, 6), reason: "stepDown" },
    { degree: degreeUp(lastDegree, 4), reason: "fifthUp" },
  ];
  const seen = new Set<number>([lastDegree]);
  const picked: NextChord[] = [];
  for (const c of candidates) {
    if (seen.has(c.degree) || !isUsable(c.degree)) continue;
    seen.add(c.degree);
    picked.push(c);
    if (picked.length === 4) break;
  }
  return picked;
}

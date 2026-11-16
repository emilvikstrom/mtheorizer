import { CHORD_QUALITIES, CHORD_QUALITY_IDS, type Chord, type ChordQualityId } from "./chords";
import {
  type ChordModifier,
  type ChordSpec,
  buildChordFromSpec,
  normalizeSpec,
  specOf,
} from "./chordSpec";
import { type Note, formatNote } from "./notes";

/**
 * Naming of chord specs: the symbol ("Cm7♭5") and the name ("minor seventh
 * flat five") of every spec, and the named chord quality it corresponds to.
 *
 * The rules, in the order the symbol is built (`C` + suffix):
 * - A minor or diminished base gives `m`. A diminished triad is `°`, and with
 *   a diminished seventh it is `°7`, `°9` or `°11`. A diminished chord with a
 *   minor seventh is a minor chord with `♭5` (`m7♭5`).
 * - An augmented triad is `+`. With a seventh it is the base chord with `♯5`
 *   (`7♯5`, `maj7♯5`).
 * - A seventh is written `7` or `maj7`, and an extension replaces the `7`
 *   (`9`, `11`, `13`, `maj9`), since 9, 11 and 13 imply a seventh. On a minor
 *   chord with a major seventh it is `m(maj7)`. A sixth is `6`, and `6/9` with
 *   a ninth.
 * - `sus2` and `sus4` follow the number (`7sus4`, `13sus4`).
 * - Altered tones follow in order of degree (`♭5`/`♯5`, `♭9`/`♯9`, `♯11`,
 *   `♭13`), as `7♭5♭9`. After an extension number they stand in parentheses
 *   (`13(♭9)`), and on a triad too (`C(♭5)`, since `C♭5` reads as a C♭ note).
 * - An added tone is `addN`, bare on a major chord (`Cadd9`) and in
 *   parentheses otherwise (`Cm(add9)`, `Csus4(add9)`, `C(♭5,add9)`).
 */

/** The altered tones above the fifth, in order of degree. */
const UPPER_ALTERATIONS = [
  { modifier: "flat9", symbol: "♭9", name: "flat nine" },
  { modifier: "sharp9", symbol: "♯9", name: "sharp nine" },
  { modifier: "sharp11", symbol: "♯11", name: "sharp eleven" },
  { modifier: "flat13", symbol: "♭13", name: "flat thirteen" },
] as const;

const ADDED_NAMES = {
  add2: "added second",
  add4: "added fourth",
  add9: "added ninth",
  add11: "added eleventh",
} as const;

const ADDED = Object.keys(ADDED_NAMES) as (keyof typeof ADDED_NAMES)[];

/** The facts about a spec that symbol and name are both built from. */
function describe(input: ChordSpec) {
  const { base, qualities } = normalizeSpec(input);
  const has = (m: ChordModifier) => qualities.includes(m);
  const extension = has("13") ? "13" : has("11") ? "11" : has("9") && !has("6") ? "9" : null;
  const seventh = has("maj7") ? "maj7" : has("7") ? "7" : has("dim7") ? "dim7" : null;
  const sharpFive = base === "augmented" && seventh !== null;
  const alterations: string[] = [];
  const alterationNames: string[] = [];
  // The half-diminished seventh is a minor seventh with ♭5 (`m7♭5`).
  const flatFive = has("flat5") || (base === "diminished" && seventh === "7");
  if (flatFive) {
    alterations.push("♭5");
    alterationNames.push("flat five");
  }
  if (sharpFive) {
    alterations.push("♯5");
    alterationNames.push("sharp five");
  }
  for (const { modifier, symbol, name } of UPPER_ALTERATIONS) {
    if (has(modifier)) {
      alterations.push(symbol);
      alterationNames.push(name);
    }
  }
  const added = ADDED.find(has) ?? null;
  return { base, has, extension, seventh, alterations, alterationNames, added };
}

/** The symbol after the root, e.g. "m7♭5" in "Cm7♭5". */
export function chordSymbolSuffix(input: ChordSpec): string {
  const { base, has, extension, seventh, alterations, added } = describe(input);
  if (base === "power") return "5";
  if (base === "diminished" && seventh === "dim7") return `°${extension ?? "7"}`;

  const sus = base === "sus2" ? "sus2" : base === "sus4" ? "sus4" : "";
  const minor = base === "minor" || base === "diminished";
  let number = "";
  let prefix = minor ? "m" : "";
  if (seventh === "maj7") {
    const n = extension ?? "7";
    if (minor) {
      prefix = "";
      number = `m(maj${n})`;
    } else {
      number = `maj${n}`;
    }
  } else if (seventh === "7") {
    number = extension ?? "7";
  } else if (has("6")) {
    number = has("9") ? "6/9" : "6";
  }

  if (number === "") {
    // A triad: its own symbol, then altered and added tones in one parenthesis.
    const triad = base === "diminished" ? "°" : base === "augmented" ? "+" : prefix + sus;
    const items = [...alterations, ...(added ? [added] : [])];
    if (items.length === 0) return triad;
    if (triad === "" && !alterations.length) return items[0] ?? "";
    return `${triad}(${items.join(",")})`;
  }

  const head = prefix + number + sus;
  if (alterations.length === 0) return head;
  return extension ? `${head}(${alterations.join(",")})` : head + alterations.join("");
}

/** The symbol of a spec on `root`, e.g. "B♭7♯9". */
export function chordSymbolFor(root: Note, spec: ChordSpec): string {
  return `${formatNote(root)}${chordSymbolSuffix(spec)}`;
}

const NUMBER_WORDS: Record<string, string> = {
  "7": "seventh",
  "9": "ninth",
  "11": "eleventh",
  "13": "thirteenth",
};

/** The name after the root, e.g. "minor seventh flat five" in "C minor seventh flat five". */
export function chordNameFor(input: ChordSpec): string {
  const { base, has, extension, seventh, alterationNames, added } = describe(input);
  if (base === "power") return "power chord";

  const word = NUMBER_WORDS[extension ?? "7"] ?? "seventh";
  const sus = base === "sus2" ? "suspended second" : base === "sus4" ? "suspended fourth" : "";
  const minor = base === "minor";
  let head: string;
  let alterations = alterationNames;

  if (base === "diminished" && seventh === "dim7") {
    return `diminished ${word}`;
  } else if (seventh === "maj7") {
    // An augmented triad with a major seventh and nothing else is its own name.
    const bare = base === "augmented" && !extension && alterationNames.length === 1;
    head = bare ? "augmented major seventh" : minor ? `minor major ${word}` : `major ${word}`;
    if (bare) alterations = [];
  } else if (seventh === "7") {
    const bare = base === "augmented" && !extension && alterationNames.length === 1;
    if (base === "diminished") {
      head = `half-diminished ${word}`;
      alterations = alterations.slice(1);
    } else if (minor) {
      head = `minor ${word}`;
    } else if (bare) {
      head = "augmented seventh";
      alterations = [];
    } else {
      head = `dominant ${word}`;
    }
  } else if (has("6")) {
    head = has("9")
      ? minor
        ? "minor six-nine"
        : "six-nine"
      : minor
        ? "minor sixth"
        : "major sixth";
  } else if (added && base === "major" && alterations.length === 0) {
    head = "";
  } else if (base === "diminished") {
    head = "diminished";
  } else if (base === "augmented") {
    head = "augmented";
  } else if (sus) {
    head = "";
  } else {
    head = minor ? "minor" : "major";
  }

  const parts = [head, sus, ...alterations];
  if (added) parts.push(ADDED_NAMES[added]);
  return parts.filter((part) => part !== "").join(" ");
}

const NAMED_BY_KEY = new Map<string, ChordQualityId>(
  CHORD_QUALITY_IDS.map((id) => {
    const { base, qualities } = normalizeSpec(specOf(id));
    return [`${base}:${qualities.join(",")}`, id] as const;
  }),
);

/** The named chord quality a spec corresponds to (`dominant7Sharp9`), if it has one. */
export function identifyQuality(spec: ChordSpec): ChordQualityId | undefined {
  const { base, qualities } = normalizeSpec(spec);
  return NAMED_BY_KEY.get(`${base}:${qualities.join(",")}`);
}

/**
 * The named chord quality closest to a spec: the spec itself when it has a name,
 * otherwise the spec with its last modifiers dropped until it does (C7♭5♭9 →
 * C7♭5). Every base chord is named, so there is always an answer. Links can only
 * name the 43 qualities until M6-05, so they use this.
 */
export function nearestQuality(spec: ChordSpec): ChordQualityId {
  const { base, qualities } = normalizeSpec(spec);
  const kept = [...qualities]; // in canonical order, so the last ones are dropped first
  for (;;) {
    const id = identifyQuality({ base, qualities: kept });
    if (id !== undefined) return id;
    kept.pop();
  }
}

/** The chord a spec describes on `root`: tones, name and symbol, ready to show and play. */
export function chordFromSpec(root: Note, spec: ChordSpec): Chord {
  const { spec: normalized, tones } = buildChordFromSpec(root, spec);
  const id = identifyQuality(normalized);
  return {
    root,
    ...(id ? { quality: CHORD_QUALITIES[id] } : {}),
    tones,
    name: `${formatNote(root)} ${chordNameFor(normalized)}`,
    symbol: chordSymbolFor(root, normalized),
  };
}

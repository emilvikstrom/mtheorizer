import {
  type OpenString,
  MAX_STRINGS,
  MIN_STRINGS,
  type StringInstrumentId,
  type TuningId,
  openStringMidi,
} from "./fretboard";
import { type Letter, LETTERS, formatNote } from "./notes";

/**
 * Open strings as link text: letter, `s` (sharp) or `b` (flat), octave; string 1 first.
 * E♭ standard is `Eb4,Bb3,Gb3,Db3,Ab2,Eb2`.
 */
export function formatTune(strings: readonly OpenString[]): string {
  return strings
    .map(({ note: { letter, accidental }, octave }) => {
      const mark = accidental >= 0 ? "s".repeat(accidental) : "b".repeat(-accidental);
      return `${letter}${mark}${octave}`;
    })
    .join(",");
}

const STRING_PATTERN = /^([A-G])(s{1,2}|b{1,2})?(\d)$/;

/**
 * Open strings from link text. Text that isn't a list of `letter[s|b]octave` between
 * `MIN_STRINGS` and `MAX_STRINGS` long gives nothing, so a broken link falls back to the
 * default tuning instead of a half-read one.
 */
export function parseTune(text: string | null | undefined): OpenString[] | undefined {
  if (!text) return undefined;
  const parts = text.split(",");
  if (parts.length < MIN_STRINGS || parts.length > MAX_STRINGS) return undefined;
  const strings: OpenString[] = [];
  for (const part of parts) {
    const match = STRING_PATTERN.exec(part);
    const letter = match?.[1];
    if (!match || !letter || !(LETTERS as readonly string[]).includes(letter)) return undefined;
    const mark = match[2] ?? "";
    const accidental = mark.startsWith("s") ? mark.length : -mark.length;
    strings.push({
      note: { letter: letter as Letter, accidental: mark === "" ? 0 : accidental },
      octave: Number(match[3]),
    });
  }
  return strings;
}

/** "E2 A2 D3 G3 B3 E4" style names for a tuning, low string first, as players say it. */
export function describeTuning(strings: readonly OpenString[]): string {
  return [...strings]
    .sort((a, b) => openStringMidi(a) - openStringMidi(b))
    .map((s) => formatNote(s.note))
    .join(" ");
}

export type PresetGroup = "Guitar" | "Ukulele" | "Bass" | "Other";

export interface TuningPreset {
  readonly id: string;
  readonly label: string;
  readonly group: PresetGroup;
  /** String 1 first. */
  readonly strings: readonly OpenString[];
  /** The built-in instrument and tuning this is, so older links and the saved choices still match. */
  readonly builtIn?: { readonly instrument: StringInstrumentId; readonly tuning?: TuningId };
}

const preset = (
  id: string,
  group: PresetGroup,
  label: string,
  tune: string,
  builtIn?: TuningPreset["builtIn"],
): TuningPreset => {
  const strings = parseTune(tune);
  if (!strings) throw new Error(`Bad tuning for ${id}: ${tune}`);
  return { id, group, label, strings, ...(builtIn ? { builtIn } : {}) };
};

/** Ready-made setups, as the settings page lists them. */
export const TUNING_PRESETS: readonly TuningPreset[] = [
  preset("guitar", "Guitar", "Guitar, standard", "E4,B3,G3,D3,A2,E2", {
    instrument: "guitar",
    tuning: "standard",
  }),
  preset("guitarDropD", "Guitar", "Guitar, drop D", "E4,B3,G3,D3,A2,D2", {
    instrument: "guitar",
    tuning: "dropD",
  }),
  preset("guitarDadgad", "Guitar", "Guitar, DADGAD", "D4,A3,G3,D3,A2,D2", {
    instrument: "guitar",
    tuning: "dadgad",
  }),
  preset("guitarHalfDown", "Guitar", "Guitar, half step down", "Eb4,Bb3,Gb3,Db3,Ab2,Eb2"),
  preset("guitarDropC", "Guitar", "Guitar, drop C", "D4,A3,F3,C3,G2,C2"),
  preset("guitarOpenG", "Guitar", "Guitar, open G", "D4,B3,G3,D3,G2,D2"),
  preset("guitarOpenD", "Guitar", "Guitar, open D", "D4,A3,Fs3,D3,A2,D2"),
  preset("guitarOpenE", "Guitar", "Guitar, open E", "E4,B3,Gs3,E3,B2,E2"),
  preset("guitarBaritone", "Guitar", "Baritone guitar (B to B)", "B3,Fs3,D3,A2,E2,B1"),
  preset("guitar7", "Guitar", "7-string guitar", "E4,B3,G3,D3,A2,E2,B1"),
  preset("guitar8", "Guitar", "8-string guitar", "E4,B3,G3,D3,A2,E2,B1,Fs1"),
  preset("ukulele", "Ukulele", "Ukulele, GCEA", "A4,E4,C4,G4", {
    instrument: "ukulele",
  }),
  preset("ukuleleLowG", "Ukulele", "Ukulele, low G", "A4,E4,C4,G3"),
  preset("ukuleleBaritone", "Ukulele", "Baritone ukulele, DGBE", "E4,B3,G3,D3"),
  preset("bass", "Bass", "Bass, EADG", "G2,D2,A1,E1", { instrument: "bass" }),
  preset("bassDropD", "Bass", "Bass, drop D", "G2,D2,A1,D1"),
  preset("bass5", "Bass", "5-string bass, BEADG", "G2,D2,A1,E1,B0", { instrument: "bass5" }),
  preset("bass6", "Bass", "6-string bass, BEADGC", "C3,G2,D2,A1,E1,B0"),
  preset("mandolin", "Other", "Mandolin, GDAE", "E5,A4,D4,G3", { instrument: "mandolin" }),
  preset("mandola", "Other", "Mandola, CGDA", "A4,D4,G3,C3"),
];

export const PRESET_GROUPS: readonly PresetGroup[] = ["Guitar", "Ukulele", "Bass", "Other"];

const sameStrings = (a: readonly OpenString[], b: readonly OpenString[]) =>
  a.length === b.length && a.every((s, i) => b[i] && openStringMidi(s) === openStringMidi(b[i]));

/** The preset that tunes `strings` to the same pitches, if there is one. */
export function presetFor(strings: readonly OpenString[]): TuningPreset | undefined {
  return TUNING_PRESETS.find((p) => sameStrings(p.strings, strings));
}

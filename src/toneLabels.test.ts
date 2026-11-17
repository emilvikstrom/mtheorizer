import { describe, expect, it } from "vitest";
import {
  CHORD_QUALITIES,
  CHORD_QUALITY_IDS,
  type ChordQualityId,
  type ChordRole,
  SCALES,
  type ScaleId,
  buildChord,
  chordHighlights,
  chordOnKeyboard,
  note,
  scaleHighlights,
  scaleOnKeyboard,
  spellScale,
} from "./theory";
import {
  DEFAULT_TONE_DISPLAY,
  TONE_DISPLAYS,
  intervalLabel,
  isToneDisplay,
  toneLabel,
} from "./toneLabels";

const C = note("C");

const labelsOf = (id: ChordQualityId, display: "intervals" | "steps" | "names") =>
  chordHighlights(buildChord(C, id)).map((tone) => toneLabel(display, tone));

/** The number each chord role is written with. */
const ROLE_NUMBER: Readonly<Record<ChordRole, string>> = {
  root: "R",
  second: "2",
  third: "3",
  fourth: "4",
  fifth: "5",
  sixth: "6",
  seventh: "7",
  ninth: "9",
  eleventh: "11",
  thirteenth: "13",
};

describe("toneLabel", () => {
  it("writes interval names as chord symbols do", () => {
    expect(labelsOf("major", "intervals")).toEqual(["R", "3", "5"]);
    expect(labelsOf("minor", "intervals")).toEqual(["R", "♭3", "5"]);
    expect(labelsOf("dominant7", "intervals")).toEqual(["R", "3", "5", "♭7"]);
    expect(labelsOf("major7", "intervals")).toEqual(["R", "3", "5", "7"]);
    expect(labelsOf("halfDiminished7", "intervals")).toEqual(["R", "♭3", "♭5", "♭7"]);
    expect(labelsOf("diminished7", "intervals")).toEqual(["R", "♭3", "♭5", "𝄫7"]);
    expect(labelsOf("dominant7Sharp9", "intervals")).toContain("♯9");
    expect(labelsOf("dominant7Flat9", "intervals")).toContain("♭9");
    expect(labelsOf("dominant7Sharp11", "intervals")).toContain("♯11");
    expect(labelsOf("sus4", "intervals")).toEqual(["R", "4", "5"]);
    expect(labelsOf("augmented", "intervals")).toEqual(["R", "3", "♯5"]);
  });

  it("numbers the tones of a chord from the root upwards", () => {
    expect(labelsOf("major", "steps")).toEqual(["1", "2", "3"]);
    expect(labelsOf("dominant7", "steps")).toEqual(["1", "2", "3", "4"]);
    expect(labelsOf("dominant9", "steps")).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("gives the note names with their spelling", () => {
    expect(labelsOf("minor", "names")).toEqual(["C", "E♭", "G"]);
    const flatMinor = chordHighlights(buildChord(note("E", -1), "minor"));
    expect(flatMinor.map((tone) => toneLabel("names", tone))).toEqual(["E♭", "G♭", "B♭"]);
  });

  it("writes nothing in practice mode", () => {
    for (const tone of chordHighlights(buildChord(C, "major"))) {
      expect(toneLabel("none", tone)).toBeUndefined();
    }
  });

  it("falls back to the note name for a tone that has no interval or step", () => {
    const tone = { note: note("E", -1), isRoot: false, role: "third" };
    expect(toneLabel("intervals", tone)).toBe("E♭");
    expect(toneLabel("steps", tone)).toBe("E♭");
  });

  describe.each(CHORD_QUALITY_IDS)("%s", (id) => {
    const chord = buildChord(C, id);
    const highlights = chordHighlights(chord);

    it("labels every tone with the number of its role, never as a sharpened lower degree", () => {
      chord.tones.forEach((tone, i) => {
        const label = toneLabel("intervals", highlights[i]!)!;
        expect(withoutAccidental(label), `${id} ${tone.role}`).toBe(ROLE_NUMBER[tone.role]);
        // ♯6 would be a spelling of ♭7, and ♯4 of ♭5, only ever written by mistake.
        expect(label).not.toBe("♯6");
      });
    });

    it("labels each tone differently in every display", () => {
      for (const display of ["intervals", "steps", "names"] as const) {
        const labels = highlights.map((tone) => toneLabel(display, tone));
        expect(new Set(labels).size, `${id} ${display}`).toBe(labels.length);
      }
    });

    it("carries the same labels onto the keyboard", () => {
      const keys = chordOnKeyboard(chord, 4, 0);
      const expected = new Map(
        highlights.map((t) => [formatKey(t.note), toneLabel("intervals", t)]),
      );
      for (const key of keys) {
        expect(toneLabel("intervals", key)).toBe(expected.get(formatKey(key.note)));
      }
    });

    it("keeps the labels when the chord is inverted", () => {
      const first = new Set(chordOnKeyboard(chord, 4, 0).map((k) => toneLabel("steps", k)));
      for (let inversion = 1; inversion <= 3; inversion++) {
        const inverted = chordOnKeyboard(chord, 4, inversion).map((k) => toneLabel("steps", k));
        if (inverted.length === first.size) expect(new Set(inverted)).toEqual(first);
      }
    });
  });

  it("covers every chord quality", () => {
    expect(CHORD_QUALITY_IDS.every((id) => CHORD_QUALITIES[id] !== undefined)).toBe(true);
  });

  describe.each(Object.keys(SCALES) as ScaleId[])("%s scale", (id) => {
    const scale = spellScale(C, id);
    const highlights = scaleHighlights(scale);

    it("names the tonic R and numbers the degrees", () => {
      expect(toneLabel("intervals", highlights[0]!)).toBe("R");
      expect(highlights.map((t) => toneLabel("steps", t))).toEqual(
        scale.tones.map((_, i) => String(i + 1)),
      );
    });

    it("writes each degree as its number with an accidental, as in the major scale", () => {
      highlights.forEach((tone, i) => {
        if (i === 0) return;
        const label = toneLabel("intervals", tone)!;
        expect(withoutAccidental(label)).toBe(String(scale.tones[i]!.interval.steps + 1));
      });
    });

    it("labels the closing tonic on the keyboard as the tonic", () => {
      const keys = scaleOnKeyboard(scale);
      const last = keys[keys.length - 1]!;
      expect(toneLabel("intervals", last)).toBe("R");
      expect(toneLabel("steps", last)).toBe("1");
    });
  });

  it("writes the degrees of the minor and the blues scale", () => {
    const labels = (id: ScaleId) =>
      scaleHighlights(spellScale(C, id)).map((t) => toneLabel("intervals", t));
    expect(labels("naturalMinor")).toEqual(["R", "2", "♭3", "4", "5", "♭6", "♭7"]);
    expect(labels("dorian")).toEqual(["R", "2", "♭3", "4", "5", "6", "♭7"]);
    expect(labels("lydian")).toEqual(["R", "2", "3", "♯4", "5", "6", "7"]);
  });
});

describe("intervalLabel", () => {
  it("names the extensions above the octave", () => {
    const tone = (id: ChordQualityId, role: ChordRole) =>
      buildChord(C, id).tones.find((t) => t.role === role)!.interval;
    expect(intervalLabel(tone("dominant9", "ninth"))).toBe("9");
    expect(intervalLabel(tone("dominant7Flat9", "ninth"))).toBe("♭9");
    expect(intervalLabel(tone("dominant7Sharp9", "ninth"))).toBe("♯9");
    expect(intervalLabel(tone("dominant11", "eleventh"))).toBe("11");
    expect(intervalLabel(tone("dominant13", "thirteenth"))).toBe("13");
    expect(intervalLabel(tone("dominant7Flat13", "thirteenth"))).toBe("♭13");
  });
});

describe("tone displays", () => {
  it("lists the four displays, names first", () => {
    expect(TONE_DISPLAYS).toEqual(["names", "intervals", "steps", "none"]);
    expect(DEFAULT_TONE_DISPLAY).toBe("names");
  });

  it("recognizes only those", () => {
    expect(TONE_DISPLAYS.every(isToneDisplay)).toBe(true);
    expect(isToneDisplay("degrees")).toBe(false);
    expect(isToneDisplay(undefined)).toBe(false);
  });
});

/** The label without its accidentals: "♭♭7" is the seventh, "♯11" the eleventh. */
function withoutAccidental(label: string): string {
  return label.replace(/^(?:♭|♯|𝄫|𝄪)+/u, "");
}

function formatKey(n: { letter: string; accidental: number }): string {
  return `${n.letter}${n.accidental}`;
}

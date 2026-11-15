import { describe, expect, it } from "vitest";
import {
  CHORD_GROUPS,
  CHORD_QUALITIES,
  CHORD_QUALITY_IDS,
  type ChordQualityId,
  buildChord,
  chordOnPitchClass,
  preferredRootSpelling,
  qualitiesInGroup,
  toneLabel,
} from "./chords";
import { formatNoteAscii, letterAt, parseNote, pitchClass } from "./notes";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

const notesOf = (chord: ReturnType<typeof buildChord>) =>
  chord.tones.map((t) => formatNoteAscii(t.note)).join(" ");

/** Pitch class 0..11 → expected spelling, the way the theory spells it (one root spelling per chord). */
const SPELLINGS: Record<ChordQualityId, readonly string[]> = {
  major: [
    "C E G",
    "Db F Ab",
    "D F# A",
    "Eb G Bb",
    "E G# B",
    "F A C",
    "F# A# C#",
    "G B D",
    "Ab C Eb",
    "A C# E",
    "Bb D F",
    "B D# F#",
  ],
  minor: [
    "C Eb G",
    "C# E G#",
    "D F A",
    "Eb Gb Bb",
    "E G B",
    "F Ab C",
    "F# A C#",
    "G Bb D",
    "G# B D#",
    "A C E",
    "Bb Db F",
    "B D F#",
  ],
  diminished: [
    "C Eb Gb",
    "C# E G",
    "D F Ab",
    "D# F# A",
    "E G Bb",
    "F Ab Cb",
    "F# A C",
    "G Bb Db",
    "G# B D",
    "A C Eb",
    "A# C# E",
    "B D F",
  ],
  augmented: [
    "C E G#",
    "Db F A",
    "D F# A#",
    "Eb G B",
    "E G# B#",
    "F A C#",
    "Gb Bb D",
    "G B D#",
    "Ab C E",
    "A C# E#",
    "Bb D F#",
    "B D# F##",
  ],
  sus2: [
    "C D G",
    "Db Eb Ab",
    "D E A",
    "Eb F Bb",
    "E F# B",
    "F G C",
    "F# G# C#",
    "G A D",
    "Ab Bb Eb",
    "A B E",
    "Bb C F",
    "B C# F#",
  ],
  sus4: [
    "C F G",
    "Db Gb Ab",
    "D G A",
    "Eb Ab Bb",
    "E A B",
    "F Bb C",
    "F# B C#",
    "G C D",
    "Ab Db Eb",
    "A D E",
    "Bb Eb F",
    "B E F#",
  ],
  power: [
    "C G",
    "Db Ab",
    "D A",
    "Eb Bb",
    "E B",
    "F C",
    "F# C#",
    "G D",
    "Ab Eb",
    "A E",
    "Bb F",
    "B F#",
  ],
  major6: [
    "C E G A",
    "Db F Ab Bb",
    "D F# A B",
    "Eb G Bb C",
    "E G# B C#",
    "F A C D",
    "F# A# C# D#",
    "G B D E",
    "Ab C Eb F",
    "A C# E F#",
    "Bb D F G",
    "B D# F# G#",
  ],
  minor6: [
    "C Eb G A",
    "C# E G# A#",
    "D F A B",
    "Eb Gb Bb C",
    "E G B C#",
    "F Ab C D",
    "F# A C# D#",
    "G Bb D E",
    "G# B D# E#",
    "A C E F#",
    "Bb Db F G",
    "B D F# G#",
  ],
  sixNine: [
    "C E G A D",
    "Db F Ab Bb Eb",
    "D F# A B E",
    "Eb G Bb C F",
    "E G# B C# F#",
    "F A C D G",
    "F# A# C# D# G#",
    "G B D E A",
    "Ab C Eb F Bb",
    "A C# E F# B",
    "Bb D F G C",
    "B D# F# G# C#",
  ],
  minorSixNine: [
    "C Eb G A D",
    "C# E G# A# D#",
    "D F A B E",
    "Eb Gb Bb C F",
    "E G B C# F#",
    "F Ab C D G",
    "F# A C# D# G#",
    "G Bb D E A",
    "G# B D# E# A#",
    "A C E F# B",
    "Bb Db F G C",
    "B D F# G# C#",
  ],
  major7: [
    "C E G B",
    "Db F Ab C",
    "D F# A C#",
    "Eb G Bb D",
    "E G# B D#",
    "F A C E",
    "Gb Bb Db F",
    "G B D F#",
    "Ab C Eb G",
    "A C# E G#",
    "Bb D F A",
    "B D# F# A#",
  ],
  dominant7: [
    "C E G Bb",
    "Db F Ab Cb",
    "D F# A C",
    "Eb G Bb Db",
    "E G# B D",
    "F A C Eb",
    "F# A# C# E",
    "G B D F",
    "Ab C Eb Gb",
    "A C# E G",
    "Bb D F Ab",
    "B D# F# A",
  ],
  minor7: [
    "C Eb G Bb",
    "C# E G# B",
    "D F A C",
    "Eb Gb Bb Db",
    "E G B D",
    "F Ab C Eb",
    "F# A C# E",
    "G Bb D F",
    "G# B D# F#",
    "A C E G",
    "Bb Db F Ab",
    "B D F# A",
  ],
  minorMajor7: [
    "C Eb G B",
    "C# E G# B#",
    "D F A C#",
    "Eb Gb Bb D",
    "E G B D#",
    "F Ab C E",
    "F# A C# E#",
    "G Bb D F#",
    "Ab Cb Eb G",
    "A C E G#",
    "Bb Db F A",
    "B D F# A#",
  ],
  halfDiminished7: [
    "C Eb Gb Bb",
    "C# E G B",
    "D F Ab C",
    "D# F# A C#",
    "E G Bb D",
    "F Ab Cb Eb",
    "F# A C E",
    "G Bb Db F",
    "G# B D F#",
    "A C Eb G",
    "A# C# E G#",
    "B D F A",
  ],
  diminished7: [
    "C Eb Gb Bbb",
    "C# E G Bb",
    "D F Ab Cb",
    "D# F# A C",
    "E G Bb Db",
    "F Ab Cb Ebb",
    "F# A C Eb",
    "G Bb Db Fb",
    "G# B D F",
    "A C Eb Gb",
    "A# C# E G",
    "B D F Ab",
  ],
  augmented7: [
    "C E G# Bb",
    "Db F A Cb",
    "D F# A# C",
    "Eb G B Db",
    "E G# B# D",
    "F A C# Eb",
    "Gb Bb D Fb",
    "G B D# F",
    "Ab C E Gb",
    "A C# E# G",
    "Bb D F# Ab",
    "B D# F## A",
  ],
  augmentedMajor7: [
    "C E G# B",
    "Db F A C",
    "D F# A# C#",
    "Eb G B D",
    "E G# B# D#",
    "F A C# E",
    "Gb Bb D F",
    "G B D# F#",
    "Ab C E G",
    "A C# E# G#",
    "Bb D F# A",
    "B D# F## A#",
  ],
  dominant7Flat5: [
    "C E Gb Bb",
    "C# E# G B",
    "D F# Ab C",
    "Eb G Bbb Db",
    "E G# Bb D",
    "F A Cb Eb",
    "F# A# C E",
    "G B Db F",
    "G# B# D F#",
    "A C# Eb G",
    "Bb D Fb Ab",
    "B D# F A",
  ],
  dominant7Sus4: [
    "C F G Bb",
    "C# F# G# B",
    "D G A C",
    "Eb Ab Bb Db",
    "E A B D",
    "F Bb C Eb",
    "F# B C# E",
    "G C D F",
    "Ab Db Eb Gb",
    "A D E G",
    "Bb Eb F Ab",
    "B E F# A",
  ],
  major9: [
    "C E G B D",
    "Db F Ab C Eb",
    "D F# A C# E",
    "Eb G Bb D F",
    "E G# B D# F#",
    "F A C E G",
    "Gb Bb Db F Ab",
    "G B D F# A",
    "Ab C Eb G Bb",
    "A C# E G# B",
    "Bb D F A C",
    "B D# F# A# C#",
  ],
  dominant9: [
    "C E G Bb D",
    "Db F Ab Cb Eb",
    "D F# A C E",
    "Eb G Bb Db F",
    "E G# B D F#",
    "F A C Eb G",
    "F# A# C# E G#",
    "G B D F A",
    "Ab C Eb Gb Bb",
    "A C# E G B",
    "Bb D F Ab C",
    "B D# F# A C#",
  ],
  minor9: [
    "C Eb G Bb D",
    "C# E G# B D#",
    "D F A C E",
    "Eb Gb Bb Db F",
    "E G B D F#",
    "F Ab C Eb G",
    "F# A C# E G#",
    "G Bb D F A",
    "G# B D# F# A#",
    "A C E G B",
    "Bb Db F Ab C",
    "B D F# A C#",
  ],
  dominant7Flat9: [
    "C E G Bb Db",
    "C# E# G# B D",
    "D F# A C Eb",
    "Eb G Bb Db Fb",
    "E G# B D F",
    "F A C Eb Gb",
    "F# A# C# E G",
    "G B D F Ab",
    "G# B# D# F# A",
    "A C# E G Bb",
    "Bb D F Ab Cb",
    "B D# F# A C",
  ],
  dominant7Sharp9: [
    "C E G Bb D#",
    "Db F Ab Cb E",
    "D F# A C E#",
    "Eb G Bb Db F#",
    "E G# B D F##",
    "F A C Eb G#",
    "Gb Bb Db Fb A",
    "G B D F A#",
    "Ab C Eb Gb B",
    "A C# E G B#",
    "Bb D F Ab C#",
    "B D# F# A C##",
  ],
  dominant9Sus4: [
    "C F G Bb D",
    "C# F# G# B D#",
    "D G A C E",
    "Eb Ab Bb Db F",
    "E A B D F#",
    "F Bb C Eb G",
    "F# B C# E G#",
    "G C D F A",
    "Ab Db Eb Gb Bb",
    "A D E G B",
    "Bb Eb F Ab C",
    "B E F# A C#",
  ],
  dominant11: [
    "C E G Bb D F",
    "Db F Ab Cb Eb Gb",
    "D F# A C E G",
    "Eb G Bb Db F Ab",
    "E G# B D F# A",
    "F A C Eb G Bb",
    "F# A# C# E G# B",
    "G B D F A C",
    "Ab C Eb Gb Bb Db",
    "A C# E G B D",
    "Bb D F Ab C Eb",
    "B D# F# A C# E",
  ],
  minor11: [
    "C Eb G Bb D F",
    "C# E G# B D# F#",
    "D F A C E G",
    "Eb Gb Bb Db F Ab",
    "E G B D F# A",
    "F Ab C Eb G Bb",
    "F# A C# E G# B",
    "G Bb D F A C",
    "G# B D# F# A# C#",
    "A C E G B D",
    "Bb Db F Ab C Eb",
    "B D F# A C# E",
  ],
  dominant7Sharp11: [
    "C E G Bb F#",
    "Db F Ab Cb G",
    "D F# A C G#",
    "Eb G Bb Db A",
    "E G# B D A#",
    "F A C Eb B",
    "F# A# C# E B#",
    "G B D F C#",
    "Ab C Eb Gb D",
    "A C# E G D#",
    "Bb D F Ab E",
    "B D# F# A E#",
  ],
  major7Sharp11: [
    "C E G B F#",
    "Db F Ab C G",
    "D F# A C# G#",
    "Eb G Bb D A",
    "E G# B D# A#",
    "F A C E B",
    "Gb Bb Db F C",
    "G B D F# C#",
    "Ab C Eb G D",
    "A C# E G# D#",
    "Bb D F A E",
    "B D# F# A# E#",
  ],
  dominant13: [
    "C E G Bb D A",
    "Db F Ab Cb Eb Bb",
    "D F# A C E B",
    "Eb G Bb Db F C",
    "E G# B D F# C#",
    "F A C Eb G D",
    "F# A# C# E G# D#",
    "G B D F A E",
    "Ab C Eb Gb Bb F",
    "A C# E G B F#",
    "Bb D F Ab C G",
    "B D# F# A C# G#",
  ],
  major13: [
    "C E G B D A",
    "Db F Ab C Eb Bb",
    "D F# A C# E B",
    "Eb G Bb D F C",
    "E G# B D# F# C#",
    "F A C E G D",
    "Gb Bb Db F Ab Eb",
    "G B D F# A E",
    "Ab C Eb G Bb F",
    "A C# E G# B F#",
    "Bb D F A C G",
    "B D# F# A# C# G#",
  ],
  minor13: [
    "C Eb G Bb D F A",
    "C# E G# B D# F# A#",
    "D F A C E G B",
    "Eb Gb Bb Db F Ab C",
    "E G B D F# A C#",
    "F Ab C Eb G Bb D",
    "F# A C# E G# B D#",
    "G Bb D F A C E",
    "G# B D# F# A# C# E#",
    "A C E G B D F#",
    "Bb Db F Ab C Eb G",
    "B D F# A C# E G#",
  ],
  add9: [
    "C E G D",
    "Db F Ab Eb",
    "D F# A E",
    "Eb G Bb F",
    "E G# B F#",
    "F A C G",
    "F# A# C# G#",
    "G B D A",
    "Ab C Eb Bb",
    "A C# E B",
    "Bb D F C",
    "B D# F# C#",
  ],
  minorAdd9: [
    "C Eb G D",
    "C# E G# D#",
    "D F A E",
    "Eb Gb Bb F",
    "E G B F#",
    "F Ab C G",
    "F# A C# G#",
    "G Bb D A",
    "G# B D# A#",
    "A C E B",
    "Bb Db F C",
    "B D F# C#",
  ],
  add11: [
    "C E G F",
    "Db F Ab Gb",
    "D F# A G",
    "Eb G Bb Ab",
    "E G# B A",
    "F A C Bb",
    "F# A# C# B",
    "G B D C",
    "Ab C Eb Db",
    "A C# E D",
    "Bb D F Eb",
    "B D# F# E",
  ],
};

describe("every chord quality on all 12 roots", () => {
  it("has a spelling table for every quality", () => {
    expect(Object.keys(SPELLINGS).sort()).toEqual([...CHORD_QUALITY_IDS].sort());
  });

  describe.each(CHORD_QUALITY_IDS)("%s", (quality) => {
    it.each(PITCH_CLASSES)("on pitch class %i is spelled as expected", (pc) => {
      expect(notesOf(chordOnPitchClass(pc, quality))).toBe(SPELLINGS[quality][pc]);
    });

    it.each(PITCH_CLASSES)(
      "on pitch class %i has every tone on the right pitch and letter",
      (pc) => {
        const chord = chordOnPitchClass(pc, quality);
        expect(pitchClass(chord.root)).toBe(pc);
        for (const tone of chord.tones) {
          expect(pitchClass(tone.note)).toBe((pc + tone.interval.semitones) % 12);
          expect(tone.note.letter).toBe(letterAt(chord.root.letter, tone.interval.steps));
        }
      },
    );
  });

  it("keeps every chord tone on the right pitch for major and minor", () => {
    for (let pc = 0; pc < 12; pc++) {
      const major = chordOnPitchClass(pc, "major").tones.map((t) => pitchClass(t.note));
      const minor = chordOnPitchClass(pc, "minor").tones.map((t) => pitchClass(t.note));
      expect(major).toEqual([pc, (pc + 4) % 12, (pc + 7) % 12]);
      expect(minor).toEqual([pc, (pc + 3) % 12, (pc + 7) % 12]);
    }
  });
});

describe("chord qualities", () => {
  it("puts every quality in exactly one group, in picker order", () => {
    const grouped = CHORD_GROUPS.flatMap((group) => qualitiesInGroup(group.id).map((q) => q.id));
    expect(grouped).toEqual(CHORD_QUALITY_IDS);
    expect(qualitiesInGroup("triads").map((q) => q.symbol)).toEqual([
      "",
      "m",
      "°",
      "+",
      "sus2",
      "sus4",
      "5",
    ]);
  });

  it("gives every quality a unique name and symbol", () => {
    const qualities = CHORD_QUALITY_IDS.map((id) => CHORD_QUALITIES[id]);
    expect(new Set(qualities.map((q) => q.name)).size).toBe(qualities.length);
    expect(new Set(qualities.map((q) => q.symbol)).size).toBe(qualities.length);
  });

  it("starts every chord on the root and gives each role once", () => {
    for (const id of CHORD_QUALITY_IDS) {
      const { tones } = CHORD_QUALITIES[id];
      expect(tones[0]?.role).toBe("root");
      expect(new Set(tones.map((t) => t.role)).size).toBe(tones.length);
      // Tones are stacked from low to high.
      const semitones = tones.map((t) => t.interval.semitones);
      expect(semitones).toEqual([...semitones].sort((a, b) => a - b));
    }
  });

  it("never lets the root, third or an altered fifth be left out", () => {
    for (const id of CHORD_QUALITY_IDS) {
      for (const tone of CHORD_QUALITIES[id].tones) {
        if (tone.optional) expect(["fifth", "ninth", "eleventh"]).toContain(tone.role);
        if (tone.role === "fifth" && tone.interval.semitones !== 7)
          expect(tone.optional).toBe(false);
      }
    }
    for (const id of qualitiesInGroup("triads").map((q) => q.id)) {
      expect(CHORD_QUALITIES[id].tones.some((t) => t.optional)).toBe(false);
    }
    const optional = (id: ChordQualityId) =>
      CHORD_QUALITIES[id].tones.filter((t) => t.optional).map((t) => t.role);
    expect(optional("dominant7")).toEqual(["fifth"]);
    expect(optional("halfDiminished7")).toEqual([]);
    expect(optional("minor13")).toEqual(["fifth", "ninth", "eleventh"]);
  });
});

describe("preferredRootSpelling", () => {
  const spell = (pc: number, q: ChordQualityId) => formatNoteAscii(preferredRootSpelling(pc, q));

  it("uses the key with fewer accidentals", () => {
    expect(spell(1, "major")).toBe("Db");
    expect(spell(1, "minor")).toBe("C#");
    expect(spell(8, "major")).toBe("Ab");
    expect(spell(8, "minor")).toBe("G#");
  });

  it("breaks ties toward F# major and Eb minor", () => {
    expect(spell(6, "major")).toBe("F#");
    expect(spell(3, "minor")).toBe("Eb");
  });

  it("always names white keys naturally", () => {
    for (const pc of [0, 2, 4, 5, 7, 9, 11]) {
      for (const quality of CHORD_QUALITY_IDS) {
        expect(preferredRootSpelling(pc, quality).accidental).toBe(0);
      }
    }
  });

  it("picks the black-key spelling that gives the chord the fewest accidentals", () => {
    // C♯–E–G rather than D♭–F♭–A𝄫.
    expect(spell(1, "diminished")).toBe("C#");
    // A♯–C♯–E rather than B♭–D♭–F♭.
    expect(spell(10, "diminished")).toBe("A#");
    // G♭–B♭–D rather than F♯–A♯–C𝄪.
    expect(spell(6, "augmented")).toBe("Gb");
    // F♯–A♯–C♯–E rather than G♭–B♭–D♭–F♭.
    expect(spell(6, "dominant7")).toBe("F#");
    expect(spell(10, "dominant7")).toBe("Bb");
    expect(spell(3, "diminished7")).toBe("D#");
  });
});

describe("buildChord", () => {
  it("names the chord and its symbol", () => {
    const chord = buildChord(parseNote("Eb"), "minor");
    expect(chord.name).toBe("E♭ minor");
    expect(chord.symbol).toBe("E♭m");
    expect(buildChord(parseNote("C"), "major").symbol).toBe("C");
  });

  it("spells any root strictly, even unusual ones", () => {
    expect(notesOf(buildChord(parseNote("C#"), "major"))).toBe("C# E# G#");
    expect(notesOf(buildChord(parseNote("Db"), "minor"))).toBe("Db Fb Ab");
  });

  it("names seventh and extended chords", () => {
    const bFlat7 = buildChord(parseNote("Bb"), "dominant7");
    expect(bFlat7.name).toBe("B♭ dominant seventh");
    expect(bFlat7.symbol).toBe("B♭7");
    expect(notesOf(bFlat7)).toBe("Bb D F Ab");
    expect(buildChord(parseNote("B"), "diminished").symbol).toBe("B°");
    expect(notesOf(buildChord(parseNote("B"), "diminished"))).toBe("B D F");
    expect(notesOf(buildChord(parseNote("C"), "augmented"))).toBe("C E G#");
    expect(buildChord(parseNote("F#"), "halfDiminished7").symbol).toBe("F♯m7♭5");
    expect(buildChord(parseNote("C"), "sixNine").name).toBe("C six-nine");
  });

  it("spells diminished sevenths with a double flat where the theory needs one", () => {
    expect(notesOf(buildChord(parseNote("C"), "diminished7"))).toBe("C Eb Gb Bbb");
    expect(notesOf(buildChord(parseNote("B"), "diminished7"))).toBe("B D F Ab");
  });

  it("calls the suspended tone a second or a fourth, not a third", () => {
    const labels = (quality: ChordQualityId) =>
      buildChord(parseNote("C"), quality).tones.map(toneLabel);
    expect(notesOf(buildChord(parseNote("C"), "sus2"))).toBe("C D G");
    expect(labels("sus2")).toEqual(["Root", "Major second", "Perfect fifth"]);
    expect(notesOf(buildChord(parseNote("C"), "sus4"))).toBe("C F G");
    expect(labels("sus4")).toEqual(["Root", "Perfect fourth", "Perfect fifth"]);
  });

  it("stacks extensions above the octave", () => {
    const c13 = buildChord(parseNote("C"), "dominant13");
    expect(c13.tones.map((t) => [t.role, formatNoteAscii(t.note), t.interval.semitones])).toEqual([
      ["root", "C", 0],
      ["third", "E", 4],
      ["fifth", "G", 7],
      ["seventh", "Bb", 10],
      ["ninth", "D", 14],
      ["thirteenth", "A", 21],
    ]);
    expect(buildChord(parseNote("E"), "dominant7Sharp9").tones.map(toneLabel)).toEqual([
      "Root",
      "Major third",
      "Perfect fifth",
      "Minor seventh",
      "Augmented ninth",
    ]);
  });

  it("labels each tone with its role and interval", () => {
    const chord = buildChord(parseNote("A"), "minor");
    expect(chord.tones.map((t) => [t.role, t.interval.name])).toEqual([
      ["root", "Perfect unison"],
      ["third", "Minor third"],
      ["fifth", "Perfect fifth"],
    ]);
  });
});

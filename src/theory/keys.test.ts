import { describe, expect, it } from "vitest";
import {
  CIRCLE_OF_FIFTHS,
  type Key,
  type KeyMode,
  borrowedChords,
  circlePosition,
  degreeWheel,
  diatonicBlock,
  diatonicTriads,
  dominantKey,
  fifthsFall,
  formatKey,
  harmonicMinorDominant,
  key,
  keyScale,
  keySignature,
  keysAt,
  parallelKey,
  ringChords,
  relativeKey,
  secondaryDominants,
  secondaryLeadingToneChords,
  subdominantKey,
} from "./keys";
import {
  type Note,
  formatNote,
  formatNoteAscii,
  mod12,
  noteEquals,
  parseNote,
  pitchClass,
} from "./notes";

const k = (tonic: string, mode: KeyMode = "major") => key(parseNote(tonic), mode);
const ascii = (key: Key) => `${formatNoteAscii(key.tonic)} ${key.mode}`;
const signature = (key: Key) => keySignature(key).accidentals.map(formatNoteAscii).join(" ");

describe("circle of fifths", () => {
  // Position 0..11 clockwise from C: every spelling, the usual one first.
  const MAJORS = ["C", "G", "D", "A", "E", "B Cb", "F# Gb", "Db C#", "Ab", "Eb", "Bb", "F"];
  const MINORS = ["A", "E", "B", "F#", "C#", "G# Ab", "D# Eb", "Bb A#", "F", "C", "G", "D"];

  it.each(MAJORS.map((expected, position) => [position, expected]))(
    "position %i has the major keys %s",
    (position, expected) => {
      expect(
        keysAt(position as number, "major")
          .map((x) => formatNoteAscii(x.tonic))
          .join(" "),
      ).toBe(expected);
    },
  );

  it.each(MINORS.map((expected, position) => [position, expected]))(
    "position %i has the minor keys %s",
    (position, expected) => {
      expect(
        keysAt(position as number, "minor")
          .map((x) => formatNoteAscii(x.tonic))
          .join(" "),
      ).toBe(expected);
    },
  );

  it("steps a perfect fifth (7 semitones) between neighbours", () => {
    for (let position = 0; position < 12; position++) {
      const here = CIRCLE_OF_FIFTHS[position]?.[0];
      const next = CIRCLE_OF_FIFTHS[(position + 1) % 12]?.[0];
      expect(here && next && (pitchClass(next) - pitchClass(here) + 12) % 12).toBe(7);
    }
  });

  it("finds the position of any key, major or minor", () => {
    for (let position = 0; position < 12; position++) {
      for (const mode of ["major", "minor"] as const) {
        for (const x of keysAt(position, mode)) {
          expect(circlePosition(x)).toBe(position);
        }
      }
    }
  });
});

describe("keySignature", () => {
  it.each([
    ["C", "none", ""],
    ["G", "sharps", "F#"],
    ["D", "sharps", "F# C#"],
    ["A", "sharps", "F# C# G#"],
    ["E", "sharps", "F# C# G# D#"],
    ["B", "sharps", "F# C# G# D# A#"],
    ["F#", "sharps", "F# C# G# D# A# E#"],
    ["C#", "sharps", "F# C# G# D# A# E# B#"],
    ["F", "flats", "Bb"],
    ["Bb", "flats", "Bb Eb"],
    ["Eb", "flats", "Bb Eb Ab"],
    ["Ab", "flats", "Bb Eb Ab Db"],
    ["Db", "flats", "Bb Eb Ab Db Gb"],
    ["Gb", "flats", "Bb Eb Ab Db Gb Cb"],
    ["Cb", "flats", "Bb Eb Ab Db Gb Cb Fb"],
  ])("%s major has %s: %s", (tonic, kind, expected) => {
    expect(keySignature(k(tonic)).kind).toBe(kind);
    expect(signature(k(tonic))).toBe(expected);
  });

  it("gives a minor key the signature of its relative major", () => {
    for (let position = 0; position < 12; position++) {
      for (const minor of keysAt(position, "minor")) {
        expect(signature(minor)).toBe(signature(relativeKey(minor)));
      }
    }
  });
});

describe("related keys", () => {
  it("finds relative keys", () => {
    expect(ascii(relativeKey(k("C")))).toBe("A minor");
    expect(ascii(relativeKey(k("Eb")))).toBe("C minor");
    expect(ascii(relativeKey(k("F#")))).toBe("D# minor");
    expect(ascii(relativeKey(k("Bb", "minor")))).toBe("Db major");
  });

  it("finds dominant and subdominant keys", () => {
    expect(ascii(dominantKey(k("C")))).toBe("G major");
    expect(ascii(subdominantKey(k("C")))).toBe("F major");
    expect(ascii(dominantKey(k("A", "minor")))).toBe("E minor");
    expect(ascii(subdominantKey(k("A", "minor")))).toBe("D minor");
    expect(ascii(dominantKey(k("F")))).toBe("C major");
    expect(ascii(subdominantKey(k("G")))).toBe("C major");
  });

  it("keeps sharps or flats when the neighbour has two names", () => {
    expect(ascii(dominantKey(k("B")))).toBe("F# major");
    expect(ascii(subdominantKey(k("Db")))).toBe("Gb major");
    expect(ascii(dominantKey(k("F#")))).toBe("C# major");
    expect(ascii(dominantKey(k("G#", "minor")))).toBe("D# minor");
    expect(ascii(subdominantKey(k("Bb", "minor")))).toBe("Eb minor");
  });

  it("finds parallel keys on the circle", () => {
    expect(ascii(parallelKey(k("C")))).toBe("C minor");
    expect(ascii(parallelKey(k("A", "minor")))).toBe("A major");
    expect(ascii(parallelKey(k("C#", "minor")))).toBe("C# major");
    expect(ascii(parallelKey(k("Eb")))).toBe("Eb minor");
    // G# major (with F##) is not on the circle, so its enharmonic twin is used.
    expect(ascii(parallelKey(k("G#", "minor")))).toBe("Ab major");
  });

  it("formats keys", () => {
    expect(formatKey(k("Eb"))).toBe("E♭ major");
    expect(formatKey(k("C#", "minor"))).toBe("C♯ minor");
  });
});

describe("diatonicTriads", () => {
  const symbols = (key: Key) =>
    diatonicTriads(key)
      .map((t) => t.symbol)
      .join(" ");
  const romans = (key: Key) =>
    diatonicTriads(key)
      .map((t) => t.roman)
      .join(" ");

  it("builds the triads of C major and A minor", () => {
    expect(symbols(k("C"))).toBe("C Dm Em F G Am B°");
    expect(romans(k("C"))).toBe("I ii iii IV V vi vii°");
    expect(symbols(k("A", "minor"))).toBe("Am B° C Dm Em F G");
    expect(romans(k("A", "minor"))).toBe("i ii° III iv v VI VII");
  });

  it("spells the triads from the scale", () => {
    expect(symbols(k("F#"))).toBe("F♯ G♯m A♯m B C♯ D♯m E♯°");
    expect(symbols(k("Eb", "minor"))).toBe("E♭m F° G♭ A♭m B♭m C♭ D♭");
    expect(diatonicTriads(k("Eb"))[4]?.notes.map(formatNoteAscii)).toEqual(["Bb", "D", "F"]);
  });

  it("has the same pattern of qualities in every key on the circle", () => {
    const MAJOR = "major minor minor major major minor diminished";
    const MINOR = "minor diminished major minor minor major major";
    for (let position = 0; position < 12; position++) {
      for (const x of keysAt(position, "major")) {
        expect(
          diatonicTriads(x)
            .map((t) => t.quality)
            .join(" "),
        ).toBe(MAJOR);
      }
      for (const x of keysAt(position, "minor")) {
        expect(
          diatonicTriads(x)
            .map((t) => t.quality)
            .join(" "),
        ).toBe(MINOR);
      }
    }
  });

  it("marks tonic, subdominant and dominant", () => {
    expect(diatonicTriads(k("G")).map((t) => t.function ?? "-")).toEqual([
      "tonic",
      "-",
      "-",
      "subdominant",
      "dominant",
      "-",
      "-",
    ]);
  });

  it("uses the key scale as roots", () => {
    expect(diatonicTriads(k("D", "minor")).map((t) => formatNoteAscii(t.notes[0]!))).toEqual(
      keyScale(k("D", "minor")).map(formatNoteAscii),
    );
  });
});

describe("harmonicMinorDominant", () => {
  it("raises the seventh to make a major dominant", () => {
    expect(harmonicMinorDominant(k("A", "minor"))?.symbol).toBe("E");
    expect(
      harmonicMinorDominant(k("G#", "minor"))?.tones.map((t) => formatNoteAscii(t.note)),
    ).toEqual(["D#", "F##", "A#"]);
    expect(harmonicMinorDominant(k("C"))).toBeUndefined();
  });
});

describe("secondaryDominants", () => {
  const show = (x: Key) =>
    secondaryDominants(x).map(
      (d) =>
        `${d.roman} ${d.symbol}→${d.targetSymbol} [${d.foreign.map((n) => formatNote(n)).join(" ")}]`,
    );

  // Written out by hand for keys with plain, flat-heavy, sharp-heavy and minor scales.
  const TABLE: readonly (readonly [string, KeyMode, readonly string[]])[] = [
    [
      "C",
      "major",
      [
        "V7/ii A7→Dm [C♯]",
        "V7/iii B7→Em [D♯ F♯]",
        "V7/IV C7→F [B♭]",
        "V7/V D7→G [F♯]",
        "V7/vi E7→Am [G♯]",
      ],
    ],
    [
      "Db",
      "major",
      [
        "V7/ii B♭7→E♭m [D]",
        "V7/iii C7→Fm [E G]",
        "V7/IV D♭7→G♭ [C♭]",
        "V7/V E♭7→A♭ [G]",
        "V7/vi F7→B♭m [A]",
      ],
    ],
    [
      "F#",
      "major",
      [
        "V7/ii D♯7→G♯m [F𝄪]",
        "V7/iii E♯7→A♯m [G𝄪 B♯]",
        "V7/IV F♯7→B [E]",
        "V7/V G♯7→C♯ [B♯]",
        "V7/vi A♯7→D♯m [C𝄪]",
      ],
    ],
    [
      "A",
      "minor",
      [
        "V7/III G7→C []",
        "V7/iv A7→Dm [C♯]",
        "V7/v B7→Em [D♯ F♯]",
        "V7/VI C7→F [B♭]",
        "V7/VII D7→G [F♯]",
      ],
    ],
    [
      "Eb",
      "minor",
      [
        "V7/III D♭7→G♭ []",
        "V7/iv E♭7→A♭m [G]",
        "V7/v F7→B♭m [A C]",
        "V7/VI G♭7→C♭ [F♭]",
        "V7/VII A♭7→D♭ [C]",
      ],
    ],
  ];

  it.each(TABLE)("%s %s", (tonic, mode, expected) => {
    expect(show(k(tonic, mode))).toEqual(expected);
  });

  it("gives the dominant seventh in the spelling of its notes", () => {
    const d = secondaryDominants(k("C"))[3];
    expect(d?.notes.map((n) => formatNote(n))).toEqual(["D", "F♯", "A", "C"]);
    expect(d?.target).toBe(5);
  });

  // For every key on the circle: the chord on each degree but the tonic and the
  // diminished one is aimed at by a dominant seventh a fifth above it, which in
  // a major key is degrees 6, 7, 1, 2 and 3 of the scale and in a minor key 7, 1, 2, 3 and 4.
  const KEYS = Array.from({ length: 12 }, (_, position) => position).flatMap((position) =>
    (["major", "minor"] as const).flatMap((mode) =>
      keysAt(position, mode).map((x) => [formatKey(x), x] as const),
    ),
  );

  it.each(KEYS)("every secondary dominant of %s is a fifth above its target", (_name, x) => {
    const scale = keyScale(x).map((n) => formatNote(n));
    const rootDegrees = x.mode === "major" ? [5, 6, 0, 1, 2] : [6, 0, 1, 2, 3];
    const roots = rootDegrees.map((i) => scale[i]);
    const result = secondaryDominants(x);
    expect(result).toHaveLength(5);
    expect(result.map((d) => formatNote(d.notes[0] as Note))).toEqual(roots);
    expect(result.map((d) => d.symbol)).toEqual(roots.map((r) => `${r}7`));
    // Each one resolves to a chord the key has, and never to the tonic.
    const triads = new Set(diatonicTriads(x).map((t) => t.symbol));
    for (const d of result) {
      expect(d.target).toBeGreaterThan(1);
      expect(triads.has(d.targetSymbol)).toBe(true);
      expect(d.notes).toHaveLength(4);
      // The chord's third is the leading tone of the target: a semitone below its root.
      const targetRoot = diatonicTriads(x)[d.target - 1]?.notes[0] as Note;
      expect(pitchClass(d.notes[1] as Note)).toBe(mod12(pitchClass(targetRoot) - 1));
    }
  });

  it("only V7/III of a minor key is fully diatonic", () => {
    for (const [, x] of KEYS) {
      const plain = secondaryDominants(x).filter((d) => d.foreign.length === 0);
      expect(plain.map((d) => d.roman)).toEqual(x.mode === "minor" ? ["V7/III"] : []);
    }
  });
});

describe("secondaryLeadingToneChords", () => {
  const show = (x: Key) =>
    secondaryLeadingToneChords(x).map(
      (d) =>
        `${d.roman} ${d.symbol}→${d.targetSymbol} [${d.foreign.map((n) => formatNote(n)).join(" ")}]`,
    );

  // Written out by hand for a plain key, a flat-heavy key and a minor key.
  const TABLE: readonly (readonly [string, KeyMode, readonly string[]])[] = [
    [
      "C",
      "major",
      [
        "vii°7/ii C♯°7→Dm [C♯ B♭]",
        "vii°7/iii D♯°7→Em [D♯ F♯]",
        "vii°7/IV E°7→F [B♭ D♭]",
        "vii°7/V F♯°7→G [F♯ E♭]",
        "vii°7/vi G♯°7→Am [G♯]",
      ],
    ],
    [
      "Db",
      "major",
      [
        "vii°7/ii D°7→E♭m [D C♭]",
        "vii°7/iii E°7→Fm [E G]",
        "vii°7/IV F°7→G♭ [C♭ E𝄫]",
        "vii°7/V G°7→A♭ [G F♭]",
        "vii°7/vi A°7→B♭m [A]",
      ],
    ],
    [
      "A",
      "minor",
      [
        "vii°7/III B°7→C [A♭]",
        "vii°7/iv C♯°7→Dm [C♯ B♭]",
        "vii°7/v D♯°7→Em [D♯ F♯]",
        "vii°7/VI E°7→F [B♭ D♭]",
        "vii°7/VII F♯°7→G [F♯ E♭]",
      ],
    ],
  ];

  it.each(TABLE)("%s %s", (tonic, mode, expected) => {
    expect(show(k(tonic, mode))).toEqual(expected);
  });

  it("gives the diminished seventh in the spelling of its notes", () => {
    const d = secondaryLeadingToneChords(k("C"))[3];
    expect(d?.notes.map((n) => formatNote(n))).toEqual(["F♯", "A", "C", "E♭"]);
    expect(d?.target).toBe(5);
  });

  const KEYS = Array.from({ length: 12 }, (_, position) => position).flatMap((position) =>
    (["major", "minor"] as const).flatMap((mode) =>
      keysAt(position, mode).map((x) => [formatKey(x), x] as const),
    ),
  );

  // For every key on the circle: the chords are aimed at the same five degrees as the
  // secondary dominants, and each root is the leading tone of its target, spelled one
  // letter below the target's root (F♯ for G, never G♭).
  it.each(KEYS)("every secondary leading-tone chord of %s sits under its target", (_name, x) => {
    const result = secondaryLeadingToneChords(x);
    expect(result.map((d) => d.target)).toEqual(secondaryDominants(x).map((d) => d.target));
    expect(result).toHaveLength(5);
    const triads = diatonicTriads(x);
    for (const d of result) {
      const targetRoot = triads[d.target - 1]?.notes[0] as Note;
      expect(triads[d.target - 1]?.symbol).toBe(d.targetSymbol);
      const [root, third, fifth, seventh] = d.notes as [Note, Note, Note, Note];
      expect(d.notes).toHaveLength(4);
      expect(pitchClass(root)).toBe(mod12(pitchClass(targetRoot) - 1));
      expect("CDEFGAB".indexOf(formatNote(root).charAt(0))).toBe(
        ("CDEFGAB".indexOf(formatNote(targetRoot).charAt(0)) + 6) % 7,
      );
      // Stacked minor thirds: a fully diminished seventh.
      expect([third, fifth, seventh].map((n) => mod12(pitchClass(n) - pitchClass(root)))).toEqual([
        3, 6, 9,
      ]);
      expect(d.symbol).toBe(`${formatNote(root)}°7`);
    }
  });

  it("marks exactly the notes outside the scale", () => {
    for (const [, x] of KEYS) {
      const scale = new Set(keyScale(x).map((n) => formatNote(n)));
      for (const d of secondaryLeadingToneChords(x)) {
        expect(d.foreign.map((n) => formatNote(n))).toEqual(
          d.notes.map((n) => formatNote(n)).filter((n) => !scale.has(n)),
        );
        // The chord stacks four minor thirds, which no seven-note scale holds whole.
        expect(d.foreign.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("borrowedChords", () => {
  const symbols = (x: Key) => borrowedChords(x).map((c) => c.symbol);

  // ii°, ♭III, iv, ♭VI and ♭VII from the parallel minor, for every major key on the circle.
  const MAJOR_TABLE: readonly (readonly [string, string])[] = [
    ["C", "D° E♭ Fm A♭ B♭"],
    ["G", "A° B♭ Cm E♭ F"],
    ["D", "E° F Gm B♭ C"],
    ["A", "B° C Dm F G"],
    ["E", "F♯° G Am C D"],
    ["B", "C♯° D Em G A"],
    ["Cb", "D♭° E𝄫 F♭m A𝄫 B𝄫"],
    ["F#", "G♯° A Bm D E"],
    ["Gb", "A♭° B𝄫 C♭m E𝄫 F♭"],
    ["Db", "E♭° F♭ G♭m B𝄫 C♭"],
    ["C#", "D♯° E F♯m A B"],
    ["Ab", "B♭° C♭ D♭m F♭ G♭"],
    ["Eb", "F° G♭ A♭m C♭ D♭"],
    ["Bb", "C° D♭ E♭m G♭ A♭"],
    ["F", "G° A♭ B♭m D♭ E♭"],
  ];

  // I, ii and IV from the parallel major, for every minor key on the circle.
  const MINOR_TABLE: readonly (readonly [string, string])[] = [
    ["A", "A Bm D"],
    ["E", "E F♯m A"],
    ["B", "B C♯m E"],
    ["F#", "F♯ G♯m B"],
    ["C#", "C♯ D♯m F♯"],
    ["G#", "G♯ A♯m C♯"],
    ["Ab", "A♭ B♭m D♭"],
    ["D#", "D♯ E♯m G♯"],
    ["Eb", "E♭ Fm A♭"],
    ["Bb", "B♭ Cm E♭"],
    ["A#", "A♯ B♯m D♯"],
    ["F", "F Gm B♭"],
    ["C", "C Dm F"],
    ["G", "G Am C"],
    ["D", "D Em G"],
  ];

  it("covers every key on the circle", () => {
    expect(MAJOR_TABLE).toHaveLength(CIRCLE_OF_FIFTHS.flat().length);
    expect(MINOR_TABLE).toHaveLength(CIRCLE_OF_FIFTHS.flat().length);
    const circle = CIRCLE_OF_FIFTHS.flat().map(formatNoteAscii).sort();
    expect(MAJOR_TABLE.map(([t]) => t).sort()).toEqual(circle);
    const minors = Array.from({ length: 12 }, (_, p) => keysAt(p, "minor"))
      .flat()
      .map((x) => formatNoteAscii(x.tonic))
      .sort();
    expect(MINOR_TABLE.map(([t]) => t).sort()).toEqual(minors);
  });

  it.each(MAJOR_TABLE)("%s major borrows %s", (tonic, expected) => {
    expect(symbols(k(tonic)).join(" ")).toBe(expected);
  });

  it.each(MINOR_TABLE)("%s minor borrows %s", (tonic, expected) => {
    expect(symbols(k(tonic, "minor")).join(" ")).toBe(expected);
  });

  it("gives C major the chords of C minor: Fm, A♭, B♭ and E♭, plus D°", () => {
    const chords = borrowedChords(k("C"));
    expect(chords.map((c) => c.roman)).toEqual(["ii°", "♭III", "iv", "♭VI", "♭VII"]);
    expect(chords.map((c) => c.quality)).toEqual([
      "diminished",
      "major",
      "minor",
      "major",
      "major",
    ]);
    expect(chords.every((c) => formatKey(c.origin) === "C minor")).toBe(true);
    expect(chords[1]?.notes.map(formatNoteAscii)).toEqual(["Eb", "G", "Bb"]);
  });

  it("gives C minor the C major tonic, ii and IV with the origin C major", () => {
    const chords = borrowedChords(k("C", "minor"));
    expect(chords.map((c) => c.roman)).toEqual(["I", "ii", "IV"]);
    expect(chords.every((c) => formatKey(c.origin) === "C major")).toBe(true);
    expect(chords[0]?.notes.map(formatNoteAscii)).toEqual(["C", "E", "G"]);
  });

  it("spells from the key's own tonic, not from an enharmonic key", () => {
    // D♭ major borrows from D♭ minor (with B𝄫), not from C♯ minor.
    const chords = borrowedChords(k("Db"));
    expect(formatKey(chords[0]?.origin ?? k("C"))).toBe("D♭ minor");
    expect(chords[3]?.notes.map(formatNoteAscii)).toEqual(["Bbb", "Db", "Fb"]);
  });

  it("never repeats a chord the key already has", () => {
    for (const tonic of CIRCLE_OF_FIFTHS.flat()) {
      for (const mode of ["major", "minor"] as const) {
        const own = new Set(diatonicTriads(key(tonic, mode)).map((t) => t.symbol));
        for (const c of borrowedChords(key(tonic, mode))) expect(own.has(c.symbol)).toBe(false);
      }
    }
  });

  it("spells every chord as stacked thirds from its root", () => {
    for (const tonic of CIRCLE_OF_FIFTHS.flat()) {
      for (const mode of ["major", "minor"] as const) {
        for (const c of borrowedChords(key(tonic, mode))) {
          expect(c.notes).toHaveLength(3);
          const letters = c.notes.map((n) => n.letter);
          const root = "CDEFGAB".indexOf(letters[0] ?? "C");
          expect(letters).toEqual([0, 2, 4].map((o) => "CDEFGAB"[(root + o) % 7]));
        }
      }
    }
  });
});

describe("ringChords", () => {
  const symbols = (chords: { symbol: string }[]) =>
    chords.map((c) => c.symbol.replace(/♯/g, "#").replace(/♭/g, "b")).join(" ");
  // Position 0..11: major, relative minor and vii° of the major key.
  const EXPECTED = [
    ["C", "Am", "B°"],
    ["G", "Em", "F#°"],
    ["D", "Bm", "C#°"],
    ["A", "F#m", "G#°"],
    ["E", "C#m", "D#°"],
    ["B Cb", "G#m Abm", "A#° Bb°"],
    ["F# Gb", "D#m Ebm", "E#° F°"],
    ["Db C#", "Bbm A#m", "C° B#°"],
    ["Ab", "Fm", "G°"],
    ["Eb", "Cm", "D°"],
    ["Bb", "Gm", "A°"],
    ["F", "Dm", "E°"],
  ] as const;

  it.each(EXPECTED.map((e, position) => [position, e] as const))(
    "position %i",
    (position, [major, minor, diminished]) => {
      const rings = ringChords(position);
      expect(symbols(rings.major)).toBe(major);
      expect(symbols(rings.minor)).toBe(minor);
      expect(symbols(rings.diminished)).toBe(diminished);
      for (const ring of [rings.major, rings.minor, rings.diminished]) {
        for (const c of ring) expect(c.position).toBe(position);
      }
    },
  );

  it("wraps positions and spells the notes", () => {
    expect(ringChords(12).major[0]?.symbol).toBe("C");
    expect(ringChords(-1).major[0]?.symbol).toBe("F");
    expect(ringChords(1).diminished[0]?.notes.map(formatNoteAscii)).toEqual(["F#", "A", "C"]);
  });
});

describe("diatonicBlock", () => {
  const MAJOR_KEYS = CIRCLE_OF_FIFTHS.flat();
  const place = (tonic: string, mode: KeyMode) =>
    diatonicBlock(k(tonic, mode)).chords.map((c) => `${c.chord.ring}${c.chord.position}`);

  it("has the same shape in all 12 major keys, shifted with the tonic", () => {
    for (const tonic of MAJOR_KEYS) {
      const key_ = key(tonic, "major");
      const c = circlePosition(key_);
      const at = (ring: string, offset: number) => `${ring}${(c + offset + 12) % 12}`;
      expect(place(formatNoteAscii(tonic), "major")).toEqual([
        at("major", 0),
        at("minor", -1),
        at("minor", 1),
        at("major", -1),
        at("major", 1),
        at("minor", 0),
        at("diminished", 0),
      ]);
    }
  });

  it("has the same shape in the relative minor keys", () => {
    for (const tonic of MAJOR_KEYS) {
      const major = key(tonic, "major");
      const minor = relativeKey(major);
      const a = diatonicBlock(major).chords;
      const b = diatonicBlock(minor).chords;
      // Same seven chords on the same positions: I=III, ii=iv, iii=v …
      const byRoot = (cs: typeof a) =>
        cs.map((c) => `${c.chord.symbol}@${c.chord.ring}${c.chord.position}`).sort();
      expect(byRoot(b)).toEqual(byRoot(a));
    }
  });

  it("spells and numbers the C major block", () => {
    const block = diatonicBlock(k("C")).chords;
    expect(block.map((c) => c.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(block.map((c) => c.chord.symbol)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "B°"]);
    expect(block.map((c) => c.function ?? "-")).toEqual([
      "tonic",
      "-",
      "-",
      "subdominant",
      "dominant",
      "-",
      "-",
    ]);
  });

  it("follows the key signature in spelling", () => {
    expect(diatonicBlock(k("G")).chords[6]?.chord.symbol).toBe("F♯°");
    expect(diatonicBlock(k("Db")).chords[6]?.chord.symbol).toBe("C°");
    expect(diatonicBlock(k("Gb")).chords[6]?.chord.symbol).toBe("F°");
  });

  it("puts the minor key centre on the middle ring", () => {
    const block = diatonicBlock(k("A", "minor")).chords;
    expect(block.map((c) => c.chord.symbol)).toEqual(["Am", "B°", "C", "Dm", "Em", "F", "G"]);
    expect(block.map((c) => c.roman)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
    expect(block[0]?.chord).toMatchObject({ ring: "minor", position: 0 });
  });

  it("places harmonic minor V and vii° outside the block", () => {
    expect(diatonicBlock(k("C")).harmonicMinor).toBeUndefined();
    const hm = diatonicBlock(k("A", "minor")).harmonicMinor;
    expect(hm?.dominant).toMatchObject({ symbol: "E", ring: "major", position: 4 });
    expect(hm?.leadingTone).toMatchObject({ symbol: "G♯°", ring: "diminished", position: 3 });
  });

  it("offsets harmonic minor V by +4 and vii° by +3 in every minor key", () => {
    for (const tonic of MAJOR_KEYS) {
      const minor = relativeKey(key(tonic, "major"));
      const c = circlePosition(minor);
      const hm = diatonicBlock(minor).harmonicMinor;
      expect(hm?.dominant.position).toBe((c + 4) % 12);
      expect(hm?.leadingTone.position).toBe((c + 3) % 12);
      expect(hm?.dominant.symbol).toBe(harmonicMinorDominant(minor)?.symbol);
    }
  });
});

describe("degreeWheel", () => {
  const ALL_KEYS: Key[] = CIRCLE_OF_FIFTHS.flat().flatMap((tonic) => {
    const major = key(tonic, "major");
    return [major, relativeKey(major)];
  });
  const romans = (x: Key) =>
    Object.fromEntries(degreeWheel(x).steps.map((s) => [s.offset, s.roman]));

  it("fills seven consecutive positions, IV I V ii vi iii vii° in a major key", () => {
    expect(romans(k("C"))).toEqual({
      "-1": "IV",
      0: "I",
      1: "V",
      2: "ii",
      3: "vi",
      4: "iii",
      5: "vii°",
    });
  });

  it("uses the minor numbering on the same roots in a minor key", () => {
    expect(romans(k("A", "minor"))).toEqual({
      "-1": "VI",
      0: "III",
      1: "VII",
      2: "iv",
      3: "i",
      4: "v",
      5: "ii°",
    });
  });

  it.each(ALL_KEYS.map((x) => [ascii(x), x] as const))(
    "puts every chord of %s on the circle slot of its root",
    (_name, x) => {
      const { position, steps } = degreeWheel(x);
      expect(position).toBe(circlePosition(x));
      expect(steps).toHaveLength(7);
      const triads = diatonicTriads(x);
      steps.forEach((step, i) => {
        expect(step.roman).toBe(triads[i]?.roman);
        expect(step.root).toEqual(triads[i]?.notes[0]);
        // A fifth is seven semitones and 7 × 7 ≡ 1 (mod 12), so this inverts it.
        expect((pitchClass(step.root) * 7) % 12).toBe(step.slot);
        expect((position + step.offset + 12) % 12).toBe(step.slot);
      });
    },
  );

  it("turns the tonic step onto the key's own tonic", () => {
    for (const x of ALL_KEYS) {
      const { steps } = degreeWheel(x);
      const tonic = steps.find((s) => s.degree === 1);
      expect(tonic?.slot).toBe((pitchClass(x.tonic) * 7) % 12);
      // Major: I sits on the key's position. Minor: i sits three positions on.
      expect(tonic?.offset).toBe(x.mode === "major" ? 0 : 3);
    }
  });

  it("has the same offsets in every key of a mode", () => {
    const shape = (x: Key) => degreeWheel(x).steps.map((s) => s.offset);
    for (const x of ALL_KEYS) {
      expect(shape(x)).toEqual(shape(k("C", x.mode)));
    }
  });
});

describe("fifthsFall", () => {
  const ALL_KEYS: Key[] = CIRCLE_OF_FIFTHS.flat().flatMap((tonic) => {
    const major = key(tonic, "major");
    return [major, relativeKey(major)];
  });
  const symbols = (x: Key) => fifthsFall(x).map((s) => s.chord.symbol);
  const romans = (x: Key) => fifthsFall(x).map((s) => s.roman);

  it.each([
    ["C", "major", ["Am", "Dm", "G", "C"]],
    ["G", "major", ["Em", "Am", "D", "G"]],
    ["Bb", "major", ["Gm", "Cm", "F", "B♭"]],
    ["Db", "major", ["B♭m", "E♭m", "A♭", "D♭"]],
    ["F#", "major", ["D♯m", "G♯m", "C♯", "F♯"]],
    ["A", "minor", ["B°", "E", "Am"]],
    ["C#", "minor", ["D♯°", "G♯", "C♯m"]],
    ["Eb", "minor", ["F°", "B♭", "E♭m"]],
  ] as const)("is %s %s: %j", (tonic, mode, expected) => {
    expect(symbols(k(tonic, mode))).toEqual(expected);
  });

  it("is vi ii V I in a major key and ii° V i in a minor key", () => {
    expect(romans(k("C"))).toEqual(["vi", "ii", "V", "I"]);
    expect(romans(k("A", "minor"))).toEqual(["ii°", "V", "i"]);
  });

  it.each(ALL_KEYS.map((x) => [ascii(x), x] as const))(
    "%s: every root is a fifth below the one before and the chain ends on the tonic",
    (_name, x) => {
      const steps = fifthsFall(x);
      steps.slice(1).forEach((step, i) => {
        const before = steps[i];
        // Down a fifth: the earlier root is a fifth above the later one.
        expect(mod12(pitchClass(before?.chord.root ?? x.tonic) - pitchClass(step.chord.root))).toBe(
          7,
        );
        // One step counterclockwise on the circle.
        expect(step.position).toBe(mod12((before?.position ?? 0) - 1));
      });
      const last = steps[steps.length - 1];
      expect(last && noteEquals(last.chord.root, x.tonic)).toBe(true);
      // The tonic's own slot: a minor key sits at its relative major's position, its root a quarter
      // turn further round (A minor is at 0, A at 3).
      expect(last?.position).toBe(mod12(pitchClass(x.tonic) * 7));
      expect(last?.position).toBe(mod12(circlePosition(x) + (x.mode === "minor" ? 3 : 0)));
    },
  );

  it.each(ALL_KEYS.map((x) => [ascii(x), x] as const))(
    "%s: the chords are spelled as the key's triads, V being major in minor",
    (_name, x) => {
      const triads = diatonicTriads(x);
      for (const step of fifthsFall(x)) {
        const triad = triads.find((t) => noteEquals(t.notes[0] ?? x.tonic, step.chord.root));
        expect(triad).toBeDefined();
        if (x.mode === "minor" && step.roman === "V") {
          expect(step.chord.symbol).toBe(harmonicMinorDominant(x)?.symbol);
        } else {
          expect(step.chord.symbol).toBe(triad?.symbol);
          expect(step.roman).toBe(triad?.roman);
        }
      }
    },
  );
});

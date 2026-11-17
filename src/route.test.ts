import { describe, expect, it } from "vitest";
import {
  type ChordRoute,
  type Route,
  defaultChordRoute,
  defaultCircleRoute,
  defaultProgressionRoute,
  formatLegacyChordRoute,
  formatRoute,
  parseRoute,
  parseRouteStrict,
} from "./route";
import {
  CHORD_QUALITY_IDS,
  CIRCLE_OF_FIFTHS,
  type KeyMode,
  PROGRESSIONS,
  PROGRESSION_IDS,
  SCALES,
  type ScaleId,
  type ChordSpec,
  availableQualities,
  chordSymbolFor,
  commonSpellings,
  identifyQuality,
  key,
  keysAt,
  normalizeSpec,
  noteEquals,
  note,
  specOf,
} from "./theory";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

function expectSame(actual: Route, expected: Route) {
  expect(actual.page).toBe(expected.page);
  if (actual.page === "circle" && expected.page === "circle") {
    expect(actual.key.mode).toBe(expected.key.mode);
    expect(noteEquals(actual.key.tonic, expected.key.tonic)).toBe(true);
  } else if (actual.page === "progression" && expected.page === "progression") {
    expect(actual.id).toBe(expected.id);
    expect(noteEquals(actual.tonic, expected.tonic)).toBe(true);
  } else if (
    (actual.page === "chord" || actual.page === "scale") &&
    (expected.page === "chord" || expected.page === "scale")
  ) {
    expect(noteEquals(actual.root, expected.root)).toBe(true);
    expect(actual.instrument).toBe(expected.instrument);
    if (actual.page === "chord" && expected.page === "chord") {
      expect(actual.spec).toEqual(expected.spec);
      expect(actual.inversion).toBe(expected.inversion);
    }
    if (actual.page === "scale" && expected.page === "scale")
      expect(actual.scaleId).toBe(expected.scaleId);
  }
}

describe("formatRoute", () => {
  it("writes chords as #/<root>/<quality>", () => {
    expect(formatRoute({ ...defaultChordRoute(), root: note("D", -1) })).toBe(
      "#/Db/major?on=piano",
    );
    expect(
      formatRoute({ ...defaultChordRoute("guitar"), root: note("C", 1), spec: specOf("minor7") }),
    ).toBe("#/Cs/minor?with=7&on=guitar");
  });

  it("writes the inversion only for the piano", () => {
    expect(formatRoute({ ...defaultChordRoute(), inversion: 2 })).toBe("#/C/major?on=piano&inv=2");
    expect(formatRoute({ ...defaultChordRoute("guitar"), inversion: 2 })).toBe(
      "#/C/major?on=guitar",
    );
  });

  it("writes scales and circle keys", () => {
    expect(
      formatRoute({
        page: "scale",
        root: note("A"),
        scaleId: "naturalMinor",
        instrument: "guitar",
      }),
    ).toBe("#/A/scale/naturalMinor?on=guitar");
    expect(formatRoute({ page: "circle", key: key(note("B", -1), "major") })).toBe(
      "#/circle/Bb/major",
    );
  });
});

describe("parseRoute", () => {
  it("opens the chord a link names", () => {
    expectSame(parseRoute("#/Db/major"), { ...defaultChordRoute(), root: note("D", -1) });
    expectSame(parseRoute("#/F#/minor?on=guitar"), {
      ...defaultChordRoute("guitar"),
      root: note("F", 1),
      spec: specOf("minor"),
    });
  });

  it("uses the remembered instrument when the link does not say", () => {
    expectSame(parseRoute("#/C/major", "guitar"), defaultChordRoute("guitar"));
    expectSame(parseRoute("#/C/major?on=piano", "guitar"), defaultChordRoute("piano"));
  });

  it.each([
    "",
    "#",
    "#/",
    "#/H/major",
    "#/c/major",
    "#/Cx/major",
    "#/C",
    "#/C/nonsense",
    "#/C/toString",
    "#/C/scale",
    "#/C/scale/bebop",
    "#/C/major/extra/parts?on=banjo",
    "#/%E0%A4%A/major",
    "#garbage",
  ])("falls back to C major for %j", (hash) => {
    expectSame(parseRoute(hash), defaultChordRoute());
  });

  it("ignores a bad inversion", () => {
    for (const inv of ["-1", "4", "1.5", "x"]) {
      expect(parseRoute(`#/C/major?inv=${inv}`)).toMatchObject({ inversion: 0 });
    }
  });

  it("links to the chord finder", () => {
    expect(formatRoute({ page: "identify" })).toBe("#/identify");
    expect(parseRoute("#/identify")).toEqual({ page: "identify" });
    expect(parseRouteStrict("#/identify")).toEqual({ page: "identify" });
  });

  it("falls back to C major on the circle for a bad circle link", () => {
    for (const hash of ["#/circle", "#/circle/Cs/foo", "#/circle/Ds/major", "#/circle/H/minor"]) {
      expectSame(parseRoute(hash), defaultCircleRoute());
    }
  });

  it("round-trips every root, quality, scale and circle key", () => {
    const routes: Route[] = [];
    for (const pc of PITCH_CLASSES) {
      for (const root of commonSpellings(pc)) {
        for (const quality of CHORD_QUALITY_IDS) {
          routes.push({
            page: "chord",
            root,
            spec: specOf(quality),
            inversion: 1,
            instrument: "piano",
          });
        }
        for (const scaleId of Object.keys(SCALES) as ScaleId[]) {
          routes.push({ page: "scale", root, scaleId, instrument: "guitar" });
        }
      }
    }
    for (const mode of ["major", "minor"] as KeyMode[]) {
      for (let position = 0; position < CIRCLE_OF_FIFTHS.length; position++) {
        for (const k of keysAt(position, mode)) routes.push({ page: "circle", key: k });
      }
    }
    for (const id of PROGRESSION_IDS) {
      for (let position = 0; position < CIRCLE_OF_FIFTHS.length; position++) {
        for (const k of keysAt(position, PROGRESSIONS[id].mode)) {
          routes.push({ page: "progression", tonic: k.tonic, id });
        }
      }
    }
    expect(routes.length).toBeGreaterThan(600);
    for (const route of routes) expectSame(parseRoute(formatRoute(route)), route);
  });
});

describe("compare links", () => {
  const minorA = { root: note("A"), spec: normalizeSpec({ base: "minor", qualities: [] }) };

  it("write the second chord after the first", () => {
    expect(formatRoute({ ...defaultChordRoute(), vs: minorA })).toBe(
      "#/C/major?on=piano&vs=A-minor",
    );
    expect(
      formatRoute({
        ...defaultChordRoute(),
        vs: { root: note("E", -1), spec: { base: "minor", qualities: ["7", "9"] } },
      }),
    ).toBe("#/C/major?on=piano&vs=Eb-minor&vsw=7,9");
  });

  it("read both chords back, for every root of the second chord", () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const root of commonSpellings(pc)) {
        const route: ChordRoute = {
          ...defaultChordRoute("guitar"),
          root: note("D", -1),
          spec: specOf("minor7"),
          vs: { root, spec: { base: "major", qualities: ["maj7"] } },
        };
        const back = parseRoute(formatRoute(route));
        expect(back).toMatchObject({ page: "chord", spec: route.spec });
        const vs = (back as ChordRoute).vs;
        expect(vs && noteEquals(vs.root, root)).toBe(true);
        expect(vs?.spec).toEqual(route.vs?.spec);
      }
    }
  });

  it("ignore a second chord that makes no sense", () => {
    expect((parseRoute("#/C/major?vs=H-minor") as ChordRoute).vs).toBeUndefined();
    expect((parseRoute("#/C/major?vs=A") as ChordRoute).vs).toBeUndefined();
    expect((parseRoute("#/C/major?vs=A-nonsense") as ChordRoute).vs).toBeUndefined();
    expect(parseRoute("#/C/major?vs=A-minor")).toMatchObject({ vs: minorA });
  });
});

describe("progression links", () => {
  it("writes the key's tonic and the progression", () => {
    expect(formatRoute({ page: "progression", tonic: note("A", -1), id: "pop" })).toBe(
      "#/progression/Ab/pop",
    );
    expect(formatRoute({ page: "progression", tonic: note("F", 1), id: "aeolian" })).toBe(
      "#/progression/Fs/aeolian",
    );
  });

  it("reads them back", () => {
    expect(parseRoute("#/progression/Ab/pop")).toEqual({
      page: "progression",
      tonic: note("A", -1),
      id: "pop",
    });
    expect(parseRoute("#/progression/E/blues")).toMatchObject({ page: "progression", id: "blues" });
  });

  it("falls back to I–V–vi–IV in C for a bad link", () => {
    for (const hash of [
      "#/progression",
      "#/progression/C",
      "#/progression/C/nonsense",
      "#/progression/H/pop",
      "#/progression/Ds/pop",
      "#/progression/Bs/aeolian",
    ]) {
      expect(parseRoute(hash), hash).toEqual(defaultProgressionRoute());
    }
  });

  it("checks the tonic against the progression's mode: D♯ minor is a key, D♯ major is not", () => {
    expect(parseRouteStrict("#/progression/Ds/aeolian")).toMatchObject({ page: "progression" });
    expect(parseRouteStrict("#/progression/Ds/pop")).toBeUndefined();
    expect(parseRouteStrict("#/progression/Bs/aeolian")).toBeUndefined();
    expect(parseRouteStrict("#/progression/Cs/pop")).toMatchObject({ page: "progression" });
  });
});

describe("guitar options", () => {
  it("writes tuning and hand to the link only for the guitar, and only when not default", () => {
    const guitar = { ...defaultChordRoute("guitar"), tuning: "dropD", left: true } as const;
    expect(formatRoute(guitar)).toBe("#/C/major?on=guitar&tuning=dropD&hand=left");
    expect(formatRoute({ ...guitar, tuning: "standard", left: false })).toBe("#/C/major?on=guitar");
    expect(formatRoute({ ...guitar, instrument: "piano" })).toBe("#/C/major?on=piano");
  });

  it("reads them back, ignoring unknown tunings", () => {
    expect(parseRoute("#/D/major?on=guitar&tuning=dadgad&hand=left")).toMatchObject({
      tuning: "dadgad",
      left: true,
    });
    const bad = parseRoute("#/D/scale/major?on=guitar&tuning=banjo");
    expect(bad).not.toHaveProperty("tuning");
    expect(parseRoute("#/D/major?on=piano&tuning=dropD")).not.toHaveProperty("tuning");
  });
});

describe("tone display", () => {
  it("writes the choice to the link, for both instruments and for scales", () => {
    expect(formatRoute({ ...defaultChordRoute(), show: "intervals" })).toBe(
      "#/C/major?on=piano&show=intervals",
    );
    expect(formatRoute({ ...defaultChordRoute("guitar"), tuning: "dropD", show: "steps" })).toBe(
      "#/C/major?on=guitar&tuning=dropD&show=steps",
    );
    expect(
      formatRoute({
        page: "scale",
        root: note("D"),
        scaleId: "dorian",
        instrument: "piano",
        show: "none",
      }),
    ).toBe("#/D/scale/dorian?on=piano&show=none");
  });

  it("leaves old links as they were: no show in the link, none in the route", () => {
    expect(formatRoute(defaultChordRoute())).toBe("#/C/major?on=piano");
    expect(parseRoute("#/C/major?on=piano")).not.toHaveProperty("show");
    expect(parseRoute("#/Db/minor7?on=piano&inv=1")).not.toHaveProperty("show");
    expect(parseRoute("#/A/scale/naturalMinor?on=piano")).not.toHaveProperty("show");
  });

  it("reads every display back and ignores unknown ones", () => {
    for (const show of ["names", "intervals", "steps", "none"] as const) {
      expect(parseRoute(`#/C/major?on=piano&show=${show}`)).toMatchObject({ show });
      expect(parseRoute(`#/G/scale/major?on=guitar&show=${show}`)).toMatchObject({ show });
    }
    expect(parseRoute("#/C/major?on=piano&show=degrees")).not.toHaveProperty("show");
    expect(parseRoute("#/C/major?on=piano&show=")).not.toHaveProperty("show");
  });

  it("round-trips link → route → link, whatever the order of the parameters", () => {
    for (const link of [
      "#/C/major?on=piano&show=intervals",
      "#/Eb/minor?with=7&on=piano&inv=1&show=steps",
      "#/D/major?on=guitar&tuning=dropD&hand=left&show=none",
      "#/F/scale/lydian?on=guitar&show=names",
    ]) {
      expect(formatRoute(parseRoute(link))).toBe(link);
    }
    expect(formatRoute(parseRoute("#/C/major?show=intervals&on=piano"))).toBe(
      "#/C/major?on=piano&show=intervals",
    );
  });

  it("keeps the display for the other instrument", () => {
    const piano = parseRoute("#/C/major?on=piano&show=intervals") as ChordRoute;
    expect(formatRoute({ ...piano, instrument: "guitar" })).toBe(
      "#/C/major?on=guitar&show=intervals",
    );
  });
});

const chordRoute = (spec: ChordSpec, extra: Partial<ChordRoute> = {}): ChordRoute => ({
  ...defaultChordRoute(),
  spec,
  ...extra,
});

describe("chords built from a base chord and qualities", () => {
  it("writes the base chord and the qualities", () => {
    expect(formatRoute(chordRoute({ base: "minor", qualities: ["7", "9"] }))).toBe(
      "#/C/minor?with=7,9&on=piano",
    );
    expect(
      formatRoute(chordRoute({ base: "diminished", qualities: ["7"] }, { inversion: 1 })),
    ).toBe("#/C/diminished?with=7&on=piano&inv=1");
    expect(formatRoute(chordRoute({ base: "sus4", qualities: [] }))).toBe("#/C/sus4?on=piano");
  });

  it("reads them back", () => {
    expect(parseRoute("#/C/minor?with=7,9")).toMatchObject({
      page: "chord",
      spec: { base: "minor", qualities: ["7", "9"] },
    });
    expect(parseRoute("#/Eb/major?with=7,flat5,flat9&on=guitar")).toMatchObject({
      spec: { base: "major", qualities: ["7", "flat5", "flat9"] },
      instrument: "guitar",
    });
  });

  it("normalizes combinations that do not fit and ignores unknown qualities", () => {
    // flat5 on a minor chord would be diminished, 9 needs a seventh.
    expect(parseRoute("#/C/minor?with=flat5,9")).toMatchObject({
      spec: { base: "minor", qualities: [] },
    });
    expect(parseRoute("#/C/power?with=7")).toMatchObject({
      spec: { base: "power", qualities: [] },
    });
    expect(parseRoute("#/C/major?with=7,banana,,13")).toMatchObject({
      spec: { base: "major", qualities: ["7", "13"] },
    });
  });

  it("opens links from before the chord builder as the same chord", () => {
    for (const id of CHORD_QUALITY_IDS) {
      expect(parseRoute(`#/Db/${id}?on=piano`)).toMatchObject({ spec: normalizeSpec(specOf(id)) });
    }
    expect(parseRoute("#/C/dominant7Sharp9")).toMatchObject({
      spec: { base: "major", qualities: ["7", "sharp9"] },
    });
    expect(parseRoute("#/Cs/minor7?on=piano&inv=2")).toMatchObject({
      spec: { base: "minor", qualities: ["7"] },
      inversion: 2,
    });
  });

  it("writes the older link for named chords only", () => {
    expect(formatLegacyChordRoute(chordRoute(specOf("dominant7Sharp9")))).toBe(
      "#/C/dominant7Sharp9?on=piano",
    );
    expect(
      formatLegacyChordRoute(chordRoute({ base: "major", qualities: ["7", "flat5", "flat9"] })),
    ).toBe(undefined);
  });

  it("round-trips link → spec → link for every named chord and a sample of free ones", () => {
    const specs: ChordSpec[] = CHORD_QUALITY_IDS.map(specOf);
    specs.push(
      { base: "major", qualities: ["7", "flat5", "flat9"] },
      { base: "minor", qualities: ["7", "13", "flat9"] },
      { base: "augmented", qualities: ["maj7", "9"] },
      { base: "sus4", qualities: ["7", "13", "flat9"] },
      { base: "diminished", qualities: ["dim7"] },
    );
    for (const spec of specs) {
      const route = chordRoute(spec, { root: note("F", 1), inversion: 2 });
      const hash = formatRoute(route);
      expect(parseRoute(hash)).toEqual({ ...route, spec: normalizeSpec(spec) });
      expect(formatRoute(parseRoute(hash))).toBe(hash);
    }
    expect(identifyQuality({ base: "major", qualities: ["7", "flat5", "flat9"] })).toBeUndefined();
  });

  it("reaches every spec a base chord offers through its link", () => {
    for (const base of [
      "major",
      "minor",
      "diminished",
      "augmented",
      "sus2",
      "sus4",
      "power",
    ] as const) {
      const spec: ChordSpec = { base, qualities: [] };
      for (const quality of availableQualities(spec)) {
        const withOne = normalizeSpec({ base, qualities: [quality] });
        expect(parseRoute(formatRoute(chordRoute(withOne)))).toMatchObject({ spec: withOne });
      }
    }
    expect(chordSymbolFor(note("C"), { base: "minor", qualities: ["7", "9"] })).toBe("Cm9");
  });

  it("parseRouteStrict rejects links that name nothing", () => {
    expect(parseRouteStrict("#/C/nonsense")).toBeUndefined();
    expect(parseRouteStrict("#/H/major")).toBeUndefined();
    expect(parseRouteStrict("#/circle/Ds/major")).toBeUndefined();
    expect(parseRouteStrict("#/C/major")).toMatchObject({ page: "chord" });
  });
});

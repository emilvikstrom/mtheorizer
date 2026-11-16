import { describe, expect, it } from "vitest";
import {
  type ChordRoute,
  type Route,
  defaultChordRoute,
  defaultCircleRoute,
  formatLegacyChordRoute,
  formatRoute,
  parseRoute,
  parseRouteStrict,
} from "./route";
import {
  CHORD_QUALITY_IDS,
  CIRCLE_OF_FIFTHS,
  type KeyMode,
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
    expect(routes.length).toBeGreaterThan(600);
    for (const route of routes) expectSame(parseRoute(formatRoute(route)), route);
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

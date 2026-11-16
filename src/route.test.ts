import { describe, expect, it } from "vitest";
import {
  type Route,
  defaultChordRoute,
  defaultCircleRoute,
  formatRoute,
  parseRoute,
} from "./route";
import {
  CHORD_QUALITY_IDS,
  CIRCLE_OF_FIFTHS,
  type KeyMode,
  SCALES,
  type ScaleId,
  commonSpellings,
  key,
  keysAt,
  noteEquals,
  note,
} from "./theory";

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pc) => pc);

function expectSame(actual: Route, expected: Route) {
  expect(actual.page).toBe(expected.page);
  if (actual.page === "circle" && expected.page === "circle") {
    expect(actual.key.mode).toBe(expected.key.mode);
    expect(noteEquals(actual.key.tonic, expected.key.tonic)).toBe(true);
  } else if (actual.page !== "circle" && expected.page !== "circle") {
    expect(noteEquals(actual.root, expected.root)).toBe(true);
    expect(actual.instrument).toBe(expected.instrument);
    if (actual.page === "chord" && expected.page === "chord") {
      expect(actual.quality).toBe(expected.quality);
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
      formatRoute({ ...defaultChordRoute("guitar"), root: note("C", 1), quality: "minor7" }),
    ).toContain("#/Cs/");
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
      quality: "minor",
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
          routes.push({ page: "chord", root, quality, inversion: 1, instrument: "piano" });
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

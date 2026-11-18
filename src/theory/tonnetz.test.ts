import { describe, expect, it } from "vitest";
import { formatNote, mod12, note, noteEquals, pitchClass, transpose } from "./index";
import { MAJOR_THIRD, PERFECT_FIFTH } from "./intervals";
import {
  type LatticePoint,
  TRANSFORMATIONS,
  type Triad,
  type TriadMode,
  fifthsPosition,
  neighborPoint,
  noteAtFifths,
  noteAtPoint,
  simplestSpelling,
  tonnetzNeighbors,
  transform,
  transformationPath,
  triadEquals,
  triadTones,
  triangleAt,
} from "./tonnetz";

/** The 12 roots as the app spells them, plus the other spelling of the enharmonic ones. */
const ROOTS = [
  note("C"),
  note("C", 1),
  note("D", -1),
  note("D"),
  note("E", -1),
  note("E"),
  note("F"),
  note("F", 1),
  note("G", -1),
  note("G"),
  note("A", -1),
  note("A"),
  note("B", -1),
  note("B"),
];

const MODES: readonly TriadMode[] = ["major", "minor"];
const triads: Triad[] = ROOTS.flatMap((root) => MODES.map((mode) => ({ root, mode })));

const name = (t: Triad) => `${formatNote(t.root)}${t.mode === "minor" ? "m" : ""}`;
const pcs = (t: Triad) => triadTones(t).map(pitchClass);

describe("P, L and R", () => {
  it("give the textbook neighbours of C major and A minor", () => {
    const c: Triad = { root: note("C"), mode: "major" };
    expect(name(transform(c, "P"))).toBe("Cm");
    expect(name(transform(c, "L"))).toBe("Em");
    expect(name(transform(c, "R"))).toBe("Am");
    const a: Triad = { root: note("A"), mode: "minor" };
    expect(name(transform(a, "P"))).toBe("A");
    expect(name(transform(a, "L"))).toBe("F");
    expect(name(transform(a, "R"))).toBe("C");
  });

  it.each(triads.map((t) => [name(t), t] as const))(
    "%s: each transformation is an involution",
    (_, t) => {
      for (const by of TRANSFORMATIONS) {
        const back = transform(transform(t, by), by);
        // Back on the same chord, though perhaps spelled in the simplest way.
        expect(pcs(back)).toEqual(pcs(t));
        expect(back.mode).toBe(t.mode);
      }
    },
  );

  it.each(triads.map((t) => [name(t), t] as const))(
    "%s: each one changes exactly one tone",
    (_, t) => {
      for (const by of TRANSFORMATIONS) {
        const result = transform(t, by);
        expect(result.mode).not.toBe(t.mode);
        const before = new Set(pcs(t));
        const kept = pcs(result).filter((pc) => before.has(pc));
        expect(kept).toHaveLength(2);
      }
    },
  );

  it.each(triads.map((t) => [name(t), t] as const))(
    "%s: moves the right tone by the right distance",
    (_, t) => {
      const [root, third, fifth] = triadTones(t).map(pitchClass) as [number, number, number];
      const major = t.mode === "major";
      const p = triadTones(transform(t, "P")).map(pitchClass);
      // P: the third moves a semitone, the root and fifth stay.
      expect([p[0], p[2]]).toEqual([root, fifth]);
      expect(mod12((p[1] as number) - third)).toBe(major ? 11 : 1);
      // L: the root of a major triad goes down a semitone, the fifth of a minor one goes up.
      const l = new Set(triadTones(transform(t, "L")).map(pitchClass));
      expect(l.has(third) && l.has(major ? fifth : root)).toBe(true);
      expect(l.has(mod12(major ? root - 1 : fifth + 1))).toBe(true);
      // R: the fifth of a major triad goes up a whole tone, the root of a minor one goes down.
      const r = new Set(triadTones(transform(t, "R")).map(pitchClass));
      expect(r.has(third) && r.has(major ? root : fifth)).toBe(true);
      expect(r.has(mod12(major ? fifth + 2 : root - 2))).toBe(true);
    },
  );

  it("gives a neighbour whose spelling is correct for its own mode", () => {
    for (const t of triads) {
      for (const by of TRANSFORMATIONS) {
        const result = transform(t, by);
        const [root, third, fifth] = triadTones(result);
        expect(pitchClass(third)).toBe(mod12(pitchClass(root) + (result.mode === "major" ? 4 : 3)));
        expect(noteEquals(fifth, transpose(root, PERFECT_FIFTH))).toBe(true);
        expect(Math.abs(result.root.accidental)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("covers every one of the 24 triads from C major with P, L and R", () => {
    const seen = new Set<string>();
    let frontier: Triad[] = [{ root: note("C"), mode: "major" }];
    const key = (t: Triad) => `${pitchClass(t.root)}${t.mode}`;
    seen.add(key(frontier[0] as Triad));
    while (frontier.length > 0) {
      const next: Triad[] = [];
      for (const t of frontier) {
        for (const n of Object.values(tonnetzNeighbors(t))) {
          if (!seen.has(key(n))) {
            seen.add(key(n));
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    expect(seen.size).toBe(24);
  });
});

describe("spelling", () => {
  it("writes the neighbours of E♭ minor and A♭ minor the simple way", () => {
    expect(name(transform({ root: note("A", -1), mode: "minor" }, "L"))).toBe("E");
    expect(name(transform({ root: note("E", -1), mode: "minor" }, "L"))).toBe("B");
    expect(name(transform({ root: note("D", 1), mode: "major" }, "L"))).toBe("Gm");
  });

  it("keeps the spelling when two are equally simple", () => {
    expect(simplestSpelling({ root: note("F", 1), mode: "major" })).toEqual({
      root: note("F", 1),
      mode: "major",
    });
    expect(simplestSpelling({ root: note("G", -1), mode: "major" })).toEqual({
      root: note("G", -1),
      mode: "major",
    });
  });

  it("never leaves a double accidental on a root", () => {
    expect(simplestSpelling({ root: note("F", 2), mode: "minor" }).root).toEqual(note("G"));
  });
});

describe("the PLR cycles", () => {
  const c: Triad = { root: note("C"), mode: "major" };

  it("PL makes the hexatonic cycle C, Cm, A♭, G♯m (A♭m), E, Em and back to C", () => {
    const path = transformationPath(c, ["P", "L", "P", "L", "P", "L"]);
    expect(path.map(name)).toEqual(["C", "Cm", "A♭", "G♯m", "E", "Em", "C"]);
  });

  it("PR makes the octatonic cycle through eight triads", () => {
    const path = transformationPath(c, ["P", "R", "P", "R", "P", "R", "P", "R"]);
    expect(path.map(name)).toEqual(["C", "Cm", "E♭", "E♭m", "G♭", "F♯m", "A", "Am", "C"]);
  });

  it("LR goes up the circle of thirds through all 24 triads", () => {
    const path = transformationPath(
      c,
      Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? "L" : "R")),
    );
    expect(triadEquals(path[24] as Triad, c)).toBe(true);
    expect(new Set(path.slice(0, 24).map((t) => `${pitchClass(t.root)}${t.mode}`)).size).toBe(24);
  });
});

describe("the lattice", () => {
  it("numbers notes by their place on the line of fifths", () => {
    expect(
      [note("F"), note("C"), note("G"), note("F", 1), note("B", -1)].map(fifthsPosition),
    ).toEqual([-1, 0, 1, 6, -2]);
    for (let position = -20; position <= 20; position++) {
      expect(fifthsPosition(noteAtFifths(position))).toBe(position);
    }
  });

  it("puts a fifth to the right and a major third up and to the right", () => {
    const origin = note("C");
    expect(noteAtPoint(origin, { i: 1, j: 0 })).toEqual(transpose(origin, PERFECT_FIFTH));
    expect(noteAtPoint(origin, { i: 0, j: 1 })).toEqual(transpose(origin, MAJOR_THIRD));
    expect(noteAtPoint(note("E", -1), { i: 1, j: 1 })).toEqual(note("D"));
  });

  it.each(ROOTS.map((root) => [formatNote(root), root] as const))(
    "%s: a triangle holds the tones of its triad",
    (_, root) => {
      for (const mode of MODES) {
        const here: LatticePoint = { i: 0, j: 0 };
        const spelled = triangleAt(here, mode).map((p) => noteAtPoint(root, p));
        const expected = triadTones({ root, mode });
        expect(new Set(spelled.map(formatNote))).toEqual(new Set(expected.map(formatNote)));
      }
    },
  );

  it.each(ROOTS.map((root) => [formatNote(root), root] as const))(
    "%s: a neighbour shares an edge with the triangle and has the right root",
    (_, root) => {
      for (const mode of MODES) {
        const here: LatticePoint = { i: 0, j: 0 };
        const mine = triangleAt(here, mode);
        for (const by of TRANSFORMATIONS) {
          const there = neighborPoint(here, mode, by);
          const other = triangleAt(there, mode === "major" ? "minor" : "major");
          const shared = mine.filter((p) => other.some((q) => q.i === p.i && q.j === p.j));
          expect(shared).toHaveLength(2);
          // The lattice root is the neighbour's root, apart from the spelling choice.
          const expected = transform({ root, mode }, by);
          expect(pitchClass(noteAtPoint(root, there))).toBe(pitchClass(expected.root));
        }
      }
    },
  );
});

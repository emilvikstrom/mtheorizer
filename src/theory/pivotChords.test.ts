import { describe, expect, it } from "vitest";
import { type Key, circlePosition, diatonicTriads, formatKey, key, keysAt } from "./keys";
import { note, pitchClass } from "./notes";
import { circleDistance, modulationPath, pivotChords } from "./pivotChords";

const C = note("C");
const G = note("G");

const symbols = (from: Key, to: Key) => pivotChords(from, to).map((p) => p.triad.symbol);

describe("pivotChords", () => {
  it("C major and G major share C, Em, G and Am", () => {
    expect(symbols(key(C, "major"), key(G, "major"))).toEqual(["C", "Em", "G", "Am"]);
  });

  it("gives each chord's function in both keys", () => {
    const pivots = pivotChords(key(C, "major"), key(G, "major"));
    expect(pivots.map((p) => `${p.triad.roman}→${p.inTarget.roman}`)).toEqual([
      "I→IV",
      "iii→vi",
      "V→I",
      "vi→ii",
    ]);
  });

  it("relative keys share all seven chords", () => {
    expect(pivotChords(key(C, "major"), key(note("A"), "minor"))).toHaveLength(7);
  });

  it("a key and itself share all seven chords", () => {
    expect(pivotChords(key(C, "major"), key(C, "major"))).toHaveLength(7);
  });

  it("C major and F♯ major share no chord (the tritone)", () => {
    expect(pivotChords(key(C, "major"), key(note("F", 1), "major"))).toHaveLength(0);
  });

  it.each(["major", "minor"] as const)(
    "every neighbour on the circle shares four chords, all 12 %s keys",
    (mode) => {
      for (let position = 0; position < 12; position++) {
        const [from] = keysAt(position, mode);
        const [next] = keysAt(position + 1, mode);
        if (!from || !next) throw new Error("missing key");
        const pivots = pivotChords(from, next);
        expect(pivots, `${formatKey(from)} → ${formatKey(next)}`).toHaveLength(4);
        // Both keys have these chords, so they are diatonic in each.
        const own = diatonicTriads(from).map((t) => t.symbol);
        for (const p of pivots) expect(own).toContain(p.triad.symbol);
      }
    },
  );

  it("is symmetric: the same chords whichever key you start from", () => {
    for (let position = 0; position < 12; position++) {
      const [a] = keysAt(position, "major");
      const [b] = keysAt(position + 1, "major");
      if (!a || !b) throw new Error("missing key");
      // Compared by pitch class: the two keys may spell a chord differently (B♭m / A♯m).
      const chords = (x: Key, y: Key) =>
        pivotChords(x, y)
          .map((p) => `${pitchClass(p.triad.notes[0] ?? C)}${p.triad.quality}`)
          .sort();
      expect(chords(a, b)).toEqual(chords(b, a));
    }
  });

  it("neighbouring minor keys also share four chords", () => {
    expect(symbols(key(note("A"), "minor"), key(note("E"), "minor"))).toEqual([
      "Am",
      "C",
      "Em",
      "G",
    ]);
  });

  it("shares fewer chords the further apart the keys are", () => {
    const from = key(C, "major");
    const counts = [0, 1, 2, 3, 4, 5, 6].map((steps) => {
      const [to] = keysAt(steps, "major");
      return to ? pivotChords(from, to).length : -1;
    });
    expect(counts).toEqual([7, 4, 2, 0, 0, 0, 0]);
  });
});

describe("circleDistance", () => {
  it("counts steps the shorter way round", () => {
    expect(circleDistance(key(C, "major"), key(G, "major"))).toBe(1);
    expect(circleDistance(key(C, "major"), key(note("F"), "major"))).toBe(1);
    expect(circleDistance(key(C, "major"), key(note("D"), "major"))).toBe(2);
    expect(circleDistance(key(C, "major"), key(note("F", 1), "major"))).toBe(6);
    expect(circleDistance(key(C, "major"), key(note("A"), "minor"))).toBe(0);
  });
});

describe("modulationPath", () => {
  it("is empty for the same key", () => {
    expect(modulationPath(key(C, "major"), key(C, "major"))).toEqual([]);
  });

  it("goes one step for a neighbour", () => {
    const path = modulationPath(key(C, "major"), key(G, "major"));
    expect(path.map((s) => `${formatKey(s.from)} → ${formatKey(s.to)}`)).toEqual([
      "C major → G major",
    ]);
  });

  it("takes the shorter way round: C major to B♭ major goes counterclockwise", () => {
    const path = modulationPath(key(C, "major"), key(note("B", -1), "major"));
    expect(path.map((s) => formatKey(s.to))).toEqual(["F major", "B♭ major"]);
  });

  it("ends on the requested key, in its spelling", () => {
    const target = key(note("A", 1), "major");
    const path = modulationPath(key(C, "major"), target);
    expect(path.at(-1)?.to).toEqual(target);
  });

  it("every path is continuous and ends on the target, for all 24 × 24 key pairs", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let a = 0; a < 12; a++) {
        for (const otherMode of ["major", "minor"] as const) {
          for (let b = 0; b < 12; b++) {
            const [from] = keysAt(a, mode);
            const [to] = keysAt(b, otherMode);
            if (!from || !to) throw new Error("missing key");
            const path = modulationPath(from, to);
            if (a === b && mode === otherMode) {
              expect(path).toEqual([]);
              continue;
            }
            expect(path.at(-1)?.to).toEqual(to);
            expect(path[0]?.from).toEqual(from);
            path.forEach((step, i) => {
              if (i > 0) expect(step.from).toEqual(path[i - 1]?.to);
              expect(circleDistance(step.from, step.to)).toBeLessThanOrEqual(1);
              expect(step.pivots.length).toBeGreaterThanOrEqual(4);
            });
            expect(circlePosition(path.at(-1)?.to ?? from)).toBe(b);
          }
        }
      }
    }
  });

  it("names the pivot chords on each step", () => {
    const [first] = modulationPath(key(C, "major"), key(note("D"), "major"));
    expect(first?.pivots.map((p) => p.triad.symbol)).toEqual(["C", "Em", "G", "Am"]);
  });
});

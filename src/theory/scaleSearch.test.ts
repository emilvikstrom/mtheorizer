import { describe, expect, it } from "vitest";
import { formatNote, pitchClass } from "./notes";
import { SCALES, type ScaleId, scaleOnPitchClass } from "./scales";
import { scalesContaining } from "./scaleSearch";

const names = (pcs: number[], limit = 3) =>
  scalesContaining(pcs)
    .slice(0, limit)
    .map((r) => r.scales.map((s) => `${formatNote(s.tonic)} ${s.scale.id}`));

describe("finding scales from notes", () => {
  it("finds nothing for no notes", () => {
    expect(scalesContaining([])).toEqual([]);
  });

  it("puts the scale with exactly those notes first, named from the first note", () => {
    const [best] = scalesContaining([9, 11, 0, 2, 4, 5, 7]);
    expect(best?.extra).toBe(0);
    expect(best?.scales.map((s) => `${formatNote(s.tonic)} ${s.scale.id}`).slice(0, 3)).toEqual([
      "A naturalMinor",
      "C major",
      "D dorian",
    ]);
    // All seven modes of C major are the same pitches, so they are one result.
    expect(best?.scales).toHaveLength(7);
  });

  it("orders by the fewest notes added, then by how common the scale is", () => {
    // C E G: the major pentatonic adds two notes and comes before any seven-note scale.
    const results = scalesContaining([0, 4, 7]);
    expect(results.map((r) => r.extra)).toEqual(
      [...results.map((r) => r.extra)].sort((a, b) => a - b),
    );
    expect(names([0, 4, 7], 1)[0]?.[0]).toBe("C majorPentatonic");
  });

  it("spells each scale as the lookup does", () => {
    const flats = scalesContaining([3, 5, 7, 8, 10, 0, 2])[0]?.scales[0];
    expect(flats && formatNote(flats.tonic)).toBe("E♭");
    expect(flats?.scale.id).toBe("major");
  });

  it.each(Object.keys(SCALES) as ScaleId[])("finds %s on every tonic from its own notes", (id) => {
    for (let pc = 0; pc < 12; pc++) {
      const scale = scaleOnPitchClass(pc, id);
      const pcs = scale.tones.map((t) => pitchClass(t.note));
      const results = scalesContaining(pcs);
      expect(results[0]?.extra, `${id} on ${pc}`).toBe(0);
      const found = results[0]?.scales.some((s) => s.scale.id === id && pitchClass(s.tonic) === pc);
      expect(found, `${id} on ${pc}`).toBe(true);
      // Its own tonic was the first note, so it names the result unless a more common scale
      // on the same tonic has the same notes.
      expect(results[0]?.scales[0] && pitchClass(results[0].scales[0].tonic)).toBe(pc);
    }
  });

  it("finds every scale containing a single note", () => {
    const total = scalesContaining([0]).reduce((n, r) => n + r.scales.length, 0);
    let expected = 0;
    for (const id of Object.keys(SCALES) as ScaleId[]) {
      for (let pc = 0; pc < 12; pc++) {
        if (scaleOnPitchClass(pc, id).tones.some((t) => pitchClass(t.note) === 0)) expected++;
      }
    }
    expect(total).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildExportSvg,
  escapeXml,
  exportFileName,
  inlineComputedStyles,
  tonesText,
  viewBoxSize,
} from "./share";
import { buildChord, chordFromSpec, note, parseNote, specOf, withQuality } from "./theory";

describe("tonesText", () => {
  it.each([
    ["C", "minor", "C–E♭–G"],
    ["E♭", "major", "E♭–G–B♭"],
    ["F♯", "diminished", "F♯–A–C"],
    ["B♭", "dominant7", "B♭–D–F–A♭"],
  ] as const)("%s %s is %s", (root, quality, expected) => {
    const chord = buildChord(parseNote(root), quality);
    expect(tonesText(chord.tones.map((t) => t.note))).toBe(expected);
  });

  it("spells a free combination from its tones", () => {
    const spec = withQuality(withQuality(withQuality(specOf("major"), "7"), "flat5"), "flat9");
    const chord = chordFromSpec(note("C"), spec);
    expect(tonesText(chord.tones.map((t) => t.note))).toBe("C–E–G♭–B♭–D♭");
  });

  it("is empty for no notes", () => {
    expect(tonesText([])).toBe("");
  });
});

describe("exportFileName", () => {
  it.each([
    ["C major", "svg", "c-major.svg"],
    ["E♭ minor seventh", "png", "e-flat-minor-seventh.png"],
    ["F♯ diminished", "svg", "f-sharp-diminished.svg"],
    ["C°7", "svg", "c-dim-7.svg"],
    ["Cø", "svg", "c-halfdim.svg"],
    ["", "svg", "mtheorizer.svg"],
    ["///", "png", "mtheorizer.png"],
  ] as const)("%j as %s is %s", (title, extension, expected) => {
    expect(exportFileName(title, extension)).toBe(expected);
  });
});

describe("escapeXml", () => {
  it("escapes what would break the markup", () => {
    expect(escapeXml(`A & B < C > "D"`)).toBe("A &amp; B &lt; C &gt; &quot;D&quot;");
  });
});

describe("viewBoxSize", () => {
  const svg = (viewBox?: string) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    if (viewBox !== undefined) el.setAttribute("viewBox", viewBox);
    return el;
  };

  it("reads width and height", () => {
    expect(viewBoxSize(svg("0 0 480 160"))).toEqual({ width: 480, height: 160 });
    expect(viewBoxSize(svg("0,0,10,20"))).toEqual({ width: 10, height: 20 });
  });

  it.each([undefined, "", "0 0 10", "0 0 a b", "0 0 0 10"])("rejects %j", (viewBox) => {
    expect(viewBoxSize(svg(viewBox))).toBeUndefined();
  });
});

describe("buildExportSvg", () => {
  const input = {
    title: "E♭ major",
    subtitle: "E♭–G–B♭",
    viewBox: { width: 480, height: 160 },
    inner: '<rect width="10" height="10"/>',
    background: "#ffffff",
    text: "#111111",
    muted: "#666666",
  };

  it("is a standalone svg with title, notes and the diagram", () => {
    const svg = buildExportSvg(input);
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    const root = doc.documentElement;
    expect(root.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(root.getAttribute("width")).toBe("512");
    expect(root.getAttribute("height")).toBe("248");
    expect(root.getAttribute("aria-label")).toBe("E♭ major: E♭–G–B♭");
    expect(root.querySelector("title")?.textContent).toBe("E♭ major");
    const texts = [...root.querySelectorAll(":scope > text")].map((t) => t.textContent);
    expect(texts).toEqual(["E♭ major", "E♭–G–B♭"]);
    expect(root.querySelector(":scope > svg rect")).not.toBeNull();
  });

  it("paints its own background and text colours, so it needs no theme", () => {
    const doc = new DOMParser().parseFromString(buildExportSvg(input), "image/svg+xml");
    expect(doc.querySelector(":scope > rect")?.getAttribute("fill")).toBe("#ffffff");
    expect(doc.querySelector(":scope > text")?.getAttribute("fill")).toBe("#111111");
  });

  it("escapes the title and leaves out an empty subtitle", () => {
    const svg = buildExportSvg({ ...input, title: "A & B", subtitle: "" });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelectorAll(":scope > text")).toHaveLength(1);
    expect(doc.querySelector("title")?.textContent).toBe("A & B");
  });
});

describe("inlineComputedStyles", () => {
  it("copies the stylesheet's styles into the clone, down the tree", () => {
    const style = document.createElement("style");
    style.textContent = `.key { fill: rgb(1, 2, 3); stroke-width: 2px } .label { font-size: 14px }`;
    document.head.append(style);
    const host = document.createElement("div");
    host.innerHTML = `<svg class="outer"><g><rect class="key" tabindex="0"/><text class="label">C</text></g></svg>`;
    document.body.append(host);
    try {
      const source = host.querySelector("svg") as Element;
      const clone = source.cloneNode(true) as Element;
      inlineComputedStyles(clone, source);
      const rect = clone.querySelector("rect");
      expect(rect?.getAttribute("style")).toContain("fill:rgb(1, 2, 3)");
      expect(rect?.getAttribute("style")).toContain("stroke-width:2px");
      expect(rect?.hasAttribute("class")).toBe(false);
      expect(rect?.hasAttribute("tabindex")).toBe(false);
      expect(clone.querySelector("text")?.getAttribute("style")).toContain("font-size:14px");
      // The page's own markup is untouched.
      expect(source.querySelector("rect")?.getAttribute("class")).toBe("key");
    } finally {
      host.remove();
      style.remove();
    }
  });
});

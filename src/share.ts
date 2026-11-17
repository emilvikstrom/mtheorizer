import { type Note, formatNote } from "./theory";

/** The notes as plain text, e.g. "C–E♭–G" (en dashes, spelled as in the app). */
export function tonesText(notes: readonly Note[]): string {
  return notes.map(formatNote).join("–");
}

const SYMBOL_WORDS: Record<string, string> = {
  "♯": "sharp",
  "♭": "flat",
  "𝄪": "doublesharp",
  "𝄫": "doubleflat",
  "°": "dim",
  ø: "halfdim",
  "△": "maj",
};

/** A safe file name for an export, e.g. "E♭ minor seventh" → "e-flat-minor-seventh.svg". */
export function exportFileName(title: string, extension: "svg" | "png"): string {
  const words = [...title]
    .map((ch) => (SYMBOL_WORDS[ch] ? ` ${SYMBOL_WORDS[ch]} ` : ch))
    .join("")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${words || "mtheorizer"}.${extension}`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The computed style properties that make a diagram look the same outside the page's stylesheet. */
const STYLE_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
] as const;

/**
 * Copies the styles that the page's stylesheet gives `source` (and its descendants)
 * onto `clone` as inline `style`, so the markup draws the same without that stylesheet.
 * `clone` must have the same structure as `source`.
 */
export function inlineComputedStyles(
  clone: Element,
  source: Element,
  computed: (el: Element) => CSSStyleDeclaration = (el) => getComputedStyle(el),
): void {
  const style = computed(source);
  const declarations = STYLE_PROPERTIES.flatMap((property) => {
    const value = style.getPropertyValue(property).trim();
    return value ? [`${property}:${value}`] : [];
  });
  if (declarations.length > 0) clone.setAttribute("style", declarations.join(";"));
  clone.removeAttribute("class");
  clone.removeAttribute("tabindex");
  const clonedChildren = Array.from(clone.children);
  Array.from(source.children).forEach((child, i) => {
    const copy = clonedChildren[i];
    if (copy) inlineComputedStyles(copy, child, computed);
  });
}

export interface ExportInput {
  title: string;
  /** A line under the title, e.g. the notes. */
  subtitle: string;
  /** Size of the diagram's own coordinate system. */
  viewBox: { width: number; height: number };
  /** The diagram's children, already serialized with their styles inline. */
  inner: string;
  background: string;
  text: string;
  muted: string;
}

const MARGIN = 16;
const HEADER = 72;

/**
 * A standalone SVG: a background, the title and notes, and the diagram below them.
 * It carries its own colours, so it looks the same whatever theme the page is in.
 */
export function buildExportSvg(input: ExportInput): string {
  const { viewBox, title, subtitle } = input;
  const width = viewBox.width + 2 * MARGIN;
  const height = HEADER + viewBox.height + MARGIN;
  const label = escapeXml(subtitle ? `${title}: ${subtitle}` : title);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">`,
    `<title>${escapeXml(title)}</title>`,
    `<rect width="${width}" height="${height}" fill="${escapeXml(input.background)}"/>`,
    `<text x="${MARGIN}" y="34" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${escapeXml(input.text)}">${escapeXml(title)}</text>`,
    subtitle
      ? `<text x="${MARGIN}" y="58" font-family="system-ui, sans-serif" font-size="16" fill="${escapeXml(input.muted)}">${escapeXml(subtitle)}</text>`
      : "",
    `<svg x="${MARGIN}" y="${HEADER}" width="${viewBox.width}" height="${viewBox.height}" viewBox="0 0 ${viewBox.width} ${viewBox.height}">${input.inner}</svg>`,
    `</svg>`,
  ].join("");
}

/** Width and height from an SVG element's `viewBox`, or undefined if it has none. */
export function viewBoxSize(svg: Element): { width: number; height: number } | undefined {
  const parts = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!parts || parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  const [, , width, height] = parts as [number, number, number, number];
  return width > 0 && height > 0 ? { width, height } : undefined;
}

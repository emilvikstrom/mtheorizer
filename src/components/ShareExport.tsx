import { useRef, useState } from "react";
import {
  buildExportSvg,
  exportFileName,
  inlineComputedStyles,
  tonesText,
  viewBoxSize,
} from "../share";
import type { Note } from "../theory";

interface ShareExportProps {
  /** What is shown, e.g. "C major"; it titles exported images and the shared link. */
  title: string;
  notes: readonly Note[];
}

const DIAGRAM = "svg.piano__svg, svg.fretboard__svg";
const PNG_SCALE = 2;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function pngBlob(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * PNG_SCALE;
      canvas.height = height * PNG_SCALE;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("no canvas"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no png"))), "image/png");
    };
    image.onerror = () => reject(new Error("image failed"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Buttons that share the link, copy the notes as text and save the diagram as an image. */
export function ShareExport({ title, notes }: ShareExportProps) {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const text = tonesText(notes);

  const report = (message: string, isError = false) => {
    setStatus(message);
    setFailed(isError);
  };

  const copy = async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      report(done);
    } catch {
      report("Copying is not available here. Copy it from the address bar instead.", true);
    }
  };

  const shareLink = async () => {
    const url = window.location.href;
    if (canShare) {
      try {
        await navigator.share({ title, text: `${title}: ${text}`, url });
        return;
      } catch (error) {
        // Closing the share sheet is not an error.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(url, "Link copied.");
  };

  /** The diagram on the page with its styles inline, wrapped with the title and notes. */
  const exportSvg = (): { svg: string; width: number; height: number } | undefined => {
    const source = root.current?.parentElement?.querySelector(DIAGRAM);
    if (!source) return undefined;
    const size = viewBoxSize(source);
    if (!size) return undefined;
    const clone = source.cloneNode(true) as Element;
    inlineComputedStyles(clone, source);
    const page = getComputedStyle(document.documentElement);
    const colour = (name: string, fallback: string) =>
      page.getPropertyValue(name).trim() || fallback;
    const svg = buildExportSvg({
      title,
      subtitle: text,
      viewBox: size,
      inner: clone.innerHTML,
      background: colour("--surface", "#ffffff"),
      text: colour("--text", "#1d1b19"),
      muted: colour("--muted", "#6b6560"),
    });
    return { svg, width: size.width + 32, height: size.height + 88 };
  };

  const saveSvg = () => {
    const built = exportSvg();
    if (!built) return report("There is no diagram to save.", true);
    download(new Blob([built.svg], { type: "image/svg+xml" }), exportFileName(title, "svg"));
    report("Image saved as SVG.");
  };

  const savePng = async () => {
    const built = exportSvg();
    if (!built) return report("There is no diagram to save.", true);
    try {
      download(await pngBlob(built.svg, built.width, built.height), exportFileName(title, "png"));
      report("Image saved as PNG.");
    } catch {
      report("Could not make a PNG here. Try saving it as SVG.", true);
    }
  };

  return (
    <div className="share" ref={root}>
      <div className="share__buttons" role="group" aria-label="Share and export">
        <button type="button" className="play__button" onClick={shareLink}>
          {canShare ? "Share link" : "Copy link"}
        </button>
        <button
          type="button"
          className="play__button"
          onClick={() => copy(text, "Notes copied.")}
          aria-label={`Copy notes of ${title} as text`}
        >
          Copy notes
        </button>
        <button type="button" className="play__button" onClick={saveSvg}>
          Save SVG
        </button>
        <button type="button" className="play__button" onClick={savePng}>
          Save PNG
        </button>
      </div>
      <p
        className={`share__status${failed ? " share__status--error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </div>
  );
}

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareExport } from "./ShareExport";
import { note } from "../theory";

const NOTES = [note("C"), note("E", -1), note("G")];

function setNavigator(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

/** The component next to a piano diagram, as in the lookup view. */
function Page() {
  return (
    <div>
      <ShareExport title="C minor" notes={NOTES} />
      <svg className="piano__svg" viewBox="0 0 100 50">
        <rect className="key" width="10" height="10" />
      </svg>
    </div>
  );
}

describe("ShareExport", () => {
  beforeEach(() => {
    setNavigator({ share: undefined, clipboard: undefined });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setNavigator({ share: undefined, clipboard: undefined });
  });

  it("copies the notes as text and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: /copy notes of c minor/i }));
    expect(writeText).toHaveBeenCalledWith("C–E♭–G");
    expect(await screen.findByRole("status")).toHaveTextContent("Notes copied.");
  });

  it("copies the link when the browser cannot share", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByRole("status")).toHaveTextContent("Link copied.");
  });

  it("shares the link with Web Share when the browser has it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    setNavigator({ share, clipboard: { writeText } });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Share link" }));
    expect(share).toHaveBeenCalledWith({
      title: "C minor",
      text: "C minor: C–E♭–G",
      url: window.location.href,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("says nothing when the share sheet is closed", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    setNavigator({ share });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Share link" }));
    expect(share).toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("falls back to copying when sharing fails", async () => {
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, clipboard: { writeText } });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Share link" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("explains calmly when copying is not possible", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: /copy notes/i }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/copying is not available/i);
    expect(status).toHaveClass("share__status--error");
  });

  it("saves the diagram as an SVG with the title and notes", async () => {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:mock";
    });
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Save SVG" }));
    expect(names).toEqual(["c-minor.svg"]);
    expect(await screen.findByRole("status")).toHaveTextContent("Image saved as SVG.");
    const svg = await blobs[0]?.text();
    expect(svg).toContain("<title>C minor</title>");
    expect(svg).toContain("C–E♭–G");
    expect(svg).toContain("<rect");
  });

  it("reports when there is no diagram to save", async () => {
    render(<ShareExport title="C minor" notes={NOTES} />);
    await userEvent.click(screen.getByRole("button", { name: "Save SVG" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("There is no diagram to save."),
    );
  });
});

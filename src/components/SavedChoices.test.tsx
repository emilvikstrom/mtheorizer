import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { FAVORITES_KEY, RECENT_KEY } from "../saved";

const recentList = () => within(screen.getByRole("list", { name: "Recent" }));
const labels = () =>
  recentList()
    .getAllByRole("button", { name: /^Open / })
    .map((b) => b.getAttribute("aria-label"));

describe("recent and favorite choices", () => {
  it("lists the choices made, newest first", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(labels()).toEqual(["Open C (Piano)"]);

    await user.click(screen.getByRole("radio", { name: "D" }));
    await user.click(screen.getByRole("radio", { name: "Minor" }));
    expect(labels()).toEqual(["Open Dm (Piano)", "Open D (Piano)", "Open C (Piano)"]);
  });

  it("restores the whole choice with one click", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("radio", { name: "1st inversion" }));
    await user.click(screen.getByRole("radio", { name: "Guitar" }));
    await user.click(screen.getByRole("radio", { name: "E" }));
    expect(window.location.hash).toBe("#/E/dominant7?on=guitar");

    await user.click(screen.getByRole("button", { name: "Open C7/E (Piano)" }));
    expect(window.location.hash).toBe("#/C/dominant7?on=piano&inv=1");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("C dominant seventh");
    expect(screen.getByRole("radio", { name: "1st inversion" })).toBeChecked();
  });

  it("pins a choice as a favorite and unpins it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Favorite C (Piano)" }));
    expect(screen.getByRole("list", { name: "Favorites" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]")).toEqual([
      "#/C/major?on=piano",
    ]);

    // The favorite stays when the recent list is cleared.
    await user.click(screen.getByRole("button", { name: "Clear recent" }));
    expect(screen.queryByRole("list", { name: "Recent" })).not.toBeInTheDocument();
    const favorites = within(screen.getByRole("list", { name: "Favorites" }));

    await user.click(favorites.getByRole("button", { name: "Favorite C (Piano)" }));
    expect(screen.queryByRole("list", { name: "Favorites" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it("clears favorites", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Favorite C (Piano)" }));
    await user.click(screen.getByRole("button", { name: "Clear favorites" }));
    expect(screen.queryByRole("list", { name: "Favorites" })).not.toBeInTheDocument();
  });

  it("remembers the lists between visits", () => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(["#/Eb/minor7?on=piano"]));
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(["#/A/scale/dorian?on=guitar"]));
    render(<App />);
    expect(screen.getByRole("button", { name: "Open E♭m7 (Piano)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open A Dorian (Guitar)" })).toBeInTheDocument();
  });

  it("works when storage is blocked", async () => {
    const user = userEvent.setup();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      render(<App />);
      await user.click(screen.getByRole("radio", { name: "D" }));
      expect(labels()).toEqual(["Open D (Piano)", "Open C (Piano)"]);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it("is not shown on the circle of fifths", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: "Circle of fifths" }));
    expect(screen.queryByRole("region", { name: "Recent and favorite choices" })).toBeNull();
  });
});

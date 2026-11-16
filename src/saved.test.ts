import { describe, expect, it } from "vitest";
import {
  FAVORITES_KEY,
  MAX_RECENT,
  RECENT_KEY,
  addRecent,
  choiceOf,
  hashOf,
  loadList,
  routeOf,
  saveList,
  toggleFavorite,
} from "./saved";
import { parseRoute } from "./route";

describe("addRecent", () => {
  it("puts the newest first and drops duplicates", () => {
    expect(addRecent(["#/C/major?on=piano", "#/D/minor?on=piano"], "#/D/minor?on=piano")).toEqual([
      "#/D/minor?on=piano",
      "#/C/major?on=piano",
    ]);
  });

  it("keeps at most MAX_RECENT entries", () => {
    let list: string[] = [];
    for (let i = 0; i < MAX_RECENT + 3; i++) list = addRecent(list, `#/C/major?inv=${i}`);
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]).toBe(`#/C/major?inv=${MAX_RECENT + 2}`);
  });
});

describe("toggleFavorite", () => {
  it("adds and removes", () => {
    const once = toggleFavorite([], "#/C/major?on=piano");
    expect(once).toEqual(["#/C/major?on=piano"]);
    expect(toggleFavorite(once, "#/C/major?on=piano")).toEqual([]);
  });
});

describe("choiceOf", () => {
  it("accepts chord and scale links in their canonical form", () => {
    expect(choiceOf("#/Db/major?on=piano")).toBe("#/Db/major?on=piano");
    expect(choiceOf("#/A/scale/dorian?on=guitar&tuning=dropD&hand=left")).toBeDefined();
  });

  it("reads links from before the chord builder and stores them in the current form", () => {
    expect(choiceOf("#/Cs/minor7?on=piano&inv=2")).toBe("#/Cs/minor?with=7&on=piano&inv=2");
    expect(choiceOf("#/C/dominant7Sharp9?on=guitar")).toBe("#/C/major?with=7,sharp9&on=guitar");
    expect(choiceOf("#/C/major?with=7,flat5,flat9&on=piano")).toBe(
      "#/C/major?with=7,flat5,flat9&on=piano",
    );
  });

  it("rejects circle links, broken links and non-canonical ones", () => {
    expect(choiceOf("#/C/major?with=banana&on=piano")).toBeUndefined();
    expect(choiceOf("#/C/minor?with=flat5&on=piano")).toBeUndefined();
    expect(choiceOf("#/circle/C/major")).toBeUndefined();
    expect(choiceOf("#/H/major?on=piano")).toBeUndefined();
    expect(choiceOf("#/C/nonsense?on=piano")).toBeUndefined();
    expect(choiceOf("#/C/major")).toBeUndefined();
    expect(choiceOf("C/major")).toBeUndefined();
  });
});

describe("round trip", () => {
  it("restores the whole choice from its stored link", () => {
    const route = parseRoute("#/Cs/minor?with=7,flat9&on=piano&inv=2");
    if (route.page !== "chord") throw new Error("expected a chord");
    expect(routeOf(hashOf(route))).toEqual(route);
    const guitar = parseRoute("#/E/scale/dorian?on=guitar&tuning=dropD&hand=left");
    if (guitar.page !== "scale") throw new Error("expected a scale");
    expect(routeOf(hashOf(guitar))).toEqual(guitar);
  });
});

describe("storage", () => {
  it("saves and loads a list", () => {
    saveList(RECENT_KEY, ["#/C/major?on=piano", "#/D/minor?on=guitar"]);
    expect(loadList(RECENT_KEY)).toEqual(["#/C/major?on=piano", "#/D/minor?on=guitar"]);
  });

  it("removes the key when the list is emptied", () => {
    saveList(FAVORITES_KEY, ["#/C/major?on=piano"]);
    saveList(FAVORITES_KEY, []);
    expect(window.localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it("loads older saved links in the current form, without duplicates", () => {
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(["#/C/minor7?on=piano", "#/C/minor?with=7&on=piano"]),
    );
    expect(loadList(RECENT_KEY)).toEqual(["#/C/minor?with=7&on=piano"]);
  });

  it("ignores broken data, invalid entries and duplicates", () => {
    window.localStorage.setItem(RECENT_KEY, "{not json");
    expect(loadList(RECENT_KEY)).toEqual([]);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify({ a: 1 }));
    expect(loadList(RECENT_KEY)).toEqual([]);
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(["#/C/major?on=piano", 5, "#/zzz", "#/C/major?on=piano"]),
    );
    expect(loadList(RECENT_KEY)).toEqual(["#/C/major?on=piano"]);
  });

  it("works when storage throws", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(loadList(RECENT_KEY)).toEqual([]);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

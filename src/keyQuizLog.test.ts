import { describe, expect, it, vi } from "vitest";
import { MISS_LOG_KEY, loadMissLog, saveMissLog } from "./keyQuizLog";

describe("the stored log of keys answered wrong", () => {
  it("is empty when nothing is stored", () => {
    expect(loadMissLog()).toEqual([]);
  });

  it("comes back as it was saved", () => {
    saveMissLog(["D♭ major", "A minor"]);
    expect(loadMissLog()).toEqual(["D♭ major", "A minor"]);
  });

  it("removes the entry when the log is emptied", () => {
    saveMissLog(["A minor"]);
    saveMissLog([]);
    expect(window.localStorage.getItem(MISS_LOG_KEY)).toBeNull();
  });

  it.each(["not json", "{}", "42", '["nonsense", 3, null]'])("reads %s as an empty log", (text) => {
    window.localStorage.setItem(MISS_LOG_KEY, text);
    expect(loadMissLog()).toEqual([]);
  });

  it("drops names that are not keys and repeated ones", () => {
    window.localStorage.setItem(MISS_LOG_KEY, JSON.stringify(["A minor", "x", "A minor", 1]));
    expect(loadMissLog()).toEqual(["A minor"]);
  });

  it("copes with storage that is blocked", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadMissLog()).toEqual([]);
    expect(() => saveMissLog(["A minor"])).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

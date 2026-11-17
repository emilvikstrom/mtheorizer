import { describe, expect, it } from "vitest";
import { registerServiceWorker, shouldRegisterServiceWorker } from "./pwa";

describe("shouldRegisterServiceWorker", () => {
  it.each([
    { production: true, hasServiceWorker: true, expected: true },
    { production: false, hasServiceWorker: true, expected: false },
    { production: true, hasServiceWorker: false, expected: false },
    { production: false, hasServiceWorker: false, expected: false },
  ])("production=$production, supported=$hasServiceWorker -> $expected", (row) => {
    expect(shouldRegisterServiceWorker(row)).toBe(row.expected);
  });
});

describe("registerServiceWorker", () => {
  it("does nothing outside a production build (tests run in dev mode)", () => {
    let registered = false;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: () => {
          registered = true;
          return Promise.resolve();
        },
      },
    });
    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    expect(registered).toBe(false);
    Reflect.deleteProperty(navigator, "serviceWorker");
  });
});

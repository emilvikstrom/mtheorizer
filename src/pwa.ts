/** What the registration decision depends on, so tests can pass it in. */
export type PwaEnvironment = {
  /** True in the production build (`import.meta.env.PROD`). */
  readonly production: boolean;
  readonly hasServiceWorker: boolean;
};

/**
 * Only the production build registers the service worker. In the dev server a
 * cached copy of the app would hide every edit.
 */
export function shouldRegisterServiceWorker(env: PwaEnvironment): boolean {
  return env.production && env.hasServiceWorker;
}

/** Registers `sw.js` once the page has loaded. Failure is not fatal: the app works without it. */
export function registerServiceWorker(): void {
  const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  if (!shouldRegisterServiceWorker({ production: import.meta.env.PROD, hasServiceWorker })) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

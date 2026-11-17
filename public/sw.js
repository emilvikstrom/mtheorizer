/*
 * Service worker: lets mtheorizer be installed and opened without a network.
 *
 * - Install: caches the shell (index.html, manifest, icons) and the built
 *   scripts and styles that index.html points at (/assets/<name>-<hash>.js).
 * - Page loads: network first, so a new deploy shows up on the next visit,
 *   with the cached index.html as the offline fallback.
 * - Everything else on the same origin: cache first. Built files have a hash
 *   in their name, so a cached one is never stale.
 *
 * Bump CACHE_VERSION when this file's behaviour changes. Old caches whose name
 * starts with CACHE_PREFIX are deleted on activate.
 * The tests (src/sw.test.ts) run this file against a fake worker scope.
 */
const CACHE_PREFIX = "mtheorizer-";
const CACHE_VERSION = "v1";
const CACHE = CACHE_PREFIX + CACHE_VERSION;
const SHELL = ["./", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

/** The built files index.html loads, found in its markup (Vite writes absolute /assets/ paths). */
function assetsIn(html) {
  const found = new Set();
  const pattern = /(?:src|href)="([^"]*\/assets\/[^"]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const index = await cache.match("./");
  if (index) {
    await cache.addAll(assetsIn(await index.clone().text()));
  }
}

async function dropOldCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
      .map((name) => caches.delete(name)),
  );
  await self.clients.claim();
}

async function pageLoad(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put("./", response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match("./");
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(dropOldCaches());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === "navigate" ? pageLoad(request) : cacheFirst(request));
});

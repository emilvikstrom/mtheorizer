import { describe, expect, it } from "vitest";
import source from "../public/sw.js?raw";
import manifestSource from "../public/manifest.webmanifest?raw";

/** A just-enough stand-in for the worker scope: a cache store, a fetch and event listeners. */
function makeWorker(options: { network: Map<string, string>; offline?: boolean }) {
  const stores = new Map<string, Map<string, string>>();
  const listeners = new Map<string, (event: unknown) => void>();
  const state = { offline: options.offline ?? false, claimed: false, skipped: false };
  const key = (input: unknown) => {
    const url = typeof input === "string" ? input : (input as { url: string }).url;
    return new URL(url, "https://app.test/").pathname;
  };
  const respond = (body: string, ok = true) =>
    ({ ok, clone: () => respond(body, ok), text: async () => body, body }) as unknown as Response;
  const fakeFetch = async (input: unknown) => {
    if (state.offline) throw new TypeError("offline");
    const body = options.network.get(key(input));
    return body === undefined ? respond("not found", false) : respond(body);
  };
  const open = (name: string) => {
    const store = stores.get(name) ?? new Map<string, string>();
    stores.set(name, store);
    return {
      addAll: async (urls: string[]) => {
        for (const url of urls) {
          const response = await fakeFetch(url);
          if (!response.ok) throw new TypeError(`bad response for ${url}`);
          store.set(key(url), await response.text());
        }
      },
      match: async (input: unknown) => {
        const body = store.get(key(input));
        return body === undefined ? undefined : respond(body);
      },
      put: async (input: unknown, response: Response) => {
        store.set(key(input), await response.text());
      },
    };
  };
  const caches = {
    open: async (name: string) => open(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (input: unknown) => {
      for (const name of stores.keys()) {
        const found = await open(name).match(input);
        if (found) return found;
      }
      return undefined;
    },
  };
  const self = {
    location: { origin: "https://app.test" },
    clients: {
      claim: async () => {
        state.claimed = true;
      },
    },
    skipWaiting: async () => {
      state.skipped = true;
    },
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener);
    },
  };
  // The service worker file is a classic script, so it runs as a function body.
  new Function("self", "caches", "fetch", source)(self, caches, fakeFetch);

  const waitFor = async (type: string) => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => (pending = promise) });
    await pending;
  };
  const request = (path: string, mode = "cors", method = "GET", origin = "https://app.test") => ({
    url: `${origin}${path}`,
    method,
    mode,
  });
  /** Dispatches a fetch event; null when the worker lets the browser handle it. */
  const fetchEvent = async (req: ReturnType<typeof request>) => {
    let answer: Promise<Response> | null = null;
    listeners.get("fetch")?.({
      request: req,
      respondWith: (promise: Promise<Response>) => (answer = promise),
    });
    return answer === null ? null : ((await answer) as unknown as { body: string });
  };
  return {
    stores,
    state,
    waitFor,
    request,
    fetchEvent,
    setOffline: (v: boolean) => (state.offline = v),
  };
}

const INDEX = `<html><head>
<script type="module" crossorigin src="/assets/index-abc123.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-def456.css">
</head></html>`;

const network = () =>
  new Map([
    ["/", INDEX],
    ["/manifest.webmanifest", "{}"],
    ["/icon.svg", "<svg/>"],
    ["/icon-192.png", "png192"],
    ["/icon-512.png", "png512"],
    ["/assets/index-abc123.js", "console.log(1)"],
    ["/assets/index-def456.css", "body{}"],
  ]);

describe("service worker", () => {
  it("caches the shell and the built files index.html points at on install", async () => {
    const worker = makeWorker({ network: network() });
    await worker.waitFor("install");
    const cached = [...(worker.stores.get("mtheorizer-v1")?.keys() ?? [])].sort();
    expect(cached).toEqual([
      "/",
      "/assets/index-abc123.js",
      "/assets/index-def456.css",
      "/icon-192.png",
      "/icon-512.png",
      "/icon.svg",
      "/manifest.webmanifest",
    ]);
    expect(worker.state.skipped).toBe(true);
  });

  it("opens the app offline from the cache", async () => {
    const worker = makeWorker({ network: network() });
    await worker.waitFor("install");
    worker.setOffline(true);
    const page = await worker.fetchEvent(worker.request("/", "navigate"));
    expect(page?.body).toBe(INDEX);
    // A link such as /#/C/major is the same page, so it works offline too.
    const script = await worker.fetchEvent(worker.request("/assets/index-abc123.js"));
    expect(script?.body).toBe("console.log(1)");
  });

  it("loads pages from the network first and keeps the newest copy", async () => {
    const net = network();
    const worker = makeWorker({ network: net });
    await worker.waitFor("install");
    net.set("/", "<html>new</html>");
    expect((await worker.fetchEvent(worker.request("/", "navigate")))?.body).toBe(
      "<html>new</html>",
    );
    worker.setOffline(true);
    expect((await worker.fetchEvent(worker.request("/", "navigate")))?.body).toBe(
      "<html>new</html>",
    );
  });

  it("caches other same-origin files the first time they are fetched", async () => {
    const net = network();
    net.set("/assets/late-111.js", "late");
    const worker = makeWorker({ network: net });
    await worker.waitFor("install");
    expect((await worker.fetchEvent(worker.request("/assets/late-111.js")))?.body).toBe("late");
    worker.setOffline(true);
    expect((await worker.fetchEvent(worker.request("/assets/late-111.js")))?.body).toBe("late");
  });

  it("leaves other origins and non-GET requests to the browser", async () => {
    const worker = makeWorker({ network: network() });
    await worker.waitFor("install");
    expect(
      await worker.fetchEvent(worker.request("/x.js", "cors", "GET", "https://cdn.test")),
    ).toBeNull();
    expect(await worker.fetchEvent(worker.request("/", "navigate", "POST"))).toBeNull();
  });

  it("deletes older mtheorizer caches on activate and keeps other sites' caches", async () => {
    const worker = makeWorker({ network: network() });
    worker.stores.set("mtheorizer-v0", new Map());
    worker.stores.set("something-else", new Map());
    await worker.waitFor("install");
    await worker.waitFor("activate");
    expect([...worker.stores.keys()].sort()).toEqual(["mtheorizer-v1", "something-else"]);
    expect(worker.state.claimed).toBe(true);
  });

  it("fails the install when a shell file is missing, so a broken build is never cached", async () => {
    const net = network();
    net.delete("/icon.svg");
    const worker = makeWorker({ network: net });
    await expect(worker.waitFor("install")).rejects.toThrow();
  });
});

describe("web app manifest", () => {
  const manifest = JSON.parse(manifestSource) as {
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };

  it("is installable: standalone, with a 192 and a 512 icon and a maskable one", () => {
    expect(manifest.display).toBe("standalone");
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("only lists icons the service worker caches or that are not needed offline", () => {
    // Every icon the shell caches must be in the manifest, and vice versa for the PNGs.
    for (const icon of manifest.icons.filter((i) => i.purpose !== "maskable")) {
      expect(source).toContain(`"${icon.src}"`);
    }
  });
});

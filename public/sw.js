// ThinkRich service worker (T-009, ADR-0004).
// Scope: an installable app shell with an offline fallback + cache-first static
// assets. Offline WRITES are intentionally out of scope for Phase 1. Push
// handlers are here so the SW is push-ready; the subscription/send side is T-010.

const CACHE = "thinkrich-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: try the network, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: cache-first, then populate the cache.
  if (/\.(?:css|js|png|jpe?g|svg|webp|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
              return response;
            })
            .catch(() => cached),
      ),
    );
  }
});

// Push-ready (T-010 wires the subscription + send side).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "ThinkRich Community";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      data: { link: data.link || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/app";
  event.waitUntil(self.clients.openWindow(link));
});

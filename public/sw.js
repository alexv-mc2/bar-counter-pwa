const CACHE = "rbbc-v2";
const ASSETS = ["/", "/manifest.webmanifest"];
const IS_LOCAL =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "[::1]";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (IS_LOCAL ? Promise.resolve() : caches.open(CACHE).then((cache) => cache.addAll(ASSETS))).then(
      () => self.skipWaiting(),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE || IS_LOCAL).map((key) => caches.delete(key)),
        ),
      )
      .then(() => (IS_LOCAL ? self.registration.unregister() : undefined))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL) return;
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

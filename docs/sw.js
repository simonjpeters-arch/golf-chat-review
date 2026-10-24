/* Cache the app shell so the dashboard works offline after first visit.
   File uploads still need a WhatsApp export each time you UPDATE analysis. */
const CACHE = "golf-skip-pwa-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/parse-whatsapp.js",
  "./js/analysis.js",
  "./js/store.js",
  "./js/charts.js",
  "./js/seed-data.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.ok && req.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || live;
    })
  );
});

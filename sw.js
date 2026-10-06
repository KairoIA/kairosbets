// KairosBets · service worker (oct-2026). Vive en la raíz para controlar toda la app (/kairosbets/).
// - La página (index.html): primero la red y, sin red, la copia guardada → las versiones nuevas llegan solas.
// - assets/ (nombres con huella, nunca cambian) e iconos: primero la copia guardada.
// - Lo de fuera (Google, DeepSeek, la Hoja) no se toca.
const CACHE = "kairosbets-3";   // 3: logo nuevo (06-oct-2026)

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./manifest.json", "./public/icons/icon-192.png"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put("./", copia));
          return r;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (guardada) =>
        guardada ||
        fetch(req).then((r) => {
          if (r.ok && (url.pathname.includes("/assets/") || url.pathname.includes("/icons/"))) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return r;
        })
    )
  );
});

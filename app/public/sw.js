// KairosBets · service worker de https://kairosbets.pages.dev (dirección oficial desde el 06-oct-2026).
// - La página: primero la red y, sin red, la copia guardada → las versiones nuevas llegan solas.
// - manifest.json también por red primero (así Chrome siempre ve el bueno al instalar).
// - assets/ (nombres con huella) e iconos: primero la copia guardada.
// - Lo de fuera (Google, DeepSeek) no se toca.
// La caché lleva el nombre de su carpeta («kb-/-N»), por si algún día conviven dos copias en un mismo sitio.
const VERSION = 7;
const PREFIJO = "kb-" + new URL(self.registration.scope).pathname + "-";
const CACHE = PREFIJO + VERSION;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./manifest.json", "./icons/icon-192.png", "./icons/logo-480.webp"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIJO) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function redPrimero(e, clave) {
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(clave, copia)); }
        return r;
      })
      .catch(() => caches.match(clave))
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (req.mode === "navigate") return redPrimero(e, "./");
  if (url.pathname.endsWith("/manifest.json")) return redPrimero(e, "./manifest.json");
  e.respondWith(
    caches.match(req).then((guardada) =>
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

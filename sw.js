// Service worker de la dirección VIEJA (/kairosbets/). Desde el 06-oct-2026 la app vive en /kb/ y esta dirección solo
// redirige. Si un móvil tiene el de antes, este se da de baja solo y borra sus cachés («kairosbets-…»).
// No toca la caché de /kb/ («kb-…»).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => caches.keys())
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("kairosbets-")).map((k) => caches.delete(k))))
      .then(() => self.clients.matchAll())
      .then((cs) => cs.forEach((c) => c.navigate && c.navigate(c.url)))
  );
});

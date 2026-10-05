// Service worker ANTIGUO (hasta oct-2026). Registrado aquí nunca controló la app (su alcance era /public/).
// Si algún móvil lo tiene, se da de baja solo y borra sus cachés viejas. El nuevo es ../sw.js.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => caches.keys())
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("kairosbets-v")).map((k) => caches.delete(k))))
  );
});

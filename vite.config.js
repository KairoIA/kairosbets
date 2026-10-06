import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El código vive en app/ y `npm run build` deja la app en dist/; se publica en Cloudflare Pages:
//   npx wrangler@latest pages deploy dist --project-name kairosbets --branch main   (clave en variables de usuario)
// Dirección oficial desde el 06-oct-2026: https://kairosbets.pages.dev. Antes estuvo en kairoia.github.io (/kairosbets/
// y luego /kb/), pero en el móvil de Javi Chrome tenía una app rota apuntada para todo ese sitio y no dejaba
// instalarla. Las direcciones viejas redirigen aquí, y kairoia.github.io/kb/traspaso.html pasa los datos.
// app/public/ (manifest, sw.js, icons, _headers) se copia tal cual.
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    assetsInlineLimit: 0,
  },
  server: { port: 5180 },
});

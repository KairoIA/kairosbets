import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El código vive en app/ y `npm run build` deja la app lista en la RAÍZ del repo (index.html + assets/),
// que es lo que sirve GitHub Pages en https://kairoia.github.io/kairosbets/.
// Desde oct-2026 la app ya no se transpila en el navegador (Babel por CDN la dejó en blanco en julio).
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "..",
    emptyOutDir: false,
    assetsDir: "assets",
    assetsInlineLimit: 0,
  },
  server: { port: 5180 },
});

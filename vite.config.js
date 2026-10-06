import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El código vive en app/ y `npm run build` publica la app en ../kairoia.github.io/kb/ (repositorio de la web pública
// de KairosLab): https://kairoia.github.io/kb/ es la dirección oficial desde el 06-oct-2026. La de antes
// (/kairosbets/, este repo) solo redirige: Chrome del móvil de Javi se quedó con el registro de la app vieja y no dejaba
// reinstalarla allí. Mismo sitio = mismos datos guardados. app/public/ (manifest, sw.js, icons) se copia tal cual.
// Desde oct-2026 la app ya no se transpila en el navegador (Babel por CDN la dejó en blanco en julio).
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../../kairoia.github.io/kb",
    emptyOutDir: true,
    assetsDir: "assets",
    assetsInlineLimit: 0,
  },
  server: { port: 5180 },
});

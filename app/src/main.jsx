import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./estilos.css";

createRoot(document.getElementById("root")).render(<App />);

// 07-oct-2026 (Javi): se quitaron la lectura de capturas y la crónica con IA — lo hace todo Kaira (le manda el pantallazo y ella devuelve un enlace).
// Las claves de DeepSeek y Gemini que se pegaron en Ajustes ya no sirven: se borran del móvil.
try { ["kairosbets_deepseek_key", "kairosbets_gemini_key"].forEach((k) => localStorage.removeItem(k)); } catch { /* sin almacenamiento */ }

// La intro se queda ~1,7 s desde que se abrió la app (no desde que cargó), y se desvanece
const splash = document.getElementById("splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("fuera");
    setTimeout(() => splash.remove(), 500);
  }, Math.max(0, 1700 - performance.now()));
}

if ("serviceWorker" in navigator) {
  // Se quitan los service workers de otras carpetas de este mismo sitio: el de /kairosbets/ (la dirección de antes del
  // 06-oct-2026, que ahora solo redirige aquí) y el viejo de /kairosbets/public/. El de esta carpeta es ./sw.js.
  const aqui = new URL("./", location.href).href;
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.scope !== aqui && r.scope.includes("/kairosbets/") && r.unregister()));
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
}

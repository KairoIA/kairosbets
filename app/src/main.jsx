import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./estilos.css";

createRoot(document.getElementById("root")).render(<App />);

const splash = document.getElementById("splash");
if (splash) {
  splash.style.opacity = "0";
  setTimeout(() => splash.remove(), 400);
}

if ("serviceWorker" in navigator) {
  // Se quitan los service workers de otras carpetas de este mismo sitio: el de /kairosbets/ (la dirección de antes del
  // 06-oct-2026, que ahora solo redirige aquí) y el viejo de /kairosbets/public/. El de esta carpeta es ./sw.js.
  const aqui = new URL("./", location.href).href;
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.scope !== aqui && r.scope.includes("/kairosbets/") && r.unregister()));
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
}

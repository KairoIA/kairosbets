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
  // El de antes (public/sw.js) nunca llegó a controlar la app: se quita. El nuevo vive en la raíz.
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.scope.endsWith("/public/") && r.unregister()));
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
}

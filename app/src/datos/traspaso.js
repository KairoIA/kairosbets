// Traer los datos desde la dirección anterior (06-oct-2026).
// KairosBets se mudó de kairoia.github.io a su propia dirección (kairosbets.pages.dev): en el móvil de Javi, Chrome
// tenía una app rota apuntada para todo kairoia.github.io y no dejaba instalarla allí. Los datos del navegador van por
// sitio, así que se quedaron en kairoia.github.io. Con un toque se abre allí traspaso.html, que lee lo guardado
// (temporadas y apuestas) y se lo manda a esta ventana. Solo se acepta lo que llega de ese sitio.
const BASE = () => {
  try { return localStorage.getItem("kairosbets_traspaso_origen") || "https://kairoia.github.io"; } catch { return "https://kairoia.github.io"; }
};

export function traerDeAnterior() {
  return new Promise((ok, mal) => {
    const base = BASE();
    const origen = new URL(base).origin;
    const ventana = window.open(`${base}/kb/traspaso.html?para=${encodeURIComponent(location.origin)}`, "kb_traspaso");
    if (!ventana) return mal(new Error("El navegador no dejó abrir la ventana. Vuelve a pulsar el botón."));
    const alRecibir = (e) => {
      if (e.origin !== origen || e.data?.tipo !== "kairosbets-traspaso") return;
      window.removeEventListener("message", alRecibir);
      clearTimeout(reloj);
      ok(e.data.datos || {});
    };
    window.addEventListener("message", alRecibir);
    const reloj = setTimeout(() => {
      window.removeEventListener("message", alRecibir);
      mal(new Error("No llegaron los datos. Hazlo desde Chrome (no desde la app instalada) y deja que se abra la otra pestaña."));
    }, 45000);
  });
}

// Las claves de IA (DeepSeek, Gemini) ya no se usan: no se traen (07-oct-2026, Javi: lo hace todo Kaira).
const CLAVES_IA = ["kairosbets_deepseek_key", "kairosbets_gemini_key"];

// Guarda lo recibido tal cual (son las mismas claves de siempre: kairosbets_…). Devuelve cuántas temporadas trae.
export function guardarTraspaso(datos) {
  const claves = Object.keys(datos).filter((k) => k.startsWith("kairosbets_") && k !== "kairosbets_traspaso_origen" && !CLAVES_IA.includes(k));
  if (!claves.some((k) => k === "kairosbets_temporadas" || k === "kairosbets_v4" || k === "kairosbets_v3"))
    throw new Error("En la dirección anterior no hay apuestas guardadas.");
  for (const k of claves) localStorage.setItem(k, datos[k]);
  try { return JSON.parse(datos.kairosbets_temporadas || "null")?.lista?.length || 1; } catch { return 1; }
}

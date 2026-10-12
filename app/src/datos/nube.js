import { leerJSON, guardarJSON } from "./util.js";
import { exportar } from "./almacen.js";

// Copia automática en la nube (12-oct-2026, Javi: «mira la app… deberías ser capaz de meterte y verlo»).
// Cada vez que cambian las temporadas o las apuestas, la app sube una copia completa (la misma de «Guardar copia»)
// a /api/copia, que la guarda en Cloudflare (ver functions/api/[[ruta]].js). Sirve para dos cosas: que Claude vea
// la app desde el VDS (cash outs, liquidaciones) y que perder el móvil no sea perder la temporada.
//
// La llave la crea este móvil la primera vez (32 bytes al azar) y solo viaja a /api/copia; el servidor guarda su
// huella. Para que valga, Claude abre antes desde el VDS una «ventana de emparejamiento» de unas horas, y el primer
// móvil que llega la cierra. Así ninguna clave pasa por el chat ni por el código.
const API = "/api/copia";
const LLAVE = "kairosbets_nube_llave";
const ESTADO = "kairosbets_nube_estado";   // { emparejado, ultima, huella, error }

function llave() {
  let k = null;
  try { k = localStorage.getItem(LLAVE); } catch { /* sin almacenamiento: no hay nube */ }
  if (!k) {
    k = [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem(LLAVE, k); } catch { /* idem */ }
  }
  return k;
}

const oyentes = new Set();
export const estadoNube = () => leerJSON(ESTADO, {}) || {};
export function alCambiarNube(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function ponerEstado(cambios) {
  const e = { ...estadoNube(), ...cambios };
  guardarJSON(ESTADO, e);
  oyentes.forEach((f) => { try { f(e); } catch { /* una pantalla cerrada no debe romper la subida */ } });
  return e;
}

// FNV-1a: solo para saber si algo cambió desde la última subida (la copia lleva la hora y siempre cambiaría)
function huella(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

// Solo donde existe /api (kairosbets.pages.dev y sus vistas previas); en el ordenador con Vite no hay nube
const hayNube = () => location.protocol === "https:" && location.hostname.endsWith(".pages.dev");

async function emparejar(k) {
  const r = await fetch(API + "/emparejar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clave: k }) });
  return r.ok;
}

// Con la llave; si el servidor aún no la conoce (401), intenta emparejar una vez y repite
async function conLlave(hacer) {
  const k = llave();
  let r = await hacer(k);
  if (r.status === 401 && (await emparejar(k))) r = await hacer(k);
  return r;
}

let cola = Promise.resolve();   // una subida detrás de otra: una vieja nunca pisa a una nueva

export function subirCopia(temporadas, apuestas, { alSalir = false } = {}) {
  cola = cola.then(() => subir(temporadas, apuestas, alSalir)).catch(() => {});
  return cola;
}

async function subir(temporadas, apuestas, alSalir) {
  if (!hayNube() || !temporadas?.lista?.length) return;   // un móvil vacío nunca sube nada: pisaría la copia buena
  const h = huella(JSON.stringify({ temporadas, apuestas }));
  const e = estadoNube();
  if (e.huella === h && !e.error) return;
  const texto = exportar(temporadas, apuestas);
  try {
    const r = await conLlave((k) => fetch(API, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: "Bearer " + k },
      body: texto,
      keepalive: alSalir && texto.length < 60000,   // si se cierra la app justo después de cambiar algo
    }));
    if (r.status === 401) return ponerEstado({ emparejado: false, error: "sin emparejar" });
    if (!r.ok) return ponerEstado({ error: `la nube respondió ${r.status}` });
    ponerEstado({ emparejado: true, error: null, huella: h, ultima: new Date().toISOString() });
  } catch {
    ponerEstado({ error: "sin conexión" });
  }
}

// Móvil nuevo o datos borrados: trae la última copia de la nube (texto JSON, para importar())
export async function traerDeNube() {
  if (!hayNube()) throw new Error("La nube solo funciona desde kairosbets.pages.dev.");
  let r;
  try {
    r = await conLlave((k) => fetch(API, { headers: { authorization: "Bearer " + k }, cache: "no-store" }));
  } catch {
    throw new Error("Sin conexión. Prueba cuando tengas internet.");
  }
  if (r.status === 401) throw new Error("Este móvil aún no está emparejado con la nube. Pídele a Claude que abra el emparejamiento y vuelve a pulsar.");
  if (r.status === 404) throw new Error("En la nube todavía no hay ninguna copia.");
  if (!r.ok) throw new Error(`La nube respondió ${r.status}. Prueba en un rato.`);
  ponerEstado({ emparejado: true, error: null });
  return r.text();
}

// «hace 3 min», para Ajustes
export function haceCuanto(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

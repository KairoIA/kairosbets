import { leerJSON, guardarJSON, hoy } from "./util.js";

// Lo que guarda la app en el móvil (desde oct-2026, con temporadas):
//   kairosbets_temporadas        { activa: id, lista: [{ id, nombre, inicio, fin, bankrollInicial, stake, archivada }] }
//   kairosbets_apuestas_<id>     las apuestas de esa temporada
// La clave de antes (kairosbets_v4, una sola lista) NO se borra nunca: queda como copia de seguridad.
const TEMPORADAS = "kairosbets_temporadas";
const APUESTAS = (id) => "kairosbets_apuestas_" + id;
const VIEJAS = ["kairosbets_v4", "kairosbets_v3"];

const CAMPOS = ["id", "date", "type", "desc", "odds", "stake", "result", "pl", "notes"];

export function limpiar(b) {
  const o = {};
  for (const c of CAMPOS) o[c] = b[c] ?? (c === "pl" ? null : c === "notes" || c === "desc" ? "" : b[c]);
  o.odds = Number(o.odds) || 0;
  o.stake = Number(o.stake) || 0;
  o.pl = o.pl === "" || o.pl == null || isNaN(Number(o.pl)) ? null : Number(o.pl);
  o.result = o.result || "pending";
  o.type = o.type || "Combinada";
  return o;
}

export function cargar() {
  let temporadas = leerJSON(TEMPORADAS);
  if (!temporadas) temporadas = migrar();
  const apuestas = {};
  for (const t of temporadas?.lista || []) apuestas[t.id] = (leerJSON(APUESTAS(t.id), []) || []).map(limpiar);
  return { temporadas, apuestas };
}

// Primera vez con la versión nueva: lo que había pasa a ser la temporada 1 (sigue activa hasta que
// Javi la cierre desde Ajustes). Si no había nada, devuelve null y la app enseña «Empieza tu temporada».
function migrar() {
  let viejas = null;
  for (const k of VIEJAS) {
    const v = leerJSON(k);
    if (Array.isArray(v) && v.length) { viejas = v; break; }
  }
  if (!viejas) return null;
  const bets = viejas.map(limpiar);
  const fechas = bets.map((b) => b.date).filter(Boolean).sort();
  const t = { id: "t1", nombre: "Temporada 1", inicio: fechas[0] || hoy(), fin: null, bankrollInicial: 15, stake: 15, archivada: false };
  const temporadas = { activa: "t1", lista: [t] };
  guardarJSON(APUESTAS("t1"), bets);
  guardarJSON(TEMPORADAS, temporadas);
  return temporadas;
}

export const guardarTemporadas = (t) => guardarJSON(TEMPORADAS, t);
export const guardarApuestas = (id, bets) => guardarJSON(APUESTAS(id), bets.map(limpiar));

export function siguienteId(temporadas) {
  const n = Math.max(0, ...(temporadas?.lista || []).map((t) => parseInt(String(t.id).replace(/\D/g, ""), 10) || 0));
  return "t" + (n + 1);
}

// Copia completa para guardar fuera del móvil (botón «Exportar copia»)
export function exportar(temporadas, apuestas) {
  return JSON.stringify({ app: "KairosBets", version: 2, fecha: new Date().toISOString(), temporadas, apuestas }, null, 2);
}

// Paquete de apuestas que prepara Claude en el VDS: { app: "KairosBets", tipo: "paquete", fecha, apuestas: [...] }.
// NO sustituye nada: se FUSIONA en la temporada activa por id (ids estables, p. ej. "vA20261010"). Una apuesta nueva se añade;
// una que ya está y sigue «en juego» se actualiza (así llega su resultado); una ya liquidada en el móvil no se toca nunca.
export function fusionarPaquete(d) {
  const temporadas = leerJSON(TEMPORADAS);
  const id = temporadas?.activa;
  if (!id) throw new Error("No hay temporada activa donde añadir las apuestas");
  const mapa = new Map((leerJSON(APUESTAS(id), []) || []).map(limpiar).map((b) => [b.id, b]));
  let nuevas = 0, actualizadas = 0, intactas = 0;
  for (const crudo of d.apuestas || []) {
    if (!crudo?.id) continue;
    const b = limpiar(crudo);
    const ya = mapa.get(b.id);
    if (!ya) { mapa.set(b.id, b); nuevas++; }
    else if (ya.result === "pending" && JSON.stringify(ya) !== JSON.stringify(b)) { mapa.set(b.id, { ...ya, ...b }); actualizadas++; }
    else intactas++;
  }
  guardarApuestas(id, [...mapa.values()]);
  const r = cargar();
  r.mensaje = `Paquete añadido a «${temporadas.lista.find((t) => t.id === id)?.nombre || id}»: ${nuevas} nuevas, ${actualizadas} actualizadas${intactas ? `, ${intactas} ya estaban` : ""}.`;
  return r;
}

export function importar(texto) {
  const d = JSON.parse(texto);
  if (d?.app === "KairosBets" && d.tipo === "paquete" && Array.isArray(d.apuestas)) return fusionarPaquete(d);
  if (!d || d.app !== "KairosBets" || !d.temporadas?.lista) throw new Error("Este archivo no es una copia de KairosBets");
  for (const t of d.temporadas.lista) guardarApuestas(t.id, d.apuestas?.[t.id] || []);
  guardarTemporadas(d.temporadas);
  return cargar();
}

// Paquete que llega por enlace, no por archivo (07-oct-2026, Javi: Kaira interpreta una captura de
// apuesta y manda un enlace que abre KairosBets ya con los datos listos para fusionar). Va en el
// fragmento de la URL (#paquete=<base64>), no en la query: el fragmento nunca llega al servidor que
// sirve la página (es estática en Cloudflare Pages), así que la apuesta no pasa por ningún log.
export function leerPaqueteDeURL() {
  const m = location.hash.match(/paquete=([^&]+)/);
  if (!m) return null;
  try {
    const texto = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const d = JSON.parse(texto);
    if (d?.app === "KairosBets" && d.tipo === "paquete" && Array.isArray(d.apuestas)) return d;
  } catch { /* enlace roto o manipulado: se ignora, no se intenta adivinar */ }
  return null;
}

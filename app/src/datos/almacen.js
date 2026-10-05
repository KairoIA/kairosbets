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

export function importar(texto) {
  const d = JSON.parse(texto);
  if (!d || d.app !== "KairosBets" || !d.temporadas?.lista) throw new Error("Este archivo no es una copia de KairosBets");
  for (const t of d.temporadas.lista) guardarApuestas(t.id, d.apuestas?.[t.id] || []);
  guardarTemporadas(d.temporadas);
  return cargar();
}

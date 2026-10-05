import { leerJSON, guardarJSON } from "./util.js";
import { conBankroll } from "./calculos.js";

// Copia en la Hoja de Google (programa de hoja/Codigo.gs publicado como aplicación web).
// La dirección NO va en el código (la web es pública): se pega en Ajustes o llega con el enlace
// de configuración …/kairosbets/#hoja=<dirección>, y se guarda solo en el móvil.
// Antes la app daba la copia por buena aunque fallara (la Hoja vieja daba 404 y salía «Sync»).
// Ahora cada envío se comprueba y, si falla, la temporada queda pendiente y se reintenta.
const URL_HOJA = "kairosbets_hoja_url";
const PENDIENTES = "kairosbets_hoja_pendientes";

export const urlHoja = () => (leerJSON(URL_HOJA, "") || "").trim();
export function ponerUrlHoja(u) {
  guardarJSON(URL_HOJA, (u || "").trim());
}
export const pendientes = () => leerJSON(PENDIENTES, []) || [];
const ponerPendientes = (l) => guardarJSON(PENDIENTES, [...new Set(l)]);
export const marcarPendiente = (id) => ponerPendientes([...pendientes(), id]);

export function urlValida(u) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test((u || "").trim());
}

async function pedir(cuerpo, ms = 25000) {
  const url = urlHoja();
  if (!url) throw new Error("Sin Hoja configurada");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = cuerpo
      ? await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(cuerpo), signal: ctl.signal })
      : await fetch(url + "?action=ping", { signal: ctl.signal });
    if (!r.ok) throw new Error("La Hoja respondió " + r.status);
    let j;
    try { j = await r.json(); } catch { throw new Error("La Hoja no contestó bien (¿está publicada para «Cualquier usuario»?)"); }
    if (!j.ok) throw new Error(j.error || "La Hoja dio un error");
    return j;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("La Hoja tardó demasiado");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export const probar = () => pedir(null);

// Sube una temporada entera (la Hoja la reescribe: lo que hay en el móvil manda)
export async function subirTemporada(t, bets) {
  const filas = conBankroll(bets, t.bankrollInicial).map((b) => ({ ...b, bankroll: b.bankroll }));
  return pedir({ action: "syncSeason", season: t, bets: filas });
}

// Sube todo lo pendiente. Devuelve { ok, error }
export async function subirPendientes(temporadas, apuestas) {
  const lista = pendientes();
  if (!urlHoja()) return { ok: false, error: "sin-hoja" };
  if (!lista.length) return { ok: true };
  let error = null;
  for (const id of lista) {
    const t = temporadas.lista.find((x) => x.id === id);
    if (!t) { ponerPendientes(pendientes().filter((x) => x !== id)); continue; }
    try {
      await subirTemporada(t, apuestas[id] || []);
      ponerPendientes(pendientes().filter((x) => x !== id));
    } catch (e) {
      error = e.message;
    }
  }
  return { ok: !error, error };
}

// Recuperar desde la Hoja (móvil nuevo o datos borrados)
export async function bajarTodo() {
  const { seasons } = await pedir({ action: "getSeasons" });
  const apuestas = {};
  for (const s of seasons || []) {
    const { bets } = await pedir({ action: "getBets", seasonId: s.id });
    apuestas[s.id] = bets || [];
  }
  return { seasons: seasons || [], apuestas };
}

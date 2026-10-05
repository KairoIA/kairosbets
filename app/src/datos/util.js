// Fechas y formatos. La fecha de «hoy» es la del móvil (antes salía en UTC: de 00:00 a 02:00 ponía el día anterior).

export function hoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const fechaCorta = (f) =>
  f ? new Date(f + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—";

export const fechaLarga = (f) =>
  f ? new Date(f + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const euros = (n) => (n == null || isNaN(n) ? "—" : n.toFixed(2) + " €");
export const signo = (n) => (n == null || isNaN(n) ? "—" : (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + " €");
export const pct = (n, dec = 0) => (n == null || !isFinite(n) ? "—" : (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(dec) + "%");

export const nuevoId = () => "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const redondear = (n) => Math.round(n * 100) / 100;

// localStorage puede fallar (modo privado, cuota llena): nunca debe tirar la app
export function leerJSON(clave, defecto = null) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : defecto;
  } catch {
    return defecto;
  }
}

export function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

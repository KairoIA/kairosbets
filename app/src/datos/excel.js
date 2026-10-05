// Exportar a Excel (.xlsx) sin librerías: el archivo se fabrica en el propio móvil.
// Un .xlsx es un .zip con unos XML dentro; aquí va sin comprimir (más que de sobra para unos cientos de apuestas).
// Pestañas: «Resumen» (una fila por temporada) y una por temporada con todas sus apuestas.
// Las cifras van como números de verdad (se pueden sumar y filtrar) y las fechas como fechas.
import { conBankroll, resumen } from "./calculos.js";

const RESULTADO = { win: "Ganada", loss: "Perdida", cashout: "Cash out", pending: "En juego" };

// ── Celdas ──────────────────────────────────────────────────────────────────
// Estilos (ver ESTILOS): 0 normal · 1 cabecera · 2 fecha · 3 número 0.00 · 4 porcentaje 0.0%
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const col = (i) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const serial = (f) => { const [y, m, d] = String(f || "").split("-").map(Number); return y ? (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5 : null; };

function celda(v, ref, estilo = 0) {
  if (v == null || v === "" || (typeof v === "number" && !isFinite(v))) return estilo === 1 ? `<c r="${ref}" s="1"/>` : "";
  if (typeof v === "number") return `<c r="${ref}" s="${estilo}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${estilo}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

// filas: [[{v, s}|valor, …], …]; la primera es la cabecera
function hoja(filas, anchos) {
  const xml = filas.map((fila, r) => `<row r="${r + 1}">${fila.map((c, i) => {
    const { v, s } = c !== null && typeof c === "object" ? c : { v: c, s: r === 0 ? 1 : 0 };
    return celda(v, col(i) + (r + 1), r === 0 ? 1 : s);
  }).join("")}</row>`).join("");
  const ultima = col(filas[0].length - 1) + Math.max(filas.length, 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${xml}</sheetData>${filas.length > 1 ? `<autoFilter ref="A1:${ultima}"/>` : ""}</worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFB21A"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B0B0C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

// ── El libro ─────────────────────────────────────────────────────────────────
function nombresDePestana(nombres) {
  const usados = new Set(["resumen"]);
  return nombres.map((n) => {
    let base = String(n).replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 28) || "Temporada";
    let nombre = base, k = 2;
    while (usados.has(nombre.toLowerCase())) nombre = `${base.slice(0, 26)} ${k++}`;
    usados.add(nombre.toLowerCase());
    return nombre;
  });
}

export function libroExcel(temporadas, apuestas) {
  const lista = temporadas.lista;
  const pestanas = nombresDePestana(lista.map((t) => t.nombre));
  const n = (x) => ({ v: x == null ? null : Math.round(x * 100) / 100, s: 3 });
  const f = (x) => ({ v: serial(x), s: 2 });

  const filasResumen = [["Temporada", "Inicio", "Fin", "Bankroll inicial", "Apuestas", "Ganadas", "Perdidas", "Cash out", "En juego", "Apostado", "Neto", "ROI", "Bankroll final", "Estado"]];
  const hojas = lista.map((t, i) => {
    const bets = conBankroll(apuestas[t.id] || [], t.bankrollInicial);
    const r = resumen(apuestas[t.id] || [], t.bankrollInicial);
    filasResumen.push([t.nombre, f(t.inicio), f(t.fin), n(t.bankrollInicial), r.total, r.ganadas, r.perdidas, r.cashouts, r.enJuego,
      n(r.apostado), n(r.neto), { v: r.roi == null ? null : r.roi / 100, s: 4 }, n(r.bankroll), t.id === temporadas.activa ? "En curso" : "Archivada"]);
    const filas = [["Fecha", "Tipo", "Apuesta", "Cuota", "Stake", "Resultado", "P&L", "Bankroll", "Notas"]];
    for (const b of bets) filas.push([f(b.date), b.type, b.desc, n(b.odds), n(b.stake), RESULTADO[b.result] || b.result, n(b.pl), n(b.bankroll), b.notes || ""]);
    return { nombre: pestanas[i], xml: hoja(filas, [11, 11, 60, 8, 8, 11, 10, 11, 40]) };
  });
  const todas = [{ nombre: "Resumen", xml: hoja(filasResumen, [24, 11, 11, 15, 10, 9, 9, 9, 9, 11, 11, 9, 14, 11]) }, ...hojas];

  const archivos = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${todas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${todas.map((h, i) => `<sheet name="${esc(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${todas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${todas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": ESTILOS,
  };
  todas.forEach((h, i) => (archivos[`xl/worksheets/sheet${i + 1}.xml`] = h.xml));
  return zip(archivos);
}

// ── Zip sin comprimir ───────────────────────────────────────────────────────
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(archivos) {
  const enc = new TextEncoder();
  const partes = [], central = [];
  let desplazamiento = 0;
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const dia = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
  for (const [nombre, texto] of Object.entries(archivos)) {
    const nb = enc.encode(nombre), datos = enc.encode(texto), crc = crc32(datos);
    const cab = new DataView(new ArrayBuffer(30));
    cab.setUint32(0, 0x04034b50, true); cab.setUint16(4, 20, true); cab.setUint16(6, 0x0800, true); cab.setUint16(8, 0, true);
    cab.setUint16(10, hora, true); cab.setUint16(12, dia, true); cab.setUint32(14, crc, true);
    cab.setUint32(18, datos.length, true); cab.setUint32(22, datos.length, true); cab.setUint16(26, nb.length, true); cab.setUint16(28, 0, true);
    partes.push(new Uint8Array(cab.buffer), nb, datos);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true); cen.setUint16(14, dia, true); cen.setUint32(16, crc, true); cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nb.length, true); cen.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cen.buffer), nb);
    desplazamiento += 30 + nb.length + datos.length;
  }
  const tamCentral = central.reduce((a, p) => a + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  const n = Object.keys(archivos).length;
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, n, true); fin.setUint16(10, n, true);
  fin.setUint32(12, tamCentral, true); fin.setUint32(16, desplazamiento, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * KairosBets · copia en Hoja de Google (v4, oct-2026)
 *
 * Va pegado en la Hoja (Extensiones → Apps Script) y publicado como «Aplicación web»
 * (ejecutar como: yo · acceso: cualquier usuario). La app le manda cada temporada ENTERA
 * y aquí se reescribe su pestaña: lo que hay en el móvil manda.
 *
 *   Pestaña «Temporadas»: una fila por temporada (bankroll inicial, apuestas, P&L, bankroll final…)
 *   Una pestaña por temporada con todas sus apuestas.
 *
 * Contesta siempre {ok:true,…} o {ok:false,error}: la app comprueba la respuesta y, si falla,
 * vuelve a intentarlo (la versión de antes no miraba nada y dejó de copiar sin avisar).
 */
var INDICE = 'Temporadas';
var CAB_INDICE = ['id', 'Temporada', 'Pestaña', 'Inicio', 'Fin', 'Bankroll inicial €', 'Stake €', 'Archivada',
                  'Apuestas', 'P&L €', 'Bankroll final €', 'Actualizada'];
var CABECERA = ['Fecha', 'Tipo', 'Apuesta', 'Cuota', 'Stake €', 'Resultado', 'P&L €', 'Bankroll €', 'Notas', 'id'];
var TEXTO = { win: 'Ganada', loss: 'Perdida', cashout: 'Cash out', pending: 'En juego' };
var FONDO = '#111525', FONDO_CAB = '#1e2338', TINTA = '#d8dce8', ORO = '#e8c96a', VERDE = '#5cb85c', ROJO = '#d9534f';

function doGet(e) {
  var accion = (e && e.parameter && e.parameter.action) || 'ping';
  if (accion === 'ping') return salida({ ok: true, app: 'KairosBets', version: 4 });
  return salida({ ok: false, error: 'Acción desconocida: ' + accion });
}

function doPost(e) {
  var d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return salida({ ok: false, error: 'Mensaje mal formado' });
  }
  var cerrojo = LockService.getScriptLock();
  try {
    cerrojo.waitLock(20000);
    if (d.action === 'syncSeason') return salida(guardarTemporada(d.season, d.bets || []));
    if (d.action === 'getSeasons') return salida({ ok: true, seasons: leerTemporadas() });
    if (d.action === 'getBets') return salida({ ok: true, bets: leerApuestas(d.seasonId) });
    return salida({ ok: false, error: 'Acción desconocida: ' + d.action });
  } catch (err) {
    return salida({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { cerrojo.releaseLock(); } catch (x) {}
  }
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ── Temporadas ───────────────────────────────────────────────────────────────
function hojaIndice(ss) {
  var h = ss.getSheetByName(INDICE);
  if (!h) {
    h = ss.insertSheet(INDICE, 0);
    h.getRange(1, 1, 1, CAB_INDICE.length).setValues([CAB_INDICE]);
    estiloCabecera(h, CAB_INDICE.length);
    h.setColumnWidth(2, 180);
  }
  return h;
}

function filasIndice(h) {
  var n = h.getLastRow();
  return n < 2 ? [] : h.getRange(2, 1, n - 1, CAB_INDICE.length).getValues();
}

function nombrePestana(ss, temporada, filas) {
  var base = String(temporada.nombre || temporada.id).replace(/[\[\]\*\?:\/\\]/g, ' ').trim().slice(0, 90) || temporada.id;
  if (base === INDICE) base = base + ' ' + temporada.id;
  // otra temporada con el mismo nombre de pestaña → se le añade su id
  for (var i = 0; i < filas.length; i++) {
    if (filas[i][2] === base && String(filas[i][0]) !== String(temporada.id)) return base + ' (' + temporada.id + ')';
  }
  return base;
}

function guardarTemporada(t, bets) {
  if (!t || !t.id) throw new Error('Falta la temporada');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var idx = hojaIndice(ss);
  var filas = filasIndice(idx);
  var fila = -1;
  for (var i = 0; i < filas.length; i++) if (String(filas[i][0]) === String(t.id)) fila = i + 2;
  var pestana = nombrePestana(ss, t, filas);

  // si cambió el nombre de la temporada, se renombra su pestaña
  if (fila > 0) {
    var antes = idx.getRange(fila, 3).getValue();
    if (antes && antes !== pestana && ss.getSheetByName(antes) && !ss.getSheetByName(pestana)) ss.getSheetByName(antes).setName(pestana);
  }
  var h = ss.getSheetByName(pestana) || ss.insertSheet(pestana);
  escribirApuestas(ss, h, bets);

  var neto = 0, finales = null;
  bets.forEach(function (b) { if (b.result !== 'pending' && b.pl != null && b.pl !== '') neto += Number(b.pl); });
  for (var j = bets.length - 1; j >= 0; j--) if (bets[j].bankroll != null && bets[j].bankroll !== '') { finales = Number(bets[j].bankroll); break; }
  var datos = [t.id, t.nombre || '', pestana, aFecha(t.inicio), aFecha(t.fin), Number(t.bankrollInicial) || 0, Number(t.stake) || 0,
               t.archivada ? 'Sí' : 'No', bets.length, Math.round(neto * 100) / 100,
               finales == null ? Number(t.bankrollInicial) || 0 : finales, new Date()];
  if (fila < 0) fila = idx.getLastRow() + 1;
  idx.getRange(fila, 1, 1, datos.length).setValues([datos]);
  idx.getRange(fila, 4, 1, 2).setNumberFormat('dd/mm/yyyy');
  idx.getRange(fila, 6, 1, 2).setNumberFormat('0.00');
  idx.getRange(fila, 10, 1, 2).setNumberFormat('0.00');
  idx.getRange(fila, 12).setNumberFormat('dd/mm/yyyy hh:mm');
  idx.getRange(fila, 1, 1, datos.length).setBackground(FONDO).setFontColor(TINTA);
  idx.getRange(fila, 10).setFontColor(neto >= 0 ? VERDE : ROJO);
  quitarHojaVacia(ss);
  return { ok: true, n: bets.length, pestana: pestana };
}

function escribirApuestas(ss, h, bets) {
  h.clear();
  h.getRange(1, 1, 1, CABECERA.length).setValues([CABECERA]);
  estiloCabecera(h, CABECERA.length);
  if (bets.length) {
    var valores = bets.map(function (b) {
      return [aFecha(b.date), b.type || '', b.desc || '', Number(b.odds) || 0, Number(b.stake) || 0, TEXTO[b.result] || b.result,
              b.pl == null || b.pl === '' ? '' : Number(b.pl), b.bankroll == null || b.bankroll === '' ? '' : Number(b.bankroll),
              b.notes || '', b.id];
    });
    var r = h.getRange(2, 1, valores.length, CABECERA.length);
    r.setValues(valores).setBackground(FONDO).setFontColor(TINTA).setVerticalAlignment('middle');
    h.getRange(2, 1, valores.length, 1).setNumberFormat('dd/mm/yyyy');
    h.getRange(2, 4, valores.length, 2).setNumberFormat('0.00');
    h.getRange(2, 7, valores.length, 2).setNumberFormat('0.00');
    h.getRange(2, 3, valores.length, 1).setWrap(true);
    var colores = bets.map(function (b) {
      var c = b.result === 'pending' ? '#4a9fd4' : (b.pl != null && Number(b.pl) > 0 ? VERDE : b.pl != null && Number(b.pl) < 0 ? ROJO : ORO);
      return [c, c];
    });
    h.getRange(2, 6, valores.length, 2).setFontColors(colores);
  }
  h.setFrozenRows(1);
  h.setColumnWidth(1, 90); h.setColumnWidth(3, 380); h.setColumnWidth(9, 220); h.setColumnWidth(10, 90);
  h.setTabColor(ORO);
}

function estiloCabecera(h, n) {
  h.getRange(1, 1, 1, n).setBackground(FONDO_CAB).setFontColor(ORO).setFontWeight('bold');
  h.setFrozenRows(1);
}

function quitarHojaVacia(ss) {
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    var h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });
}

// ── Lectura (recuperar en un móvil nuevo) ───────────────────────────────────
function leerTemporadas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return filasIndice(hojaIndice(ss)).filter(function (f) { return f[0] !== ''; }).map(function (f) {
    return { id: String(f[0]), nombre: f[1], inicio: deFecha(f[3]), fin: deFecha(f[4]) || null, bankrollInicial: Number(f[5]) || 0,
             stake: Number(f[6]) || 0, archivada: f[7] === 'Sí' };
  });
}

function leerApuestas(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = filasIndice(hojaIndice(ss)).filter(function (x) { return String(x[0]) === String(id); })[0];
  if (!f) return [];
  var h = ss.getSheetByName(f[2]);
  if (!h || h.getLastRow() < 2) return [];
  var inverso = {};
  Object.keys(TEXTO).forEach(function (k) { inverso[TEXTO[k]] = k; });
  return h.getRange(2, 1, h.getLastRow() - 1, CABECERA.length).getValues().map(function (r) {
    return { id: String(r[9]), date: deFecha(r[0]), type: r[1], desc: r[2], odds: Number(r[3]) || 0, stake: Number(r[4]) || 0,
             result: inverso[r[5]] || r[5] || 'pending', pl: r[6] === '' ? null : Number(r[6]), notes: r[8] || '' };
  });
}

// ── Fechas: en la app van como «2026-10-05» ──────────────────────────────────
function aFecha(s) {
  if (!s) return '';
  var p = String(s).split('-');
  return p.length === 3 ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12) : '';
}

function deFecha(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(v);
}

import { redondear } from "./util.js";

// Resultado de una apuesta para pintarla. El cash out «~» (casi lo apostado) va según SU stake;
// antes daba por hecho que todas eran de 15 €.
export function estado(b) {
  const r = b.result, pl = b.pl;
  if (r === "win") return { clave: "win", texto: "Ganada", icono: "✓" };
  if (r === "loss") return { clave: "loss", texto: "Perdida", icono: "✗" };
  if (r === "pending") return { clave: "pending", texto: "En juego", icono: "○" };
  if (r === "cashout") {
    if (pl == null) return { clave: "cashout", texto: "Cash out", icono: "◈" };
    const margen = Math.max(0.5, (b.stake || 0) * 0.13);
    if (Math.abs(pl) <= margen) return { clave: "cashout-igual", texto: "Cash out ≈", icono: "◈" };
    if (pl < 0) return { clave: "cashout-menos", texto: "Cash out −", icono: "◈" };
    return { clave: "cashout-mas", texto: "Cash out +", icono: "◈" };
  }
  return { clave: "otro", texto: r, icono: "·" };
}

export const liquidada = (b) => b.result !== "pending";
const positiva = (b) => b.result === "win" || (b.result === "cashout" && b.pl != null && b.pl > 0);
const negativa = (b) => b.result === "loss" || (b.result === "cashout" && b.pl != null && b.pl <= 0);

// Orden de la temporada: por fecha y, el mismo día, por orden de alta (sort estable)
export const ordenar = (bets) => [...bets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// Dinero de Javi que entra o sale de la cuenta durante la temporada (12-oct-2026). temporada.movimientos =
// [{ id, fecha, tipo: "ingreso" | "retirada", importe, nota }]: los que apunta él. NO son ni ganancia ni pérdida.
// RECARGAS AUTOMÁTICAS (Javi, 13-nov-2026: «el bankroll debería ser el dinero disponible… contando con los 15 € de
// stake que se ponen nuevos si estamos under the water»): si al echar una apuesta no queda dinero libre para su
// stake, la app cuenta que Javi mete ese stake de su bolsillo. Si metió otra cantidad, la apunta él a mano y la
// automática ya no sale (solo salta cuando no llega). Se calculan siempre: si se corrige una apuesta, se recalculan.
// Cómo se cuenta: por fechas; cada día entra primero el dinero que apuntó él, luego se echan las apuestas de ese día
// (sale su stake) y luego vuelven las liquidadas (stake + beneficio). Las que siguen en juego tienen el stake fuera.
export function cuenta(bets, inicial, movimientos = []) {
  const movs = [...(movimientos || [])].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const orden = ordenar(bets);
  let caja = inicial || 0, neto = 0, i = 0;
  const recargas = [], porId = {};
  const hasta = (fecha) => {
    for (; i < movs.length && (fecha == null || movs[i].fecha <= fecha); i++) caja = redondear(caja + (movs[i].tipo === "retirada" ? -1 : 1) * (Number(movs[i].importe) || 0));
  };
  for (let k = 0; k < orden.length; ) {
    const fecha = orden[k].date;
    const dia = [];
    while (k < orden.length && orden[k].date === fecha) dia.push(orden[k++]);
    hasta(fecha);
    for (const b of dia) {
      const stake = Number(b.stake) || 0;
      if (stake > 0 && caja < stake - 0.005) {
        const importe = redondear(caja < 0 ? stake - caja : stake);
        recargas.push({ id: "auto-" + b.id, fecha, tipo: "ingreso", importe, auto: true, nota: b.desc });
        caja = redondear(caja + importe);
      }
      caja = redondear(caja - stake);
    }
    for (const b of dia) {
      if (!liquidada(b)) { porId[b.id] = { bankroll: null, neto: null }; continue; }
      const pl = b.pl == null ? 0 : b.pl;
      caja = redondear(caja + (Number(b.stake) || 0) + pl);
      neto = redondear(neto + pl);
      porId[b.id] = { bankroll: b.pl == null ? null : caja, neto: b.pl == null ? null : neto };
    }
  }
  hasta(null);
  return { caja, recargas, porId };
}

export function dinero(inicial, movimientos = [], recargas = []) {
  const todos = [...(movimientos || []), ...recargas];
  const suma = (tipo, auto) => redondear(todos.filter((m) => m.tipo === tipo && (auto == null || !!m.auto === auto)).reduce((a, m) => a + (Number(m.importe) || 0), 0));
  const ingresos = suma("ingreso"), retirado = suma("retirada");
  return { ingresos, recargado: suma("ingreso", true), retirado, puesto: redondear((inicial || 0) + ingresos) };
}

// Cada apuesta con lo que deja detrás: «bankroll» = dinero en la cuenta del método justo después de liquidarla (con
// lo metido, recargado y retirado) y «neto» = resultado acumulado de la temporada (sin dinero de su bolsillo: para la
// gráfica, el máximo, el mínimo y la peor caída; retirar no es perder ni meter es ganar).
export function conBankroll(bets, inicial, movimientos = []) {
  const { porId } = cuenta(bets, inicial, movimientos);
  return ordenar(bets).map((b) => ({ ...b, ...(porId[b.id] || { bankroll: null, neto: null }) }));
}

export function racha(bets) {
  const l = ordenar(bets).filter(liquidada);
  let n = 0, tipo = null;
  for (let i = l.length - 1; i >= 0; i--) {
    const t = positiva(l[i]) ? "W" : negativa(l[i]) ? "L" : null;
    if (n === 0) { tipo = t; n = t ? 1 : 0; if (!t) break; }
    else if (t === tipo) n++;
    else break;
  }
  return { n, tipo };
}

// Mejor y peor racha (Javi, 12-oct-2026: «quiero saber la peor racha negativa y la mejor positiva»). Racha = apuestas
// liquidadas seguidas del mismo signo (un cash out cuenta según deje beneficio o pérdida). Se elige la que más euros
// movió: { euros, n, desde, hasta } o null si no hay ninguna de ese signo.
export function rachas(bets) {
  const l = ordenar(bets).filter((b) => liquidada(b) && b.pl != null && (positiva(b) || negativa(b)));
  let mejor = null, peor = null, actual = null;
  const cerrar = () => {
    if (!actual) return;
    const r = { euros: redondear(actual.euros), n: actual.n, desde: actual.desde, hasta: actual.hasta };
    if (actual.signo > 0 && (!mejor || r.euros > mejor.euros)) mejor = r;
    if (actual.signo < 0 && (!peor || r.euros < peor.euros)) peor = r;
  };
  for (const b of l) {
    const signo = positiva(b) ? 1 : -1;
    if (actual && actual.signo === signo) { actual.euros += b.pl; actual.n++; actual.hasta = b.date; }
    else { cerrar(); actual = { signo, euros: b.pl, n: 1, desde: b.date, hasta: b.date }; }
  }
  cerrar();
  return { mejor, peor };
}

// Todo lo que enseña el inicio (nombres elegidos por Javi el 05-oct-2026):
//   yield = beneficio ÷ total apostado (lo bien que apuesta; el «ROI» de las casas y los tipsters)
//   ROI   = beneficio ÷ lo que ha salido de su bolsillo (bankroll inicial + lo que fue metiendo; 12-oct-2026)
//   bankroll = el del método: puesto (con las recargas automáticas) − retirado + neto (el que vale es este; el saldo de
//   bet365 NO, Javi echa allí otras apuestas). En pantalla manda el «disponible» = bankroll − lo que está en juego.
export function resumen(bets, inicial, movimientos = []) {
  const hechas = bets.filter(liquidada);
  const enJuego = bets.filter((b) => b.result === "pending");
  const neto = redondear(hechas.reduce((a, b) => a + (b.pl || 0), 0));
  const apostado = hechas.reduce((a, b) => a + (b.stake || 0), 0);
  const { caja, recargas } = cuenta(bets, inicial, movimientos);
  const { puesto, retirado, ingresos, recargado } = dinero(inicial, movimientos, recargas);
  const comprometido = redondear(enJuego.reduce((a, b) => a + (b.stake || 0), 0));
  const bankroll = redondear(caja + comprometido);   // = puesto − retirado + neto
  const cuotas = hechas.map((b) => b.odds).filter((o) => o > 0);
  return {
    total: bets.length,
    ganadas: hechas.filter((b) => b.result === "win").length,
    perdidas: hechas.filter((b) => b.result === "loss").length,
    cashouts: hechas.filter((b) => b.result === "cashout").length,
    aciertos: hechas.filter(positiva).length,
    liquidadas: hechas.length,
    winRate: winRate(hechas),
    enJuego: enJuego.length,
    comprometido,
    neto,
    apostado: redondear(apostado),
    yieldPct: apostado > 0 ? (neto / apostado) * 100 : null,
    bankroll,
    disponible: caja,          // lo que hay libre en la cuenta ahora (lo que está en juego, aparte)
    puesto,
    ingresos,
    recargado,
    recargas,
    retirado,
    roiInicial: puesto > 0 ? (neto / puesto) * 100 : null,   // el nombre se queda; ahora es sobre lo puesto de su bolsillo
    cuotaMedia: cuotas.length ? cuotas.reduce((a, b) => a + b, 0) / cuotas.length : null,
    racha: racha(bets),
  };
}

// Win rate ponderado (Javi, 05-oct-2026): ganada = 1 acierto y perdida = 1 derrota. Un cash out NO cuenta como
// una entera: por encima del stake es acierto en la parte de la ganancia posible que se llevó (beneficio ÷ (stake ×
// (cuota − 1))); por debajo, derrota en la parte del stake que perdió (pérdida ÷ stake); justo al stake, nada.
// Win rate = aciertos ÷ (aciertos + derrotas).
export function peso(b) {
  if (b.result === "win") return { acierto: 1, derrota: 0 };
  if (b.result === "loss") return { acierto: 0, derrota: 1 };
  if (b.result !== "cashout" || b.pl == null || !b.stake) return { acierto: 0, derrota: 0 };
  if (b.pl > 0) {
    const posible = b.stake * (b.odds - 1);
    return { acierto: posible > 0 ? Math.min(1, b.pl / posible) : 1, derrota: 0 };
  }
  return { acierto: 0, derrota: Math.min(1, -b.pl / b.stake) };
}

export function winRate(hechas) {
  let a = 0, d = 0;
  for (const b of hechas) { const p = peso(b); a += p.acierto; d += p.derrota; }
  return a + d > 0 ? (a / (a + d)) * 100 : null;
}

// Lo que enseña la Gráfica (Javi, 13-nov-2026: «mi máximo de la temporada, el mínimo y la caída más prolongada, da
// igual que sea del máximo o de otro punto: la que más daño ha hecho»). Todo sobre el resultado acumulado (neto),
// empezando en 0: así meter o retirar dinero no lo mueve.
// serie: [{ id, date, neto }] en orden, con el punto de salida { id: "inicio", neto: 0 } delante.
export function extremos(serie) {
  let maximo = serie[0], minimo = serie[0];
  for (const p of serie) {
    if (p.neto > maximo.neto) maximo = p;
    if (p.neto < minimo.neto) minimo = p;
  }
  return { maximo, minimo };
}

// Peor caída: la mayor bajada en euros desde un punto alto hasta el más bajo que vino después (sea o no el máximo de
// la temporada). { euros, pico, fondo, apuestas } (euros = 0 si nunca bajó; apuestas = cuántas hubo en la bajada).
export function peorCaida(serie) {
  let pico = 0, mejor = { euros: 0, pico: null, fondo: null, apuestas: 0 };
  serie.forEach((p, i) => {
    if (p.neto > serie[pico].neto) pico = i;
    const caida = serie[pico].neto - p.neto;
    if (caida > mejor.euros + 1e-9) mejor = { euros: redondear(caida), pico: serie[pico], fondo: p, apuestas: i - pico };
  });
  return mejor;
}

// Beneficio de una apuesta a partir de lo que devolvió la casa
export function beneficio(resultado, stake, retorno) {
  if (resultado === "loss") return -stake;
  if (resultado === "pending") return null;
  if (retorno === "" || retorno == null || isNaN(parseFloat(retorno))) return null;
  return redondear(parseFloat(retorno) - stake);
}

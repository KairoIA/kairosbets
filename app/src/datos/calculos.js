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

// Dinero de Javi que entra o sale de la cuenta durante la temporada (12-oct-2026, Javi: «la primera apuesta se
// pierde y tengo que poner otros 15… quiero ver lo que ha salido de mi bolsillo y lo que voy retirando»).
// temporada.movimientos = [{ id, fecha, tipo: "ingreso" | "retirada", importe, nota }]. El bankroll inicial es el
// primer dinero que puso; los ingresos se suman a lo puesto y las retiradas a lo retirado. NO son ni ganancia ni pérdida.
export function dinero(inicial, movimientos = []) {
  const suma = (tipo) => redondear((movimientos || []).filter((m) => m.tipo === tipo).reduce((a, m) => a + (Number(m.importe) || 0), 0));
  const ingresos = suma("ingreso"), retirado = suma("retirada");
  return { ingresos, retirado, puesto: redondear((inicial || 0) + ingresos) };
}

// Cada apuesta liquidada con el bankroll que deja detrás: «bankroll» = lo que hay en la cuenta (con lo que metió o
// retiró Javi hasta esa fecha; el mismo día, el dinero va antes que las apuestas) y «rinde» = bankroll inicial + neto
// acumulado, sin ingresos ni retiradas (para el máximo y los drawdowns: retirar no es perder).
export function conBankroll(bets, inicial, movimientos = []) {
  const movs = [...(movimientos || [])].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  let bank = inicial, rinde = inicial, i = 0;
  const hasta = (fecha) => {
    for (; i < movs.length && movs[i].fecha <= fecha; i++) bank = redondear(bank + (movs[i].tipo === "retirada" ? -1 : 1) * (Number(movs[i].importe) || 0));
  };
  return ordenar(bets).map((b) => {
    hasta(b.date);
    if (liquidada(b) && b.pl != null) {
      bank = redondear(bank + b.pl);
      rinde = redondear(rinde + b.pl);
      return { ...b, bankroll: bank, rinde };
    }
    return { ...b, bankroll: null, rinde: null };
  });
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

// Todo lo que enseña el inicio (nombres elegidos por Javi el 05-oct-2026):
//   yield = beneficio ÷ total apostado (lo bien que apuesta; el «ROI» de las casas y los tipsters)
//   ROI   = beneficio ÷ lo que ha salido de su bolsillo (bankroll inicial + lo que fue metiendo; 12-oct-2026)
//   bankroll = lo que hay en la cuenta: puesto − retirado + neto (cuadra con el saldo de bet365)
export function resumen(bets, inicial, movimientos = []) {
  const hechas = bets.filter(liquidada);
  const enJuego = bets.filter((b) => b.result === "pending");
  const neto = redondear(hechas.reduce((a, b) => a + (b.pl || 0), 0));
  const apostado = hechas.reduce((a, b) => a + (b.stake || 0), 0);
  const { puesto, retirado, ingresos } = dinero(inicial, movimientos);
  const bankroll = redondear(puesto - retirado + neto);
  const comprometido = redondear(enJuego.reduce((a, b) => a + (b.stake || 0), 0));
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
    disponible: redondear(bankroll - comprometido),
    puesto,
    ingresos,
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

// Máximo drawdown (Javi, 06-oct): la mayor caída del bankroll desde un pico hasta el punto más bajo posterior.
// serie: [{ bankroll, date, id }] en orden. Devuelve { euros, pct, pico, fondo } (euros = 0 si nunca bajó).
export function maxDrawdown(serie) {
  let pico = serie[0], mejor = { euros: 0, pct: 0, pico: null, fondo: null };
  for (const p of serie) {
    if (p.bankroll > pico.bankroll) pico = p;
    const caida = pico.bankroll - p.bankroll;
    if (caida > mejor.euros + 1e-9) mejor = { euros: redondear(caida), pct: pico.bankroll > 0 ? (caida / pico.bankroll) * 100 : null, pico, fondo: p };
  }
  return mejor;
}

// Drawdown actual: cuánto está ahora el bankroll por debajo de su máximo. { euros, pct, pico } (euros = 0 en máximos)
export function drawdownActual(serie) {
  const pico = serie.reduce((m, p) => (p.bankroll > m.bankroll ? p : m), serie[0]);
  const caida = pico.bankroll - serie[serie.length - 1].bankroll;
  return { euros: redondear(Math.max(0, caida)), pct: pico.bankroll > 0 ? (Math.max(0, caida) / pico.bankroll) * 100 : null, pico };
}

// Beneficio de una apuesta a partir de lo que devolvió la casa
export function beneficio(resultado, stake, retorno) {
  if (resultado === "loss") return -stake;
  if (resultado === "pending") return null;
  if (retorno === "" || retorno == null || isNaN(parseFloat(retorno))) return null;
  return redondear(parseFloat(retorno) - stake);
}

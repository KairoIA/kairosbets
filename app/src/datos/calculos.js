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

// Cada apuesta liquidada con el bankroll que deja detrás
export function conBankroll(bets, inicial) {
  let bank = inicial;
  return ordenar(bets).map((b) => {
    if (liquidada(b) && b.pl != null) {
      bank = redondear(bank + b.pl);
      return { ...b, bankroll: bank };
    }
    return { ...b, bankroll: null };
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
//   ROI   = beneficio ÷ bankroll inicial (lo que ha rendido el dinero que puso)
export function resumen(bets, inicial) {
  const hechas = bets.filter(liquidada);
  const enJuego = bets.filter((b) => b.result === "pending");
  const neto = redondear(hechas.reduce((a, b) => a + (b.pl || 0), 0));
  const apostado = hechas.reduce((a, b) => a + (b.stake || 0), 0);
  const bankroll = redondear(inicial + neto);
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
    roiInicial: inicial > 0 ? ((bankroll - inicial) / inicial) * 100 : null,
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

// Beneficio de una apuesta a partir de lo que devolvió la casa
export function beneficio(resultado, stake, retorno) {
  if (resultado === "loss") return -stake;
  if (resultado === "pending") return null;
  if (retorno === "" || retorno == null || isNaN(parseFloat(retorno))) return null;
  return redondear(parseFloat(retorno) - stake);
}

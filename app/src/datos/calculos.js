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

// Todo lo que enseña el inicio. «ROI» es el de verdad (beneficio / lo apostado);
// lo que antes se llamaba ROI era lo que ha crecido el bankroll, y ahora se llama así.
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
    enJuego: enJuego.length,
    comprometido,
    neto,
    apostado: redondear(apostado),
    roi: apostado > 0 ? (neto / apostado) * 100 : null,
    bankroll,
    disponible: redondear(bankroll - comprometido),
    crecimiento: inicial > 0 ? ((bankroll - inicial) / inicial) * 100 : null,
    cuotaMedia: cuotas.length ? cuotas.reduce((a, b) => a + b, 0) / cuotas.length : null,
    racha: racha(bets),
  };
}

// Beneficio de una apuesta a partir de lo que devolvió la casa
export function beneficio(resultado, stake, retorno) {
  if (resultado === "loss") return -stake;
  if (resultado === "pending") return null;
  if (retorno === "" || retorno == null || isNaN(parseFloat(retorno))) return null;
  return redondear(parseFloat(retorno) - stake);
}

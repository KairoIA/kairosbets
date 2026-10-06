import { useState } from "react";
import { Grafica, Insignia, Linea, masmenos } from "../piezas/comunes.jsx";
import { estado, maxDrawdown, drawdownActual } from "../datos/calculos.js";
import { pct, fechaCorta } from "../datos/util.js";

export function PestanaGrafica({ temporada, bets, r, onBet }) {
  const [sel, setSel] = useState(null);
  const hechas = bets.filter((b) => b.result !== "pending");
  const elegida = sel && bets.find((b) => b.id === sel);
  // Máximo del bankroll en la temporada (contando con lo que había al empezar) y el máximo drawdown
  const serie = [{ id: "inicio", date: temporada.inicio, bankroll: temporada.bankrollInicial }, ...hechas.filter((b) => b.bankroll != null)];
  const maximo = serie.reduce((m, p) => (p.bankroll > m.bankroll ? p : m), serie[0]);
  const dd = maxDrawdown(serie);
  const ahora = drawdownActual(serie);
  const cuando = (p) => (p.id === "inicio" ? "al empezar" : fechaCorta(p.date));
  return (
    <div className="scroll">
      <div className="heroe" style={{ paddingTop: 14 }}>
        <div className="tres cuatro" style={{ marginTop: 0, borderTop: 0 }}>
          <div><span className="etiqueta">Bankroll</span><b className="ambar">{r.bankroll.toFixed(2)}</b></div>
          <div><span className="etiqueta">Neto</span><b className={r.neto > 0 ? "pos" : r.neto < 0 ? "neg" : ""}>{masmenos(r.neto)}</b></div>
          <div><span className="etiqueta">Yield</span><b className={r.yieldPct > 0 ? "pos" : r.yieldPct < 0 ? "neg" : ""}>{r.yieldPct == null ? "—" : pct(r.yieldPct, 1)}</b></div>
          <div><span className="etiqueta">Cuota med.</span><b>{r.cuotaMedia == null ? "—" : r.cuotaMedia.toFixed(2)}</b></div>
        </div>
      </div>
      <div className="dinero" style={{ paddingBottom: 2 }}>
        <div><span className="etiqueta">Máximo histórico</span><b className="pos">{maximo.bankroll.toFixed(2)}<small> €</small></b><span className="etiqueta" style={{ display: "block", marginTop: 5 }}>{cuando(maximo)}</span></div>
        <div>
          <span className="etiqueta">Drawdown actual</span>
          <b className={ahora.euros > 0 ? "neg" : "pos"}>{ahora.euros > 0 ? "−" + ahora.euros.toFixed(2) : "0.00"}<small> €</small></b>
          <span className="etiqueta" style={{ display: "block", marginTop: 5 }}>{ahora.euros > 0 ? `−${ahora.pct.toFixed(1)}% desde ${cuando(ahora.pico)}` : "en máximos"}</span>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {/* Javi (06-oct): lo que cayó en € y en %, y en pequeño al lado las fechas del pico y del fondo */}
          <div className="entre">
            <span className="etiqueta">Máx. drawdown histórico</span>
            {dd.euros > 0 && <span className="etiqueta">{cuando(dd.pico)} → {cuando(dd.fondo)}</span>}
          </div>
          <b className={dd.euros > 0 ? "neg" : ""}>
            {dd.euros > 0 ? "−" + dd.euros.toFixed(2) : "0.00"}<small> €</small>
            <span style={{ marginLeft: 22 }}>{dd.euros > 0 ? "−" + dd.pct.toFixed(1) : "0.0"}<small> %</small></span>
          </b>
        </div>
      </div>
      <div className="pad">
        <div className="etiqueta" style={{ marginBottom: 12 }}>Bankroll · toca un punto</div>
        <Grafica bets={bets} inicial={temporada.bankrollInicial} sel={sel} onPunto={(p) => setSel(sel === p.id ? null : p.id)} />
      </div>
      {elegida && (
        <div style={{ padding: "0 18px 14px" }}>
          <button className={`juego r-${estado(elegida).clave}`} style={{ margin: 0, width: "100%", textAlign: "left", borderLeftColor: "var(--c)", padding: "11px 12px" }} onClick={() => onBet(elegida)}>
            <div className="entre" style={{ marginBottom: 6 }}>
              <span className="etiqueta">{fechaCorta(elegida.date)} · {elegida.type}</span>
              <Insignia c={estado(elegida).clave}>{estado(elegida).texto}</Insignia>
            </div>
            <div className="desc" style={{ fontSize: 11.5, lineHeight: 1.45, marginBottom: 8 }}>{elegida.desc}</div>
            <div className="entre">
              <span className="etiqueta">@{Number(elegida.odds).toFixed(2)} · {elegida.stake} € · bankroll {elegida.bankroll?.toFixed(2)}</span>
              <b className="rotulo" style={{ fontSize: 22, color: "var(--c)" }}>{masmenos(elegida.pl)}</b>
            </div>
          </button>
        </div>
      )}
      <div className="seccion" style={{ borderBottom: "1px solid var(--linea)" }}>
        <span className="etiqueta">Liquidadas · {hechas.length}</span>
        <span className="etiqueta">P&amp;L · bankroll</span>
      </div>
      {[...hechas].reverse().map((b) => (
        <Linea key={b.id} bet={b} conBank sel={sel === b.id} onClick={() => setSel(sel === b.id ? null : b.id)} />
      ))}
      <div className="hueco" />
    </div>
  );
}

const FILTROS = [
  ["todas", "Todas", () => true],
  ["juego", "En juego", (b) => b.result === "pending"],
  ["ganadas", "Ganadas", (b) => b.result === "win"],
  ["perdidas", "Perdidas", (b) => b.result === "loss"],
  ["cashout", "Cash out", (b) => b.result === "cashout"],
  ["simples", "Simples", (b) => b.type === "Simple"],
  ["combinadas", "Combinadas", (b) => b.type === "Combinada"],
];

// Columnas que ordenan al tocarlas (Javi, 06-oct): la primera vez de mayor a menor, la segunda al revés.
// Las que siguen en juego no tienen P&L y van siempre al final al ordenar por P&L.
const COLUMNAS = [
  ["fecha", "Fecha", (b) => b.date],
  ["cuota", "Cuota", (b) => Number(b.odds) || 0],
  ["pl", "P&L", (b) => b.pl],
];

function Extremo({ titulo, bet, onBet }) {
  return (
    <button onClick={() => bet && onBet(bet)} disabled={!bet}>
      <span className="etiqueta">{titulo}</span>
      <b className={bet ? (bet.pl >= 0 ? "pos" : "neg") : "tenue"}>{bet ? masmenos(bet.pl) : "—"}{bet && <small> €</small>}</b>
      <span className="pie">{bet ? `${fechaCorta(bet.date)} · ${bet.desc}` : "sin datos"}</span>
    </button>
  );
}

export function PestanaHistorial({ bets, onBet }) {
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState({ col: "fecha", desc: true });
  const f = FILTROS.find((x) => x[0] === filtro)[2];
  const q = busca.trim().toLowerCase();
  const valor = COLUMNAS.find((c) => c[0] === orden.col)[2];
  const lista = [...bets].reverse().filter(f).filter((b) => !q || (b.desc + " " + b.notes).toLowerCase().includes(q));
  if (orden.col !== "fecha" || !orden.desc) {
    lista.sort((a, b) => {
      const x = valor(a), y = valor(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * (orden.desc ? -1 : 1);
    });
  }
  const tocar = (col) => setOrden((o) => ({ col, desc: o.col === col ? !o.desc : true }));
  const mejor = (lista2, cmp) => lista2.reduce((m, b) => (m == null || cmp(b.pl, m.pl) ? b : m), null);
  const ganadas = bets.filter((b) => b.result === "win" && b.pl != null);
  const cashouts = bets.filter((b) => b.result === "cashout" && b.pl != null);
  const neto = lista.filter((b) => b.pl != null).reduce((a, b) => a + b.pl, 0);
  return (
    <div className="scroll">
      <div className="dinero tres-col" style={{ paddingTop: 14 }}>
        <Extremo titulo="Mayor ganancia" bet={mejor(ganadas, (a, b) => a > b)} onBet={onBet} />
        <Extremo titulo="Mayor cash out" bet={mejor(cashouts, (a, b) => a > b)} onBet={onBet} />
        <Extremo titulo="Menor cash out" bet={mejor(cashouts, (a, b) => a < b)} onBet={onBet} />
      </div>
      <div className="pad" style={{ paddingBottom: 10 }}>
        <input className="entrada" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipo, mercado, nota…" aria-label="Buscar" />
      </div>
      <div className="filtros">
        {FILTROS.map(([id, txt]) => (
          <button key={id} className={filtro === id ? "activo" : ""} onClick={() => setFiltro(id)}>{txt}</button>
        ))}
      </div>
      <div className="seccion" style={{ borderBottom: "1px solid var(--linea)" }}>
        <span className="etiqueta">{lista.length} apuestas</span>
        <span className={`rotulo ${neto > 0 ? "pos" : neto < 0 ? "neg" : ""}`} style={{ fontSize: 20, fontWeight: 700 }}>{masmenos(neto)}</span>
      </div>
      <div className="columnas">
        {COLUMNAS.map(([id, txt]) => (
          <button key={id} className={orden.col === id ? "activa" : ""} onClick={() => tocar(id)}>
            {txt} {orden.col === id ? (orden.desc ? "▼" : "▲") : ""}
          </button>
        ))}
      </div>
      {lista.map((b) => <Linea key={b.id} bet={b} conBank onClick={() => onBet(b)} />)}
      {!lista.length && <div className="pad tenue" style={{ textAlign: "center", padding: 30, fontSize: 11 }}>Nada con ese filtro</div>}
      <div className="hueco" />
    </div>
  );
}

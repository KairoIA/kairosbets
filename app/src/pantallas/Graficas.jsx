import { useState } from "react";
import { Grafica, Insignia, Linea, masmenos } from "../piezas/comunes.jsx";
import { estado } from "../datos/calculos.js";
import { pct, fechaCorta } from "../datos/util.js";

export function PestanaGrafica({ temporada, bets, r, onBet }) {
  const [sel, setSel] = useState(null);
  const hechas = bets.filter((b) => b.result !== "pending");
  const elegida = sel && bets.find((b) => b.id === sel);
  return (
    <div className="scroll">
      <div className="heroe" style={{ paddingTop: 14 }}>
        <div className="tres" style={{ marginTop: 0, borderTop: 0 }}>
          <div><span className="etiqueta">Bankroll</span><b className="ambar">{r.bankroll.toFixed(2)}</b></div>
          <div><span className="etiqueta">Yield</span><b className={r.yieldPct > 0 ? "pos" : r.yieldPct < 0 ? "neg" : ""}>{r.yieldPct == null ? "—" : pct(r.yieldPct, 1)}</b></div>
          <div><span className="etiqueta">Cuota media</span><b>{r.cuotaMedia == null ? "—" : r.cuotaMedia.toFixed(2)}</b></div>
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

export function PestanaHistorial({ bets, onBet }) {
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const f = FILTROS.find((x) => x[0] === filtro)[2];
  const q = busca.trim().toLowerCase();
  const lista = [...bets].reverse().filter(f).filter((b) => !q || (b.desc + " " + b.notes).toLowerCase().includes(q));
  const neto = lista.filter((b) => b.pl != null).reduce((a, b) => a + b.pl, 0);
  return (
    <div className="scroll">
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
      {lista.map((b) => <Linea key={b.id} bet={b} conBank onClick={() => onBet(b)} />)}
      {!lista.length && <div className="pad tenue" style={{ textAlign: "center", padding: 30, fontSize: 11 }}>Nada con ese filtro</div>}
      <div className="hueco" />
    </div>
  );
}

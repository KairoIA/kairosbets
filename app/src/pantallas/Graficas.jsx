import { useState } from "react";
import { Grafica, Insignia, Linea, Sep } from "../piezas/comunes.jsx";
import { estado } from "../datos/calculos.js";
import { euros, signo, pct, fechaCorta } from "../datos/util.js";

export function PestanaGrafica({ temporada, bets, r, onBet }) {
  const [sel, setSel] = useState(null);
  const hechas = bets.filter((b) => b.result !== "pending");
  const elegida = sel && bets.find((b) => b.id === sel);
  return (
    <div className="scroll">
      <div className="pad">
        <div className="fila" style={{ flexWrap: "wrap", gap: 6 }}>
          <Insignia c="cashout">{euros(r.bankroll)}</Insignia>
          <Insignia c={r.neto >= 0 ? "win" : "loss"}>{signo(r.neto)} neto</Insignia>
          <Insignia c={r.roi >= 0 ? "pending" : "loss"}>ROI {pct(r.roi, 1)}</Insignia>
          {r.cuotaMedia != null && <Insignia>cuota media {r.cuotaMedia.toFixed(2)}</Insignia>}
        </div>
      </div>
      <Sep />
      <div className="pad">
        <div className="etiqueta" style={{ marginBottom: 12 }}>Bankroll · toca un punto</div>
        <Grafica bets={bets} inicial={temporada.bankrollInicial} sel={sel} onPunto={(p) => setSel(sel === p.id ? null : p.id)} />
      </div>
      {elegida && (
        <div className="pad" style={{ paddingTop: 0 }}>
          <button className={`caja r-${estado(elegida).clave}`} style={{ width: "100%", textAlign: "left", borderColor: "color-mix(in srgb, var(--c) 30%, transparent)" }} onClick={() => onBet(elegida)}>
            <div className="entre" style={{ marginBottom: 6 }}>
              <span className="tenue" style={{ fontSize: 11 }}>{fechaCorta(elegida.date)} · {elegida.type}</span>
              <Insignia c={estado(elegida).clave}>{estado(elegida).texto}</Insignia>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8 }}>{elegida.desc}</div>
            <div className="entre">
              <div className="fila"><Insignia>@{elegida.odds}</Insignia><Insignia>{elegida.stake} €</Insignia></div>
              <span className="mono" style={{ color: "var(--c)" }}>{signo(elegida.pl)}</span>
            </div>
          </button>
        </div>
      )}
      <Sep />
      <div className="pad" style={{ paddingBottom: 4 }}><div className="etiqueta">Todas las liquidadas</div></div>
      {[...hechas].reverse().map((b, i) => (
        <div key={b.id}>
          <Linea bet={b} conBank sel={sel === b.id} onClick={() => setSel(sel === b.id ? null : b.id)} />
          {i < hechas.length - 1 && <Sep />}
        </div>
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
        <input className="entrada" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipo, mercado, nota…" />
      </div>
      <div className="filtros">
        {FILTROS.map(([id, txt]) => (
          <button key={id} className={filtro === id ? "activo" : ""} onClick={() => setFiltro(id)}>{txt}</button>
        ))}
      </div>
      <Sep />
      <div className="pad entre" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <span className="etiqueta">{lista.length} apuestas</span>
        <span className={`mono ${neto >= 0 ? "pos" : "neg"}`} style={{ fontSize: 13 }}>{signo(neto)}</span>
      </div>
      <Sep />
      {lista.map((b, i) => (
        <div key={b.id}>
          <Linea bet={b} conBank onClick={() => onBet(b)} />
          {i < lista.length - 1 && <Sep />}
        </div>
      ))}
      {!lista.length && <div className="pad tenue" style={{ textAlign: "center", padding: 30 }}>Nada con ese filtro</div>}
      <div className="hueco" />
    </div>
  );
}

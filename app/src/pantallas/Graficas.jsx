import { useState } from "react";
import { Grafica, Insignia, Linea, masmenos } from "../piezas/comunes.jsx";
import { estado, extremos, peorCaida, rachas } from "../datos/calculos.js";
import { fechaCorta } from "../datos/util.js";

export function PestanaGrafica({ temporada, bets, onBet }) {
  const [sel, setSel] = useState(null);
  const hechas = bets.filter((b) => b.result !== "pending");
  const elegida = sel && bets.find((b) => b.id === sel);
  // Todo sobre el resultado acumulado (13-nov-2026): empieza en 0 y solo lo mueven las apuestas
  const serie = [{ id: "inicio", date: temporada.inicio, neto: 0 }, ...hechas.filter((b) => b.neto != null)];
  const { maximo, minimo } = extremos(serie);
  const caida = peorCaida(serie);
  const cuando = (p) => (p.id === "inicio" ? "al empezar" : fechaCorta(p.date));
  const { mejor, peor } = rachas(bets);
  // «2 seguidas · 10 → 11 oct» (el mes una sola vez si es el mismo, para que quepa en una línea)
  const tramo = (r) => {
    const d = fechaCorta(r.desde), h = fechaCorta(r.hasta);
    const fechas = r.desde === r.hasta ? d : r.desde.slice(0, 7) === r.hasta.slice(0, 7) ? `${d.split(" ")[0]} → ${h}` : `${d} → ${h}`;
    return `${r.n} seguida${r.n === 1 ? "" : "s"} · ${fechas}`;
  };
  const pie = (txt) => <span className="etiqueta" style={{ display: "block", marginTop: 5 }}>{txt}</span>;
  return (
    <div className="scroll">
      <div className="dinero" style={{ paddingTop: 14, paddingBottom: 2 }}>
        <div><span className="etiqueta">Máximo</span><b className={maximo.neto > 0 ? "pos" : ""}>{masmenos(maximo.neto) || "0.00"}<small> €</small></b>{pie(cuando(maximo))}</div>
        <div><span className="etiqueta">Mínimo</span><b className={minimo.neto < 0 ? "neg" : ""}>{masmenos(minimo.neto) || "0.00"}<small> €</small></b>{pie(cuando(minimo))}</div>
        <div style={{ gridColumn: "1 / -1" }}>
          {/* La bajada que más daño hizo, venga del máximo o de cualquier otro punto alto */}
          <div className="entre">
            <span className="etiqueta">Peor caída</span>
            {caida.euros > 0 && <span className="etiqueta">{cuando(caida.pico)} → {cuando(caida.fondo)}</span>}
          </div>
          <b className={caida.euros > 0 ? "neg" : ""}>{caida.euros > 0 ? "−" + caida.euros.toFixed(2) : "0.00"}<small> €</small></b>
          {pie(caida.euros > 0 ? `en ${caida.apuestas} apuesta${caida.apuestas === 1 ? "" : "s"}` : "sin caídas aún")}
        </div>
        <div>
          <span className="etiqueta">Mejor racha</span>
          <b className={mejor ? "pos" : ""}>{mejor ? "+" + mejor.euros.toFixed(2) : "—"}<small> €</small></b>
          {pie(mejor ? tramo(mejor) : "sin rachas aún")}
        </div>
        <div>
          <span className="etiqueta">Peor racha</span>
          <b className={peor ? "neg" : ""}>{peor ? "−" + Math.abs(peor.euros).toFixed(2) : "—"}<small> €</small></b>
          {pie(peor ? tramo(peor) : "sin rachas aún")}
        </div>
      </div>
      <div className="pad">
        <div className="etiqueta" style={{ marginBottom: 12 }}>Resultado acumulado · toca un punto</div>
        <Grafica bets={bets} sel={sel} onPunto={(p) => setSel(sel === p.id ? null : p.id)} />
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
              <span className="etiqueta">@{Number(elegida.odds).toFixed(2)} · {elegida.stake} € · acumulado {masmenos(elegida.neto) || "0.00"}</span>
              <b className="rotulo" style={{ fontSize: 22, color: "var(--c)" }}>{masmenos(elegida.pl)}</b>
            </div>
          </button>
        </div>
      )}
      <div className="seccion" style={{ borderBottom: "1px solid var(--linea)" }}>
        <span className="etiqueta">Liquidadas · {hechas.length}</span>
        <span className="etiqueta">P&amp;L · acumulado</span>
      </div>
      {[...hechas].reverse().map((b) => (
        <Linea key={b.id} bet={b} conNeto sel={sel === b.id} onClick={() => setSel(sel === b.id ? null : b.id)} />
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

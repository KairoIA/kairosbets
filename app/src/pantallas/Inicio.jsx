import { Grafica, Linea, masmenos } from "../piezas/comunes.jsx";
import { euros, pct, fechaCorta, redondear } from "../datos/util.js";

// El marcador: la cifra del bankroll manda y todo lo demás es tablero
export default function Inicio({ temporada, bets, r, onBet, onLiquidar, archivo }) {
  const enJuego = bets.filter((b) => b.result === "pending");
  const ultimas = [...bets].reverse().filter((b) => b.result !== "pending").slice(0, 8);
  const posible = redondear(enJuego.reduce((a, b) => a + b.stake * b.odds - b.stake, 0));
  const cifra = r.disponible.toFixed(2);
  const rc = r.racha;
  const etiqueta = archivo ? (r.enJuego ? "Bankroll (con apuestas en juego)" : "Bankroll final") : "Bankroll disponible";

  return (
    <div className="scroll">
      <div className="heroe">
        <div className="etiqueta">{etiqueta}</div>
        <div className={`cifra ${cifra.length >= 7 ? "larga" : ""}`}>{cifra}<span>€</span></div>
        <div className="tres">
          <div><span className="etiqueta">Neto</span><b className={r.neto > 0 ? "pos" : r.neto < 0 ? "neg" : ""}>{masmenos(r.neto)}</b></div>
          <div><span className="etiqueta">ROI</span><b className={r.roi > 0 ? "pos" : r.roi < 0 ? "neg" : ""}>{r.roi == null ? "—" : pct(r.roi, 1)}</b></div>
          <div><span className="etiqueta">En juego</span><b>{r.comprometido.toFixed(2)}</b></div>
        </div>
        <div className="nota-heroe">
          Empezó con {euros(temporada.bankrollInicial)}
          {r.crecimiento != null && r.liquidadas > 0 && <> · bankroll {pct(r.crecimiento)}</>} · stake {temporada.stake} €
        </div>
      </div>

      <div className="tablero">
        <div><b className="pos">{r.ganadas}</b><span>Ganadas</span></div>
        <div><b className="neg">{r.perdidas}</b><span>Perdidas</span></div>
        <div><b>{r.cashouts}</b><span>Cash out</span></div>
        <div><b className={rc.tipo === "W" ? "ambar" : rc.tipo === "L" ? "neg" : "tenue"}>{rc.n ? rc.n + rc.tipo : "—"}</b><span>Racha</span></div>
      </div>

      <div className="mini-grafica"><Grafica mini bets={bets} inicial={temporada.bankrollInicial} /></div>

      {!bets.length && (
        <div className="seccion" style={{ display: "block", padding: "28px 18px" }}>
          <div className="titulo" style={{ fontSize: 26 }}>Temporada a cero</div>
          <div className="explica">Apunta la primera apuesta con el botón +: a mano, con una captura o escribiéndola.</div>
        </div>
      )}

      {enJuego.length > 0 && (
        <>
          <div className="seccion">
            <span className="etiqueta">En juego · {enJuego.length}</span>
            <span className="etiqueta">posible <span className="pos">{masmenos(posible)}</span></span>
          </div>
          {enJuego.map((b) => (
            <div key={b.id} className="juego">
              <button className="arriba" onClick={() => onBet(b)}>
                <div className="desc">
                  {b.desc}
                  <div className="meta">{fechaCorta(b.date)} · {b.type} · {b.stake} €</div>
                </div>
                <div className="cuota">{Number(b.odds).toFixed(2)}</div>
              </button>
              <div className="seg">
                <button className="pos" onClick={() => onLiquidar(b, "win", redondear(b.stake * b.odds - b.stake))}>Ganada {masmenos(b.stake * b.odds - b.stake)}</button>
                <button className="neg" onClick={() => onLiquidar(b, "loss", -b.stake)}>Perdida</button>
                <button onClick={() => onBet(b)}>Cash out</button>
              </div>
            </div>
          ))}
        </>
      )}

      {ultimas.length > 0 && (
        <>
          <div className="seccion" style={{ borderBottom: "1px solid var(--linea)" }}>
            <span className="etiqueta">Últimas</span>
            <span className="etiqueta">P&amp;L</span>
          </div>
          {ultimas.map((b) => <Linea key={b.id} bet={b} onClick={() => onBet(b)} />)}
        </>
      )}
      <div className="hueco" />
    </div>
  );
}

import { Grafica, Linea, masmenos } from "../piezas/comunes.jsx";
import { euros, pct, fechaCorta, redondear } from "../datos/util.js";

// El marcador: la cifra del bankroll manda y todo lo demás es tablero
export default function Inicio({ temporada, bets, r, onBet, onLiquidar, onDinero, archivo }) {
  const enJuego = bets.filter((b) => b.result === "pending");
  const ultimas = [...bets].reverse().filter((b) => b.result !== "pending").slice(0, 8);
  const posible = redondear(enJuego.reduce((a, b) => a + b.stake * b.odds - b.stake, 0));
  const cifra = r.disponible.toFixed(2);
  const rc = r.racha;
  const etiqueta = archivo ? "Dinero al cerrar" : "Dinero disponible";

  return (
    <div className="scroll">
      {/* 13-nov-2026 (Javi: «exceso de métricas»): arriba solo el dinero libre, el resultado, el win rate y la racha */}
      <div className="heroe">
        <div className="etiqueta">{etiqueta}</div>
        <div className={`cifra ${cifra.length >= 7 ? "larga" : ""}`}>{cifra}<span>€</span></div>
        {r.comprometido > 0 && <div className="etiqueta" style={{ marginTop: 4 }}>+ {r.comprometido.toFixed(2)} € en juego</div>}
        <div className="tres">
          <div><span className="etiqueta">Neto</span><b className={r.neto > 0 ? "pos" : r.neto < 0 ? "neg" : ""}>{masmenos(r.neto)}</b></div>
          <div><span className="etiqueta">Win rate</span><b>{r.winRate == null ? "—" : r.winRate.toFixed(0) + "%"}</b></div>
          <div><span className="etiqueta">Racha</span><b className={rc.tipo === "W" ? "pos" : rc.tipo === "L" ? "neg" : "tenue"}>{rc.n ? rc.n + (rc.tipo === "W" ? " ✓" : " ✗") : "—"}</b></div>
        </div>
        {/* Lo que ha salido de su bolsillo (con las recargas automáticas) y lo retirado; toca → «Tu dinero» */}
        <button className="nota-heroe" style={{ display: "block", textAlign: "left", width: "100%" }} onClick={() => onDinero()}>
          Has puesto {euros(r.puesto)}{r.retirado > 0 && <> · retirado {euros(r.retirado)}</>} · stake {temporada.stake} € <span className="ambar">›</span>
        </button>
        {/* 13-nov-2026: Javi los quiere de vuelta, pero en pequeño. Yield = neto ÷ apostado; ROI = neto ÷ lo puesto (con recargas) */}
        {r.liquidadas > 0 && (
          <div className="etiqueta" style={{ marginTop: 6 }}>
            Yield <span className={r.yieldPct > 0 ? "pos" : r.yieldPct < 0 ? "neg" : ""}>{pct(r.yieldPct, 1)}</span>
            {r.roiInicial != null && <> · ROI <span className={r.roiInicial > 0 ? "pos" : r.roiInicial < 0 ? "neg" : ""}>{pct(r.roiInicial, 1)}</span></>}
          </div>
        )}
        {!archivo && (
          <div className="opciones" style={{ marginTop: 12 }}>
            <button className="opcion" onClick={() => onDinero("ingreso")}>+ Meter</button>
            <button className="opcion" onClick={() => onDinero("retirada")}>− Retirar</button>
          </div>
        )}
      </div>

      <div className="mini-grafica"><Grafica mini bets={bets} /></div>

      {!bets.length && (
        <div className="seccion" style={{ display: "block", padding: "28px 18px" }}>
          <div className="titulo" style={{ fontSize: 26 }}>Temporada a cero</div>
          <div className="explica">Apunta la primera apuesta con el botón +, o mándale el pantallazo a Kaira y te pasa un enlace.</div>
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

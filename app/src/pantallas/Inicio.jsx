import { Insignia, Linea, Sep } from "../piezas/comunes.jsx";
import { euros, signo, pct, fechaCorta, redondear } from "../datos/util.js";

export default function Inicio({ temporada, bets, r, onBet, onLiquidar, archivo }) {
  const enJuego = bets.filter((b) => b.result === "pending");
  const recientes = [...bets].reverse().filter((b) => b.result !== "pending").slice(0, 6);
  const rc = r.racha;

  if (!bets.length)
    return (
      <div className="scroll">
        <div className="bankroll">
          <div className="etiqueta">Bankroll · {temporada.nombre}</div>
          <div className="cifra mono">{euros(temporada.bankrollInicial)}</div>
          <div className="insignias">
            <Insignia c="cashout">empieza con {euros(temporada.bankrollInicial)}</Insignia>
            <Insignia>stake {temporada.stake} €</Insignia>
          </div>
        </div>
        <Sep />
        <div className="pad" style={{ textAlign: "center", padding: "40px 28px" }}>
          <div style={{ fontSize: 15, marginBottom: 8 }}>Temporada nueva, todo a cero</div>
          <div className="explica">Apunta la primera apuesta con el botón + (a mano, con una captura o escribiéndola).</div>
        </div>
      </div>
    );

  return (
    <div className="scroll">
      <div className="bankroll">
        <div className="etiqueta">{archivo ? (r.enJuego ? "Bankroll (con apuestas en juego)" : "Bankroll final") : "Bankroll disponible"}</div>
        <div className="cifra mono">{euros(r.disponible)}</div>
        <div className="insignias">
          <Insignia c="cashout">empezó con {euros(temporada.bankrollInicial)}</Insignia>
          <Insignia c={r.neto >= 0 ? "win" : "loss"}>{signo(r.neto)} neto</Insignia>
          <Insignia c={r.roi >= 0 ? "pending" : "loss"}>ROI {pct(r.roi, 1)}</Insignia>
          {r.crecimiento != null && <Insignia>bank {pct(r.crecimiento)}</Insignia>}
        </div>
        {r.enJuego > 0 && <div className="tenue" style={{ fontSize: 12, marginTop: 9, fontStyle: "italic" }}>{euros(r.comprometido)} en juego</div>}
      </div>
      <Sep />
      <div className="contadores">
        <div><b className="pos">{r.ganadas}</b><span>Ganadas</span></div>
        <div><b className="neg">{r.perdidas}</b><span>Perdidas</span></div>
        <div><b style={{ color: "var(--co-mas)" }}>{r.cashouts}</b><span>Cash out</span></div>
        <div><b className={rc.tipo === "W" ? "pos" : rc.tipo === "L" ? "neg" : "tenue"}>{rc.n ? rc.n + rc.tipo : "—"}</b><span>Racha</span></div>
      </div>
      <Sep />

      {enJuego.length > 0 && (
        <div className="pad">
          <div className="etiqueta" style={{ marginBottom: 10 }}>En juego</div>
          {enJuego.map((b) => (
            <div key={b.id} className="tarjeta-juego" style={{ display: "block" }}>
              <button style={{ width: "100%", textAlign: "left" }} onClick={() => onBet(b)}>
                <div className="entre">
                  <span className="tenue" style={{ fontSize: 11 }}>{fechaCorta(b.date)} · {b.type} · {b.stake} €</span>
                  <Insignia c="pending">@{b.odds}</Insignia>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, marginTop: 4 }}>{b.desc}</div>
              </button>
              <div className="liquidar">
                <button className="g" onClick={() => onLiquidar(b, "win", redondear(b.stake * b.odds - b.stake))}>✓ Ganada +{(b.stake * b.odds - b.stake).toFixed(2)}</button>
                <button className="p" onClick={() => onLiquidar(b, "loss", -b.stake)}>✗ Perdida</button>
                <button className="c" onClick={() => onBet(b)}>◈ Cash out</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {enJuego.length > 0 && <Sep />}

      <div className="pad" style={{ paddingBottom: 4 }}>
        <div className="etiqueta">Últimas liquidadas</div>
      </div>
      {recientes.map((b, i) => (
        <div key={b.id}>
          <Linea bet={b} onClick={() => onBet(b)} />
          {i < recientes.length - 1 && <Sep />}
        </div>
      ))}
      <div className="hueco" />
    </div>
  );
}


import { useState } from "react";
import { Insignia } from "../piezas/comunes.jsx";
import { resumen } from "../datos/calculos.js";
import { euros, signo, pct, fechaCorta } from "../datos/util.js";

export function ListaTemporadas({ temporadas, apuestas, viendo, onVer, onVolver, onCerrar, onExcel }) {
  const lista = [...temporadas.lista].reverse();
  return (
    <div className="scroll pad">
      <button className="volver" onClick={onVolver}>← Volver</button>
      <div className="titulo">Temporadas</div>
      <div className="explica">La actual y las archivadas. Toca una para ver su resumen, su gráfica y su historial.</div>
      {lista.map((t) => {
        const r = resumen(apuestas[t.id] || [], t.bankrollInicial);
        const actual = t.id === temporadas.activa;
        return (
          <button key={t.id} className={`temporada ${actual ? "actual" : ""}`} onClick={() => onVer(t.id)}>
            <div className="entre">
              <b className="nombre-t">{t.nombre}</b>
              {actual ? <Insignia c="pending">en curso</Insignia> : <Insignia c="cashout">archivo</Insignia>}
            </div>
            <div className="etiqueta" style={{ marginTop: 6 }}>
              {fechaCorta(t.inicio)} → {t.fin ? fechaCorta(t.fin) : "hoy"} · {r.total} apuestas{viendo === t.id ? " · la estás viendo" : ""}
            </div>
            <div className="cifras">
              <Insignia>{euros(t.bankrollInicial)} → {euros(r.bankroll)}</Insignia>
              <Insignia c={r.neto >= 0 ? "win" : "loss"}>{signo(r.neto)}</Insignia>
              <Insignia c={r.yieldPct >= 0 ? "pending" : "loss"}>Yield {pct(r.yieldPct, 1)}</Insignia>
              {r.roiInicial != null && r.liquidadas > 0 && <Insignia>ROI {pct(r.roiInicial)}</Insignia>}
              {r.winRate != null && <Insignia>Win {r.winRate.toFixed(0)}%</Insignia>}
              {r.enJuego > 0 && <Insignia c="pending">{r.enJuego} en juego</Insignia>}
            </div>
          </button>
        );
      })}
      <button className="boton suave" style={{ marginTop: 8 }} onClick={onCerrar}>Cerrar la temporada actual y empezar otra</button>
      <button className="boton suave" style={{ marginTop: 10 }} onClick={() => onExcel(false)}>Exportar todas a Excel</button>
      <div className="hueco" />
    </div>
  );
}

// Formulario para empezar temporada: al cerrar la actual o la primera vez que se abre la app
export function EmpezarTemporada({ actual, apuestasActual, siguienteNombre, onVolver, onEmpezar, primera }) {
  const r = actual ? resumen(apuestasActual || [], actual.bankrollInicial) : null;
  const [nombre, setNombre] = useState(siguienteNombre);
  const [bank, setBank] = useState(r ? String(Math.max(0, r.bankroll).toFixed(2)) : "15");
  const [stake, setStake] = useState(String(actual?.stake || 15));
  const [seguro, setSeguro] = useState(false);
  const valido = nombre.trim() && parseFloat(bank) >= 0 && parseFloat(stake) > 0;
  const empezar = () => {
    if (!valido) return;
    if (actual && !seguro) return setSeguro(true);
    onEmpezar({ nombre: nombre.trim(), bankrollInicial: parseFloat(bank), stake: parseFloat(stake) });
  };
  return (
    <div className="scroll pad">
      {onVolver && <button className="volver" onClick={onVolver}>← Volver</button>}
      <div className="titulo">{primera ? "Empieza tu temporada" : "Temporada nueva"}</div>
      {actual && (
        <div className="explica">
          «{actual.nombre}» se guarda en el archivo con sus {apuestasActual.length} apuestas: la podrás ver siempre desde Temporadas.
          {r.enJuego > 0 && ` Tiene ${r.enJuego} en juego: se quedan en ella y las liquidas desde su archivo.`} Esta empieza a cero.
        </div>
      )}
      {primera && <div className="explica">Pon cómo se llama, con cuánto empiezas y tu stake de siempre. Lo puedes cambiar después en Ajustes.</div>}
      <div className="campo">
        <span className="etiqueta">Nombre</span>
        <input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="dos campo">
        <div>
          <span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Bankroll inicial €</span>
          <input className="entrada mono" type="number" inputMode="decimal" step="0.01" value={bank} onChange={(e) => setBank(e.target.value)} />
        </div>
        <div>
          <span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Stake habitual €</span>
          <input className="entrada mono" type="number" inputMode="decimal" step="0.5" value={stake} onChange={(e) => setStake(e.target.value)} />
        </div>
      </div>
      {r && <div className="explica" style={{ marginTop: -6 }}>Sugerido: lo que deja «{actual.nombre}» ({euros(r.bankroll)}). Cámbialo si metes o sacas dinero.</div>}
      <button className="boton" disabled={!valido} onClick={empezar}>
        {seguro ? `Sí: archivar «${actual.nombre}» y empezar «${nombre.trim()}»` : primera ? "Empezar" : "Empezar la temporada nueva"}
      </button>
      {seguro && <div className="explica" style={{ marginTop: 10, textAlign: "center" }}>Pulsa otra vez para confirmar.</div>}
      <div className="hueco" />
    </div>
  );
}

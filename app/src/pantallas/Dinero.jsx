import { useState } from "react";
import { masmenos } from "../piezas/comunes.jsx";
import { hoy, fechaCorta, euros, pct, nuevoId } from "../datos/util.js";

// Tu dinero (12-oct-2026, Javi: «la primera apuesta se pierde, me deja en −15 y tengo que poner otros 15… quiero
// ver lo que ha salido de mi bolsillo, lo que voy retirando y el ROI sobre lo que he puesto»).
// Meter = dinero de su bolsillo a la cuenta; retirar = de la cuenta a su bolsillo. Ninguno es ganancia ni pérdida.
export default function Dinero({ temporada, r, onVolver, onGuardar, onBorrar }) {
  const [tipo, setTipo] = useState("ingreso");
  const [importe, setImporte] = useState(String(temporada.stake || 15));
  const [fecha, setFecha] = useState(hoy());
  const [nota, setNota] = useState("");
  const [hecho, setHecho] = useState(false);
  const [borrar, setBorrar] = useState(null);
  const cantidad = parseFloat(String(importe).replace(",", "."));
  const valido = cantidad > 0 && fecha;
  const movs = [...(temporada.movimientos || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const balance = r.retirado + r.bankroll - r.puesto;   // lo que te llevarías hoy si lo sacaras todo, menos lo que pusiste

  const guardar = () => {
    if (!valido) return;
    onGuardar({ id: nuevoId(), fecha, tipo, importe: Math.round(cantidad * 100) / 100, nota: nota.trim() });
    setHecho(true);
    setNota("");
    setTimeout(() => setHecho(false), 1200);
  };

  return (
    <div className="scroll pad">
      <button className="volver" onClick={onVolver}>← Volver</button>
      <div className="titulo">Tu dinero</div>
      <div className="explica">Lo que sale de tu bolsillo a la cuenta y lo que vas retirando. No cuenta como ganancia ni como pérdida: el ROI se calcula sobre lo que has puesto.</div>

      <div className="dinero" style={{ padding: "4px 0 0" }}>
        <div><span className="etiqueta">De tu bolsillo</span><b>{r.puesto.toFixed(2)}<small> €</small></b></div>
        <div><span className="etiqueta">Retirado</span><b>{r.retirado.toFixed(2)}<small> €</small></b></div>
        <div><span className="etiqueta">En la cuenta</span><b className="ambar">{r.bankroll.toFixed(2)}<small> €</small></b></div>
        <div>
          <span className="etiqueta">ROI</span>
          <b className={r.roiInicial > 0 ? "pos" : r.roiInicial < 0 ? "neg" : ""}>{r.roiInicial == null ? "—" : pct(r.roiInicial)}</b>
          <span className="pie">{masmenos(balance)} € frente a lo puesto</span>
        </div>
      </div>

      <div className="campo" style={{ marginTop: 18 }}>
        <span className="etiqueta">Apuntar</span>
        <div className="opciones">
          <button className={`opcion ${tipo === "ingreso" ? "activa" : ""}`} onClick={() => setTipo("ingreso")}>Meto dinero</button>
          <button className={`opcion ${tipo === "retirada" ? "activa" : ""}`} onClick={() => setTipo("retirada")}>Retiro dinero</button>
        </div>
      </div>
      <div className="dos campo">
        <div><label className="etiqueta" htmlFor="din-imp" style={{ display: "block", marginBottom: 8 }}>Importe €</label><input id="din-imp" className="entrada mono" type="number" inputMode="decimal" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} /></div>
        <div><label className="etiqueta" htmlFor="din-fecha" style={{ display: "block", marginBottom: 8 }}>Fecha</label><input id="din-fecha" className="entrada mono" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
      </div>
      <div className="campo">
        <label className="etiqueta" htmlFor="din-nota">Nota (opcional)</label>
        <input id="din-nota" className="entrada" value={nota} onChange={(e) => setNota(e.target.value)} placeholder={tipo === "ingreso" ? "ej: para poder echar la A" : "ej: me lo llevo"} />
      </div>
      <button className={`boton ${hecho ? "hecho" : ""}`} disabled={!valido} onClick={guardar}>{hecho ? "✓ Apuntado" : tipo === "ingreso" ? "Apuntar que meto" : "Apuntar que retiro"}</button>

      <div className="seccion" style={{ padding: "22px 0 8px", borderBottom: "1px solid var(--linea)" }}>
        <span className="etiqueta">Movimientos</span>
        <span className="etiqueta">€</span>
      </div>
      {movs.map((m) => (
        <button key={m.id} className="linea" style={{ padding: "10px 0" }} onClick={() => (borrar === m.id ? onBorrar(m.id) : setBorrar(m.id))}>
          <span className="f">{fechaCorta(m.fecha)}</span>
          <span className="texto">
            <div className="desc">{m.tipo === "retirada" ? "Retiras" : "Metes"}{m.nota ? ` · ${m.nota}` : ""}</div>
            {borrar === m.id && <div className="sub neg">Pulsa otra vez para borrarlo</div>}
          </span>
          <span className={`importe mono ${m.tipo === "retirada" ? "neg" : "pos"}`}>{m.tipo === "retirada" ? "−" : "+"}{Number(m.importe).toFixed(2)}</span>
        </button>
      ))}
      <div className="linea" style={{ padding: "10px 0" }}>
        <span className="f">{fechaCorta(temporada.inicio)}</span>
        <span className="texto"><div className="desc">Al empezar la temporada</div></span>
        <span className="importe mono pos">+{euros(temporada.bankrollInicial).replace(" €", "")}</span>
      </div>
      <div className="hueco" />
    </div>
  );
}

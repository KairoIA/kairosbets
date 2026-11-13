import { useState } from "react";
import { masmenos } from "../piezas/comunes.jsx";
import { hoy, fechaCorta, euros, nuevoId } from "../datos/util.js";

// 13-nov-2026: las recargas automáticas (cuando no llega para el stake, cuenta que lo pone de su bolsillo) salen en la
// lista y no se borran; si metió otra cantidad, la apunta él y la automática desaparece sola. Fuera el ROI (Javi:
// «exceso de métricas»); arriba: lo puesto, lo retirado, lo disponible y el resultado.
// Tu dinero (12-oct-2026, Javi: «la primera apuesta se pierde, me deja en −15 y tengo que poner otros 15… quiero
// ver lo que ha salido de mi bolsillo, lo que voy retirando y el ROI sobre lo que he puesto»).
// Meter = dinero de su bolsillo al bankroll del método; retirar = del bankroll a su bolsillo. Ninguno es ganancia ni pérdida.
// El bankroll que vale es el de la app, NO el saldo de bet365 (Javi echa allí otras apuestas fuera del método).
export default function Dinero({ temporada, r, tipoInicial, onVolver, onGuardar, onBorrar }) {
  const [tipo, setTipo] = useState(tipoInicial || "ingreso");
  const [importe, setImporte] = useState(String(temporada.stake || 15));
  const [fecha, setFecha] = useState(hoy());
  const [nota, setNota] = useState("");
  const [hecho, setHecho] = useState(false);
  const [borrar, setBorrar] = useState(null);
  const cantidad = parseFloat(String(importe).replace(",", "."));
  const demasiado = tipo === "retirada" && cantidad > r.disponible + 0.005;   // no se puede sacar más de lo que hay libre
  const valido = cantidad > 0 && fecha && !demasiado;
  const movs = [...(temporada.movimientos || []), ...(r.recargas || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

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
      <div className="explica">Lo que pones de tu bolsillo y lo que te llevas. No es ni ganancia ni pérdida. Si al echar una apuesta no te llega, la app cuenta que metes su stake (recarga automática); si metiste otra cantidad, apúntala aquí y la automática desaparece.</div>

      <div className="dinero" style={{ padding: "4px 0 0" }}>
        <div><span className="etiqueta">Has puesto</span><b>{r.puesto.toFixed(2)}<small> €</small></b>{r.recargado > 0 && <span className="pie">{r.recargado.toFixed(2)} € en recargas</span>}</div>
        <div><span className="etiqueta">Retirado</span><b>{r.retirado.toFixed(2)}<small> €</small></b></div>
        <div><span className="etiqueta">Disponible</span><b className="ambar">{r.disponible.toFixed(2)}<small> €</small></b>{r.comprometido > 0 && <span className="pie">+ {r.comprometido.toFixed(2)} € en juego</span>}</div>
        <div><span className="etiqueta">Resultado</span><b className={r.neto > 0 ? "pos" : r.neto < 0 ? "neg" : ""}>{masmenos(r.neto)}<small> €</small></b></div>
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
      {demasiado && <div className="error" style={{ marginBottom: 10 }}>Solo hay {r.disponible.toFixed(2)} € libres para retirar.</div>}
      <button className={`boton ${hecho ? "hecho" : ""}`} disabled={!valido} onClick={guardar}>{hecho ? "✓ Apuntado" : tipo === "ingreso" ? "Apuntar que meto" : "Apuntar que retiro"}</button>

      <div className="seccion" style={{ padding: "22px 0 8px", borderBottom: "1px solid var(--linea)" }}>
        <span className="etiqueta">Movimientos</span>
        <span className="etiqueta">€</span>
      </div>
      {movs.map((m) => (
        <button key={m.id} className="linea" style={{ padding: "10px 0" }} onClick={() => (m.auto ? null : borrar === m.id ? onBorrar(m.id) : setBorrar(m.id))}>
          <span className="f">{fechaCorta(m.fecha)}</span>
          <span className="texto">
            <div className="desc">{m.auto ? "Recarga automática" : m.tipo === "retirada" ? "Retiras" : "Metes"}{m.nota ? ` · ${m.nota}` : ""}</div>
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

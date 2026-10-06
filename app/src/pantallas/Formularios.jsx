import { useRef, useState } from "react";
import { estado, beneficio } from "../datos/calculos.js";
import { leerFoto, leerTexto, claveDS, claveGemini } from "../datos/ia.js";
import { hoy, fechaCorta, signo, nuevoId } from "../datos/util.js";
import { Insignia } from "../piezas/comunes.jsx";

const RESULTADOS = ["pending", "win", "loss", "cashout"];

function ElegirResultado({ valor, onChange, pl }) {
  return (
    <div className="opciones">
      {RESULTADOS.map((r) => {
        const e = estado({ result: r, pl: r === valor ? pl : null });
        return (
          <button key={r} className={`opcion r-${e.clave} ${valor === r ? "activa" : ""}`} onClick={() => onChange(r)}>
            {e.icono} {e.texto}
          </button>
        );
      })}
    </div>
  );
}

function Retorno({ resultado, retorno, setRetorno, pl, cuota, stake }) {
  if (resultado === "loss" || resultado === "pending") return null;
  const lleno = stake && cuota ? (stake * cuota).toFixed(2) : "";
  return (
    <div className="campo">
      <span className="etiqueta">Lo que te devolvió la casa (€)</span>
      <input className="entrada grande" type="number" inputMode="decimal" step="0.01" value={retorno} onChange={(e) => setRetorno(e.target.value)} placeholder={resultado === "win" ? lleno : "ej: 22.40"} />
      {resultado === "win" && retorno === "" && lleno && (
        <button className="enlace" style={{ marginTop: 8 }} onClick={() => setRetorno(lleno)}>
          Poner {lleno} € (stake × cuota)
        </button>
      )}
      {pl != null && <div className={`mono ${pl >= 0 ? "pos" : "neg"}`} style={{ marginTop: 7, fontSize: 13 }}>Beneficio: {signo(pl)}</div>}
    </div>
  );
}

function DatosApuesta({ d, set }) {
  return (
    <>
      <div className="dos campo">
        <div><span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Fecha</span><input className="entrada mono" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div>
          <span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Tipo</span>
          <div className="opciones">
            {["Simple", "Combinada"].map((t) => (
              <button key={t} className={`opcion ${d.type === t ? "activa" : ""}`} style={{ padding: "10px 4px", fontSize: 12 }} onClick={() => set({ type: t })}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="campo">
        <span className="etiqueta">Apuesta / patas</span>
        <textarea className="entrada" rows={3} value={d.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="ej: Betis gana (1.85) × Over 2.5 Girona/Celta (1.90)" />
      </div>
      <div className="dos campo">
        <div><span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Cuota</span><input className="entrada mono" type="number" inputMode="decimal" step="0.01" value={d.odds} onChange={(e) => set({ odds: e.target.value })} placeholder="3.50" /></div>
        <div><span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Stake €</span><input className="entrada mono" type="number" inputMode="decimal" step="0.5" value={d.stake} onChange={(e) => set({ stake: e.target.value })} /></div>
      </div>
    </>
  );
}

export function Detalle({ bet, onVolver, onGuardar, onBorrar }) {
  const [d, setD] = useState({ ...bet, odds: String(bet.odds), stake: String(bet.stake) });
  const [retorno, setRetorno] = useState(bet.result !== "pending" && bet.result !== "loss" && bet.pl != null ? (bet.stake + bet.pl).toFixed(2) : "");
  const [editar, setEditar] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const stake = parseFloat(d.stake) || 0;
  const pl = beneficio(d.result, stake, retorno);
  const set = (x) => setD({ ...d, ...x });
  const valido = d.desc.trim() && parseFloat(d.odds) > 0 && stake > 0 && (d.result === "pending" || d.result === "loss" || pl != null);
  const guardar = () => {
    if (!valido) return;
    onGuardar({ ...bet, ...d, odds: parseFloat(d.odds), stake, pl: d.result === "pending" ? null : pl });
    setHecho(true);
    setTimeout(onVolver, 450);
  };
  const e = estado(bet);
  return (
    <div className="scroll pad">
      <button className="volver" onClick={onVolver}>← Volver</button>
      {!editar ? (
        <div className="caja">
          <div className="entre" style={{ marginBottom: 6 }}>
            <span className="etiqueta">{fechaCorta(bet.date)} · {bet.type}</span>
            <Insignia c={e.clave}>{e.texto}</Insignia>
          </div>
          <div className="copiable" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{bet.desc}</div>
          <div className="entre">
            <div className="fila"><Insignia>@{bet.odds}</Insignia><Insignia>{bet.stake} € stake</Insignia></div>
            <button className="enlace" onClick={() => setEditar(true)}>Corregir datos</button>
          </div>
        </div>
      ) : (
        <DatosApuesta d={d} set={set} />
      )}
      <div className="campo">
        <span className="etiqueta">Resultado</span>
        <ElegirResultado valor={d.result} pl={pl} onChange={(r) => set({ result: r })} />
      </div>
      <Retorno resultado={d.result} retorno={retorno} setRetorno={setRetorno} pl={pl} cuota={parseFloat(d.odds)} stake={stake} />
      <div className="campo">
        <span className="etiqueta">Notas</span>
        <textarea className="entrada" rows={3} value={d.notes} onChange={(ev) => set({ notes: ev.target.value })} />
      </div>
      <button className={`boton ${hecho ? "hecho" : ""}`} disabled={!valido} onClick={guardar}>{hecho ? "✓ Guardado" : "Guardar"}</button>
      <button className="boton peligro" style={{ marginTop: 12 }} onClick={() => (borrar ? onBorrar(bet.id) : setBorrar(true))}>
        {borrar ? "Pulsa otra vez para borrarla del todo" : bet.result === "pending" ? "Cancelar apuesta" : "Borrar apuesta"}
      </button>
      <div className="hueco" />
    </div>
  );
}

export function NuevaApuesta({ temporada, onVolver, onGuardar }) {
  const [d, setD] = useState({ date: hoy(), type: "Combinada", desc: "", odds: "", stake: String(temporada.stake || 15), result: "pending", notes: "" });
  const [retorno, setRetorno] = useState("");
  const [modo, setModo] = useState("manual");
  const [texto, setTexto] = useState("");
  const [ia, setIa] = useState({ cargando: false, error: null });
  const [hecho, setHecho] = useState(false);
  const foto = useRef(null);
  const set = (x) => setD((v) => ({ ...v, ...x }));
  const stake = parseFloat(d.stake) || 0;
  const pl = beneficio(d.result, stake, retorno);
  const valido = d.desc.trim() && parseFloat(d.odds) > 0 && stake > 0 && (d.result === "pending" || d.result === "loss" || pl != null);

  const rellenar = (x) => {
    set({
      type: x.type === "Simple" ? "Simple" : "Combinada",
      desc: x.desc || "",
      odds: x.odds ? String(x.odds) : "",
      stake: x.stake ? String(x.stake) : d.stake,
      date: /^\d{4}-\d{2}-\d{2}$/.test(x.date || "") ? x.date : d.date,
      notes: x.notes || "",
    });
    setModo("manual");
  };
  const conIA = async (fn) => {
    setIa({ cargando: true, error: null });
    try {
      rellenar(await fn());
      setIa({ cargando: false, error: null });
    } catch (e) {
      setIa({ cargando: false, error: e.message });
    }
  };
  const alFoto = (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    if (!claveGemini()) return setIa({ cargando: false, error: "Falta la clave de Gemini: Ajustes → IA" });
    conIA(() => leerFoto(f, temporada.stake)).finally(() => { if (foto.current) foto.current.value = ""; });
  };
  const alTexto = () => {
    if (!texto.trim()) return;
    if (!claveDS()) return setIa({ cargando: false, error: "Falta la clave de DeepSeek: Ajustes → IA" });
    conIA(() => leerTexto(texto, temporada.stake));
  };
  const guardar = () => {
    if (!valido) return;
    onGuardar({ id: nuevoId(), ...d, odds: parseFloat(d.odds), stake, pl: d.result === "pending" ? null : pl });
    setHecho(true);
    setTimeout(onVolver, 450);
  };

  return (
    <div className="scroll pad">
      <button className="volver" onClick={onVolver}>← Volver</button>
      <div className="titulo" style={{ marginBottom: 14 }}>Nueva apuesta</div>
      <div className="opciones tres campo">
        {[["manual", "✎ A mano"], ["foto", "📷 Captura"], ["texto", "💬 Escrita"]].map(([id, txt]) => (
          <button key={id} className={`opcion ${modo === id ? "activa" : ""}`} onClick={() => setModo(id)}>{txt}</button>
        ))}
      </div>
      {modo === "foto" && (
        <div className="caja" style={{ textAlign: "center", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Sube la captura de la apuesta</div>
          <div className="explica" style={{ marginBottom: 12 }}>Bet365, Betfair… La IA saca las patas, cuotas y stake.</div>
          <input ref={foto} id="kb-foto" type="file" accept="image/*" onChange={alFoto} style={{ display: "none" }} />
          <label htmlFor="kb-foto" className="boton" style={{ display: "inline-block", width: "auto", padding: "10px 22px" }}>{ia.cargando ? "Leyendo…" : "Elegir imagen"}</label>
        </div>
      )}
      {modo === "texto" && (
        <div className="caja">
          <textarea className="entrada" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ej: combinada Betis gana a 1.85 y over 2.5 del Girona a 1.90, 15 euros" style={{ marginBottom: 10 }} />
          <button className="boton" disabled={!texto.trim() || ia.cargando} onClick={alTexto}>{ia.cargando ? "Leyendo…" : "Rellenar con IA"}</button>
        </div>
      )}
      {ia.cargando && <div className="cargando" style={{ marginBottom: 14 }} />}
      {ia.error && <div className="error">{ia.error}</div>}
      <DatosApuesta d={d} set={set} />
      <div className="campo">
        <span className="etiqueta">Resultado</span>
        <ElegirResultado valor={d.result} pl={pl} onChange={(r) => set({ result: r })} />
      </div>
      <Retorno resultado={d.result} retorno={retorno} setRetorno={setRetorno} pl={pl} cuota={parseFloat(d.odds)} stake={stake} />
      <div className="campo">
        <span className="etiqueta">Notas</span>
        <textarea className="entrada" rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <button className={`boton ${hecho ? "hecho" : ""}`} disabled={!valido} onClick={guardar}>{hecho ? "✓ Guardada" : "Guardar apuesta"}</button>
      <div className="hueco" />
    </div>
  );
}

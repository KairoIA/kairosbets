import { useRef, useState } from "react";
import { claveDS, claveGemini, ponerClaves } from "../datos/ia.js";

function Clave({ etiqueta, valor, set, ayuda, placeholder, id }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="campo">
      <label className="etiqueta" htmlFor={id}>{etiqueta}</label>
      <div style={{ position: "relative" }}>
        <input id={id} className="entrada mono" style={{ fontSize: 12, paddingRight: 64 }} type={ver ? "text" : "password"} value={valor} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
        <button className="tenue" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10 }} onClick={() => setVer(!ver)}>{ver ? "OCULTAR" : "VER"}</button>
      </div>
      <div className="tenue" style={{ fontSize: 10.5, marginTop: 6 }}>{ayuda}</div>
    </div>
  );
}

// Todo se guarda en el móvil (Javi, 05-oct-2026: «paso de excels»). Desde aquí sale a Excel cuando quiera.
export default function Ajustes({ temporada, onVolver, onExcel, onExportar, onImportar, onTraer, onRenombrar, onTemporadas }) {
  const [ds, setDs] = useState(claveDS());
  const [gem, setGem] = useState(claveGemini());
  const [clavesOk, setClavesOk] = useState(false);
  const [nombre, setNombre] = useState(temporada?.nombre || "");
  const [stake, setStake] = useState(String(temporada?.stake || ""));
  const [msg, setMsg] = useState(null);
  const archivo = useRef(null);
  const compartir = typeof navigator !== "undefined" && !!navigator.canShare;

  const alImportar = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      await onImportar(await f.text());
      setMsg({ ok: "Copia cargada." });
    } catch (e) {
      setMsg({ error: e.message });
    }
    ev.target.value = "";
  };

  return (
    <div className="scroll pad">
      <button className="volver" onClick={onVolver}>← Volver</button>
      <div className="titulo" style={{ marginBottom: 16 }}>Ajustes</div>

      <div className="caja">
        <b className="caja-titulo">Exportar a Excel</b>
        <div className="explica" style={{ marginBottom: 12 }}>
          Todas las temporadas en un .xlsx: una pestaña de resumen y otra por temporada con cada apuesta. Se abre en Excel o en Google Sheets.
        </div>
        <div className={compartir ? "dos" : ""}>
          <button className="boton" onClick={() => onExcel(false)}>Descargar Excel</button>
          {compartir && <button className="boton suave" onClick={() => onExcel(true)}>Compartir</button>}
        </div>
      </div>

      {temporada && (
        <div className="caja">
          <b className="caja-titulo">Temporada en curso</b>
          <div className="dos campo">
            <div><label className="etiqueta" htmlFor="aj-nombre" style={{ display: "block", marginBottom: 8 }}>Nombre</label><input id="aj-nombre" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div><label className="etiqueta" htmlFor="aj-stake" style={{ display: "block", marginBottom: 8 }}>Stake habitual €</label><input id="aj-stake" className="entrada mono" type="number" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} /></div>
          </div>
          <button className="boton suave" disabled={!nombre.trim() || !(parseFloat(stake) > 0)} onClick={() => { onRenombrar(nombre.trim(), parseFloat(stake)); setMsg({ ok: "Temporada actualizada." }); }}>Guardar cambios</button>
          <button className="boton suave" style={{ marginTop: 10 }} onClick={onTemporadas}>Ver temporadas · cerrar esta y empezar otra</button>
        </div>
      )}

      <div className="caja">
        <b className="caja-titulo">Copia de seguridad</b>
        <div className="explica" style={{ marginBottom: 12 }}>
          Tus apuestas viven solo en este móvil. Esta copia sirve para pasarlas a otro móvil o recuperarlas si se borran los datos de la app. Guárdala en Drive o mándatela por Telegram de vez en cuando.
        </div>
        {msg?.error && <div className="error">{msg.error}</div>}
        {msg?.ok && <div className="ok-msg">{msg.ok}</div>}
        <div className="dos">
          <button className="boton suave" onClick={onExportar}>Guardar copia</button>
          <button className="boton suave" onClick={() => archivo.current?.click()}>Cargar copia</button>
        </div>
        <button className="enlace" style={{ marginTop: 12 }} onClick={() => onTraer().then((n) => setMsg({ ok: `Traídas ${n} temporadas. Cargando…` })).catch((e) => setMsg({ error: e.message }))}>
          Traer los datos de la dirección anterior (kairoia.github.io)
        </button>
        <input ref={archivo} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={alImportar} />
      </div>

      <div className="caja">
        <b className="caja-titulo">IA</b>
        <Clave id="aj-ds" etiqueta="Clave de DeepSeek" valor={ds} set={setDs} placeholder="sk-…" ayuda="Análisis, crónica y apuestas escritas." />
        <Clave id="aj-gem" etiqueta="Clave de Gemini" valor={gem} set={setGem} placeholder="AIza…" ayuda="Leer capturas de apuestas." />
        <button className={`boton ${clavesOk ? "hecho" : ""}`} onClick={() => { ponerClaves(ds, gem); setClavesOk(true); setTimeout(() => setClavesOk(false), 1500); }}>{clavesOk ? "✓ Guardadas" : "Guardar claves"}</button>
        <div className="tenue" style={{ fontSize: 10.5, marginTop: 8 }}>Se guardan solo en este móvil.</div>
      </div>
      <div className="tenue" style={{ fontSize: 10, textAlign: "center", marginTop: 6, letterSpacing: 1 }}>KAIROSBETS · VERSIÓN 2 (OCT-2026)</div>
      <div className="hueco" />
    </div>
  );
}

import { useRef, useState } from "react";
import { urlHoja, ponerUrlHoja, urlValida, probar } from "../datos/hoja.js";
import { claveDS, claveGemini, ponerClaves } from "../datos/ia.js";

function Clave({ etiqueta, valor, set, ayuda, placeholder }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="campo">
      <span className="etiqueta">{etiqueta}</span>
      <div style={{ position: "relative" }}>
        <input className="entrada mono" style={{ fontSize: 13, paddingRight: 64 }} type={ver ? "text" : "password"} value={valor} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
        <button className="tenue" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11 }} onClick={() => setVer(!ver)}>{ver ? "OCULTAR" : "VER"}</button>
      </div>
      <div className="tenue" style={{ fontSize: 11, marginTop: 6 }}>{ayuda}</div>
    </div>
  );
}

export default function Ajustes({ temporada, sync, onVolver, onSubirTodo, onRecuperar, onExportar, onImportar, onRenombrar, onTemporadas }) {
  const [url, setUrl] = useState(urlHoja());
  const [prueba, setPrueba] = useState(null);
  const [ds, setDs] = useState(claveDS());
  const [gem, setGem] = useState(claveGemini());
  const [clavesOk, setClavesOk] = useState(false);
  const [nombre, setNombre] = useState(temporada?.nombre || "");
  const [stake, setStake] = useState(String(temporada?.stake || ""));
  const [recuperar, setRecuperar] = useState(false);
  const [msg, setMsg] = useState(null);
  const archivo = useRef(null);

  const guardarHoja = async () => {
    if (url && !urlValida(url)) return setPrueba({ error: "Esa dirección no es la de una aplicación web de Google (tiene que acabar en /exec)." });
    ponerUrlHoja(url);
    if (!url) return setPrueba({ ok: "Hoja quitada: la app ya no hace copia." });
    setPrueba({ cargando: true });
    try {
      await probar();
      setPrueba({ ok: "Conectada. Subiendo tus temporadas…" });
      const r = await onSubirTodo();
      setPrueba(r.ok ? { ok: "Conectada y con todo copiado." } : { error: "Conecta, pero no pudo subir: " + r.error });
    } catch (e) {
      setPrueba({ error: e.message });
    }
  };

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
        <div className="entre" style={{ marginBottom: 10 }}>
          <b className="caja-titulo" style={{ marginBottom: 0 }}>Copia en la Hoja</b>
          <span className={`sync ${sync.estado}`}><i />{sync.texto}</span>
        </div>
        <div className="explica" style={{ marginBottom: 12 }}>
          Cada cambio se copia a tu Hoja (una pestaña por temporada). Si falla, la app lo dice y lo reintenta. La dirección se guarda solo en este móvil.
        </div>
        {sync.error && <div className="error">Último fallo: {sync.error}</div>}
        <div className="campo">
          <span className="etiqueta">Dirección de la Hoja (termina en /exec)</span>
          <input className="entrada mono" style={{ fontSize: 12 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
        </div>
        {prueba?.error && <div className="error">{prueba.error}</div>}
        {prueba?.ok && <div className="ok-msg">{prueba.ok}</div>}
        {prueba?.cargando && <div className="cargando" style={{ marginBottom: 12 }} />}
        <div className="dos">
          <button className="boton" onClick={guardarHoja}>Guardar y probar</button>
          <button className="boton suave" disabled={!urlHoja()} onClick={() => onSubirTodo().then((r) => setPrueba(r.ok ? { ok: "Todo copiado." } : { error: r.error }))}>Subir todo ahora</button>
        </div>
        {urlHoja() && (
          <button className="enlace" style={{ marginTop: 12 }} onClick={() => (recuperar ? (setRecuperar(false), onRecuperar().then(setMsg)) : setRecuperar(true))}>
            {recuperar ? "Pulsa otra vez: lo de la Hoja sustituye a lo de este móvil" : "Recuperar desde la Hoja (móvil nuevo o datos perdidos)"}
          </button>
        )}
      </div>

      <div className="caja">
        <b className="caja-titulo">Copia en un archivo</b>
        <div className="explica" style={{ marginBottom: 12 }}>Todas las temporadas en un archivo, por si acaso. Guárdalo en Drive o mándatelo por Telegram.</div>
        {msg?.error && <div className="error">{msg.error}</div>}
        {msg?.ok && <div className="ok-msg">{msg.ok}</div>}
        <div className="dos">
          <button className="boton suave" onClick={onExportar}>Exportar copia</button>
          <button className="boton suave" onClick={() => archivo.current?.click()}>Cargar copia</button>
        </div>
        <input ref={archivo} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={alImportar} />
      </div>

      {temporada && (
        <div className="caja">
          <b className="caja-titulo">Temporada en curso</b>
          <div className="dos campo">
            <div><span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Nombre</span><input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
            <div><span className="etiqueta" style={{ display: "block", marginBottom: 8 }}>Stake habitual €</span><input className="entrada mono" type="number" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} /></div>
          </div>
          <button className="boton suave" disabled={!nombre.trim() || !(parseFloat(stake) > 0)} onClick={() => { onRenombrar(nombre.trim(), parseFloat(stake)); setMsg({ ok: "Temporada actualizada." }); }}>Guardar cambios</button>
          <button className="boton suave" style={{ marginTop: 10 }} onClick={onTemporadas}>Ver temporadas · cerrar esta y empezar otra</button>
        </div>
      )}

      <div className="caja">
        <b className="caja-titulo">IA</b>
        <Clave etiqueta="Clave de DeepSeek" valor={ds} set={setDs} placeholder="sk-…" ayuda="Análisis, crónica y apuestas escritas." />
        <Clave etiqueta="Clave de Gemini" valor={gem} set={setGem} placeholder="AIza…" ayuda="Leer capturas de apuestas." />
        <button className={`boton ${clavesOk ? "hecho" : ""}`} onClick={() => { ponerClaves(ds, gem); setClavesOk(true); setTimeout(() => setClavesOk(false), 1500); }}>{clavesOk ? "✓ Guardadas" : "Guardar claves"}</button>
        <div className="tenue" style={{ fontSize: 11, marginTop: 8 }}>Se guardan solo en este móvil.</div>
      </div>
      <div className="tenue" style={{ fontSize: 11, textAlign: "center", marginTop: 6 }}>KairosBets · versión 2 (oct-2026)</div>
      <div className="hueco" />
    </div>
  );
}

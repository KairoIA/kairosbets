import { useEffect, useRef, useState } from "react";
import { estadoNube, alCambiarNube, haceCuanto } from "../datos/nube.js";

// Línea de estado de la copia en la nube (12-oct-2026)
function textoNube(e) {
  if (e.error === "sin emparejar") return { mal: true, txt: "Nube: este móvil no está emparejado. Pídele a Claude que abra el emparejamiento y vuelve a abrir la app." };
  if (e.error && e.ultima) return { mal: true, txt: `Nube: ${e.error}; se reintenta sola. Última copia ${haceCuanto(e.ultima)}.` };
  if (e.error) return { mal: true, txt: `Nube: ${e.error}; se reintenta sola.` };
  if (e.ultima) return { txt: `Nube: copia guardada ${haceCuanto(e.ultima)}.` };
  return { txt: "Nube: todavía sin copia (se hace sola al cambiar algo)." };
}

// Todo se guarda en el móvil (Javi, 05-oct-2026: «paso de excels»). Desde aquí sale a Excel cuando quiera.
export default function Ajustes({ temporada, onVolver, onExcel, onExportar, onImportar, onTraer, onRenombrar, onTemporadas }) {
  const [nombre, setNombre] = useState(temporada?.nombre || "");
  const [stake, setStake] = useState(String(temporada?.stake || ""));
  const [msg, setMsg] = useState(null);
  const archivo = useRef(null);
  const compartir = typeof navigator !== "undefined" && !!navigator.canShare;
  const [nube, setNube] = useState(estadoNube);
  useEffect(() => alCambiarNube(setNube), []);
  const lineaNube = textoNube(nube);

  const alImportar = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const r = await onImportar(await f.text());
      setMsg({ ok: r || "Copia cargada." });
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
        <div className="explica" style={{ marginBottom: 10 }}>
          Cada vez que cambias algo, la app guarda sola una copia en la nube (tu Cloudflare): Claude la ve desde el servidor y, si pierdes el móvil, la recuperas con un toque. Además puedes guardar una copia en un archivo. «Cargar copia» también acepta los paquetes de apuestas que prepara Claude: los añade a la temporada activa sin borrar nada.
        </div>
        <div className={lineaNube.mal ? "error" : "ok-msg"} style={{ marginBottom: 12 }}>{lineaNube.txt}</div>
        {msg?.error && <div className="error">{msg.error}</div>}
        {msg?.ok && <div className="ok-msg">{msg.ok}</div>}
        <div className="dos">
          <button className="boton suave" onClick={onExportar}>Guardar copia</button>
          <button className="boton suave" onClick={() => archivo.current?.click()}>Cargar copia o paquete</button>
        </div>
        <button className="enlace" style={{ marginTop: 12 }} onClick={() => onTraer().then((n) => setMsg({ ok: `Traídas ${n} temporadas. Cargando…` })).catch((e) => setMsg({ error: e.message }))}>
          Traer los datos de la dirección anterior (kairoia.github.io)
        </button>
        <input ref={archivo} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={alImportar} />
      </div>

      <div className="tenue" style={{ fontSize: 10, textAlign: "center", marginTop: 6, letterSpacing: 1 }}>KAIROSBETS · VERSIÓN 2 (OCT-2026)</div>
      <div className="hueco" />
    </div>
  );
}

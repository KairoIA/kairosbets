import { useEffect, useMemo, useRef, useState } from "react";
import { cargar, guardarApuestas, guardarTemporadas, siguienteId, exportar, importar, limpiar, leerPaqueteDeURL, fusionarPaquete } from "./datos/almacen.js";
import { conBankroll, resumen } from "./datos/calculos.js";
import { libroExcel } from "./datos/excel.js";
import { traerDeAnterior, guardarTraspaso } from "./datos/traspaso.js";
import { hoy } from "./datos/util.js";
import { LOGO } from "./piezas/comunes.jsx";
import Inicio from "./pantallas/Inicio.jsx";
import { PestanaGrafica, PestanaHistorial } from "./pantallas/Graficas.jsx";
import PestanaIA from "./pantallas/IA.jsx";
import { Detalle, NuevaApuesta } from "./pantallas/Formularios.jsx";
import { ListaTemporadas, EmpezarTemporada } from "./pantallas/Temporadas.jsx";
import Ajustes from "./pantallas/Ajustes.jsx";

export const VERSION = "2.0 · oct-2026";
const PESTANAS = [
  { id: "inicio", txt: "Inicio", ico: "◆" },
  { id: "grafica", txt: "Gráfica", ico: "∿" },
  { id: "historial", txt: "Historial", ico: "≡" },
  { id: "ia", txt: "IA", ico: "✦" },
];

// Botón de la primera vez: trae lo que había en la dirección anterior
function Traer({ onTraer }) {
  const [estado, setEstado] = useState(null);
  const pulsar = async () => {
    setEstado({ cargando: true });
    try {
      const n = await onTraer();
      setEstado({ ok: `Listo: ${n} temporada${n === 1 ? "" : "s"}. Cargando…` });
    } catch (e) {
      setEstado({ error: e.message });
    }
  };
  return (
    <>
      {estado?.error && <div className="error">{estado.error}</div>}
      {estado?.ok && <div className="ok-msg">{estado.ok}</div>}
      <button className="boton" disabled={estado?.cargando} onClick={pulsar}>{estado?.cargando ? "Trayendo tus datos…" : "Traer mis datos de la dirección anterior"}</button>
    </>
  );
}

export default function App() {
  const [datos, setDatos] = useState(() => cargar());
  const [verId, setVerId] = useState(() => datos.temporadas?.activa || null);
  const [tab, setTab] = useState("inicio");
  const [vista, setVista] = useState(null);
  // Enlace de Kaira con una apuesta ya lista para fusionar (07-oct-2026): se procesa una sola vez al
  // abrir, se enseña un aviso con el resultado y se limpia el hash para que un refresco no la repita.
  const [avisoPaquete, setAvisoPaquete] = useState(null);
  useEffect(() => {
    const paquete = leerPaqueteDeURL();
    if (!paquete) return;
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const r = fusionarPaquete(paquete);
      setDatos(r);
      setVerId(r.temporadas.activa);
      setAvisoPaquete({ ok: r.mensaje });
    } catch (e) {
      setAvisoPaquete({ error: e.message });
    }
  }, []);
  const temporadas = datos.temporadas;
  const activa = temporadas?.lista.find((t) => t.id === temporadas.activa);
  const temporada = temporadas?.lista.find((t) => t.id === verId) || activa;
  const archivo = !!temporada && temporada.id !== temporadas?.activa;
  const crudas = (temporada && datos.apuestas[temporada.id]) || [];
  const bets = useMemo(() => (temporada ? conBankroll(crudas, temporada.bankrollInicial) : []), [crudas, temporada]);
  const r = useMemo(() => (temporada ? resumen(crudas, temporada.bankrollInicial) : null), [crudas, temporada]);

  function ponerApuestas(id, lista) {
    const limpias = lista.map(limpiar);
    guardarApuestas(id, limpias);
    setDatos((d) => ({ ...d, apuestas: { ...d.apuestas, [id]: limpias } }));
  }
  const cambiarApuesta = (b) => ponerApuestas(temporada.id, crudas.map((x) => (x.id === b.id ? b : x)));
  const borrarApuesta = (id) => { ponerApuestas(temporada.id, crudas.filter((x) => x.id !== id)); setVista(null); };
  const liquidar = (b, result, pl) => cambiarApuesta({ ...b, result, pl });

  function ponerTemporadas(t) {
    guardarTemporadas(t);
    setDatos((d) => ({ ...d, temporadas: t }));
  }

  function empezarTemporada({ nombre, bankrollInicial, stake }) {
    const t = temporadas || { activa: null, lista: [] };
    const id = siguienteId(t);
    const lista = t.lista.map((x) => (x.id === t.activa ? { ...x, archivada: true, fin: hoy() } : x));
    lista.push({ id, nombre, inicio: hoy(), fin: null, bankrollInicial, stake, archivada: false });
    guardarApuestas(id, []);
    setDatos((d) => ({ ...d, apuestas: { ...d.apuestas, [id]: [] } }));
    ponerTemporadas({ activa: id, lista });
    setVerId(id);
    setTab("inicio");
    setVista(null);
  }

  function renombrar(nombre, stake) {
    ponerTemporadas({ ...temporadas, lista: temporadas.lista.map((x) => (x.id === temporadas.activa ? { ...x, nombre, stake } : x)) });
  }

  // Guarda un archivo en el móvil (Descargas). Con «compartir», abre el menú de Android (Drive, Telegram…)
  async function entregar(blob, nombre, compartir) {
    const archivo = new File([blob], nombre, { type: blob.type });
    if (compartir && navigator.canShare?.({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], title: nombre }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const bajarExcel = (compartir) => entregar(libroExcel(datos.temporadas, datos.apuestas), `KairosBets_${hoy()}.xlsx`, compartir);
  const bajarCopia = () => entregar(new Blob([exportar(datos.temporadas, datos.apuestas)], { type: "application/json" }), `kairosbets_copia_${hoy()}.json`);

  // Traer temporadas, apuestas y claves de la dirección anterior (kairoia.github.io); ver datos/traspaso.js
  async function traer() {
    const n = guardarTraspaso(await traerDeAnterior());
    setTimeout(() => location.reload(), 300);
    return n;
  }

  async function cargarCopia(texto) {
    const d = importar(texto);
    setDatos(d);
    setVerId(d.temporadas.activa);
    return d.mensaje;          // solo los paquetes de apuestas traen mensaje (cuántas nuevas / actualizadas)
  }

  // Deslizar entre pestañas (no si el dedo empieza en los filtros o en la gráfica)
  const toque = useRef(null);
  // Páginas fijas (Javi, 06-oct): no siguen al dedo. Al soltar, si el gesto fue claramente lateral (más de 60 px
  // y bastante más de lado que de arriba abajo) se pasa de página encajada; si fue para bajar, no se mueve nada.
  const idx = PESTANAS.findIndex((p) => p.id === tab);
  const alEmpezar = (e) => {
    const t = e.touches[0];
    toque.current = e.target.closest(".filtros, input, textarea") ? null : { x: t.clientX, y: t.clientY };
  };
  const alSoltar = (e) => {
    const ini = toque.current;
    toque.current = null;
    if (!ini) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x, dy = t.clientY - ini.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && idx < PESTANAS.length - 1) setTab(PESTANAS[idx + 1].id);
    if (dx > 0 && idx > 0) setTab(PESTANAS[idx - 1].id);
  };

  const ajustes = (
    <Ajustes temporada={activa} onVolver={() => setVista(null)} onExcel={bajarExcel} onExportar={bajarCopia} onImportar={cargarCopia} onTraer={traer}
      onRenombrar={renombrar} onTemporadas={() => setVista({ tipo: "temporadas" })} />
  );

  // Sin temporadas: primera vez (o móvil nuevo)
  if (!temporadas) {
    return (
      <div className="app">
        {vista?.tipo === "ajustes" ? ajustes : (
          <div className="scroll">
            <div className="pad" style={{ paddingBottom: 4 }}>
              <div className="titulo">KairosBets, casa nueva</div>
              <div className="explica">¿Ya usabas KairosBets? Trae tus temporadas, apuestas y claves de IA de la dirección anterior con un toque. Hazlo desde Chrome, antes de instalar la app.</div>
              <Traer onTraer={traer} />
              <button className="enlace" style={{ marginTop: 12 }} onClick={() => setVista({ tipo: "ajustes" })}>O carga una copia de seguridad</button>
            </div>
            <div className="sep" style={{ margin: "18px 0 0" }} />
            <EmpezarTemporada primera siguienteNombre="Temporada 1" onEmpezar={empezarTemporada} />
          </div>
        )}
      </div>
    );
  }

  const detalle = vista?.tipo === "detalle" && bets.find((b) => b.id === vista.id);
  if (vista?.tipo === "detalle" && !detalle) setTimeout(() => setVista(null));   // la apuesta ya no existe
  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <img src={LOGO} width="32" height="32" alt="" />
          <div>
            <div className="nombre">KAIROSBETS</div>
            <button className="chip-temporada" onClick={() => setVista({ tipo: "temporadas" })}>{temporada.nombre}</button>
          </div>
        </div>
        <div className="fila" style={{ gap: 12 }}>
          <button className="engranaje" onClick={() => setVista({ tipo: "ajustes" })} aria-label="Ajustes">⚙</button>
        </div>
      </header>
      {archivo && !vista && (
        <div className="aviso-archivo">
          <span>Archivo · {temporada.nombre}</span>
          <button onClick={() => setVerId(temporadas.activa)}>Volver a {activa.nombre}</button>
        </div>
      )}
      {avisoPaquete && !vista && (
        <div className={avisoPaquete.error ? "error" : "ok-msg"} style={{ margin: "10px 14px 0" }}>
          {avisoPaquete.error || avisoPaquete.ok}
          <button className="enlace" style={{ marginLeft: 10 }} onClick={() => setAvisoPaquete(null)}>Vale</button>
        </div>
      )}

      {!vista && (
        <div className="carril" onTouchStart={alEmpezar} onTouchEnd={alSoltar}>
          <div className="tira" style={{ width: `${PESTANAS.length * 100}%`, transform: `translateX(-${idx * (100 / PESTANAS.length)}%)` }}>
            {PESTANAS.map((p) => (
              <div key={p.id} className="panel" style={{ width: `${100 / PESTANAS.length}%` }}>
                {p.id === "inicio" && <Inicio temporada={temporada} bets={bets} r={r} archivo={archivo} onBet={(b) => setVista({ tipo: "detalle", id: b.id })} onLiquidar={liquidar} />}
                {p.id === "grafica" && <PestanaGrafica temporada={temporada} bets={bets} r={r} onBet={(b) => setVista({ tipo: "detalle", id: b.id })} />}
                {p.id === "historial" && <PestanaHistorial bets={bets} onBet={(b) => setVista({ tipo: "detalle", id: b.id })} />}
                {p.id === "ia" && <PestanaIA bets={bets} onAjustes={() => setVista({ tipo: "ajustes" })} />}
              </div>
            ))}
          </div>
        </div>
      )}
      {!vista && tab === "inicio" && !archivo && <button className="mas" onClick={() => setVista({ tipo: "nueva" })} aria-label="Nueva apuesta">+</button>}
      {!vista && (
        <nav className="barra">
          {PESTANAS.map((p) => (
            <button key={p.id} className={tab === p.id ? "activa" : ""} onClick={() => setTab(p.id)}>
              {p.txt}
            </button>
          ))}
        </nav>
      )}

      {detalle && <Detalle key={detalle.id} bet={detalle} onVolver={() => setVista(null)} onGuardar={cambiarApuesta} onBorrar={borrarApuesta} />}
      {vista?.tipo === "nueva" && <NuevaApuesta temporada={activa} onVolver={() => setVista(null)} onGuardar={(b) => ponerApuestas(activa.id, [...(datos.apuestas[activa.id] || []), b])} />}
      {vista?.tipo === "ajustes" && ajustes}
      {vista?.tipo === "temporadas" && (
        <ListaTemporadas temporadas={temporadas} apuestas={datos.apuestas} viendo={temporada.id} onVolver={() => setVista(null)}
          onVer={(id) => { setVerId(id); setTab("inicio"); setVista(null); }} onCerrar={() => setVista({ tipo: "empezar" })} onExcel={bajarExcel} />
      )}
      {vista?.tipo === "empezar" && (
        <EmpezarTemporada actual={activa} apuestasActual={datos.apuestas[activa.id] || []} siguienteNombre={`Temporada ${temporadas.lista.length + 1}`}
          onVolver={() => setVista({ tipo: "temporadas" })} onEmpezar={empezarTemporada} />
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cargar, guardarApuestas, guardarTemporadas, siguienteId, exportar, importar, limpiar } from "./datos/almacen.js";
import { conBankroll, resumen } from "./datos/calculos.js";
import { urlHoja, ponerUrlHoja, urlValida, marcarPendiente, pendientes, subirPendientes, bajarTodo } from "./datos/hoja.js";
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

function estadoSync(extra = {}) {
  if (!urlHoja()) return { estado: "sin-hoja", texto: "Sin copia" };
  if (extra.subiendo) return { estado: "subiendo", texto: "Copiando" };
  if (extra.error || pendientes().length) return { estado: "error", texto: "Sin copiar", error: extra.error };
  return { estado: "ok", texto: "Copiado" };
}

export default function App() {
  const [datos, setDatos] = useState(() => cargar());
  const [verId, setVerId] = useState(() => datos.temporadas?.activa || null);
  const [tab, setTab] = useState("inicio");
  const [vista, setVista] = useState(null);
  const [sync, setSync] = useState(() => estadoSync());
  const datosRef = useRef(datos);
  datosRef.current = datos;
  const reloj = useRef(null);

  const subir = useCallback(async () => {
    if (!urlHoja()) return setSync(estadoSync());
    if (!pendientes().length) return setSync(estadoSync());
    setSync(estadoSync({ subiendo: true }));
    const { temporadas, apuestas } = datosRef.current;
    const r = temporadas ? await subirPendientes(temporadas, apuestas) : { ok: true };
    setSync(estadoSync({ error: r.ok ? null : r.error }));
    return r;
  }, []);

  const programar = useCallback(() => {
    clearTimeout(reloj.current);
    reloj.current = setTimeout(subir, 1200);
  }, [subir]);

  // Enlace de configuración …/#hoja=<dirección> (se lo manda Claude por Telegram), reintentos al volver la red
  useEffect(() => {
    const m = location.hash.match(/hoja=([^&]+)/);
    if (m) {
      const u = decodeURIComponent(m[1]);
      if (urlValida(u)) {
        ponerUrlHoja(u);
        (datosRef.current.temporadas?.lista || []).forEach((t) => marcarPendiente(t.id));
      }
      history.replaceState(null, "", location.pathname + location.search);
    }
    subir();
    const otraVez = () => subir();
    window.addEventListener("online", otraVez);
    const cada = setInterval(() => pendientes().length && subir(), 60000);
    return () => { window.removeEventListener("online", otraVez); clearInterval(cada); };
  }, [subir]);

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
    marcarPendiente(id);
    programar();
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
    lista.forEach((x) => marcarPendiente(x.id));
    programar();
    setVerId(id);
    setTab("inicio");
    setVista(null);
  }

  function renombrar(nombre, stake) {
    ponerTemporadas({ ...temporadas, lista: temporadas.lista.map((x) => (x.id === temporadas.activa ? { ...x, nombre, stake } : x)) });
    marcarPendiente(temporadas.activa);
    programar();
  }

  async function recuperar() {
    try {
      const { seasons, apuestas } = await bajarTodo();
      if (!seasons.length) return { error: "La Hoja no tiene temporadas guardadas." };
      const activaH = [...seasons].reverse().find((s) => !s.archivada) || seasons[seasons.length - 1];
      seasons.forEach((s) => guardarApuestas(s.id, apuestas[s.id] || []));
      const t = { activa: activaH.id, lista: seasons };
      guardarTemporadas(t);
      setDatos(cargar());
      setVerId(activaH.id);
      return { ok: `Recuperadas ${seasons.length} temporadas desde la Hoja.` };
    } catch (e) {
      return { error: e.message };
    }
  }

  function bajarCopia() {
    const blob = new Blob([exportar(datos.temporadas, datos.apuestas)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kairosbets_copia_${hoy()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function cargarCopia(texto) {
    const d = importar(texto);
    setDatos(d);
    setVerId(d.temporadas.activa);
    d.temporadas.lista.forEach((t) => marcarPendiente(t.id));
    programar();
  }

  // Deslizar entre pestañas (no si el dedo empieza en los filtros o en la gráfica)
  const toque = useRef(null);
  const [arrastre, setArrastre] = useState(0);
  const idx = PESTANAS.findIndex((p) => p.id === tab);
  const alEmpezar = (e) => { toque.current = e.target.closest(".filtros, svg, input, textarea") ? null : e.touches[0].clientX; setArrastre(0); };
  const alMover = (e) => { if (toque.current !== null) setArrastre(e.touches[0].clientX - toque.current); };
  const alSoltar = () => {
    if (Math.abs(arrastre) > 60) {
      if (arrastre < 0 && idx < PESTANAS.length - 1) setTab(PESTANAS[idx + 1].id);
      if (arrastre > 0 && idx > 0) setTab(PESTANAS[idx - 1].id);
    }
    toque.current = null;
    setArrastre(0);
  };

  const ajustes = (
    <Ajustes temporada={activa} sync={sync} onVolver={() => setVista(null)} onSubirTodo={async () => { (temporadas?.lista || []).forEach((t) => marcarPendiente(t.id)); return (await subir()) || { ok: true }; }}
      onRecuperar={recuperar} onExportar={bajarCopia} onImportar={cargarCopia} onRenombrar={renombrar} onTemporadas={() => setVista({ tipo: "temporadas" })} />
  );

  // Sin temporadas: primera vez (o móvil nuevo)
  if (!temporadas) {
    return (
      <div className="app">
        {vista?.tipo === "ajustes" ? ajustes : (
          <>
            <EmpezarTemporada primera siguienteNombre="Temporada 1" onEmpezar={empezarTemporada} />
            <div className="pad" style={{ position: "absolute", bottom: 10, left: 0, right: 0 }}>
              <button className="boton suave" onClick={() => setVista({ tipo: "ajustes" })}>¿Ya tenías apuestas? Recupéralas desde la Hoja o una copia</button>
            </div>
          </>
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
          <button className={`sync ${sync.estado}`} onClick={() => setVista({ tipo: "ajustes" })} title={sync.error || ""}><i />{sync.texto}</button>
          <button className="engranaje" onClick={() => setVista({ tipo: "ajustes" })} aria-label="Ajustes">⚙</button>
        </div>
      </header>
      {archivo && !vista && (
        <div className="aviso-archivo">
          <span>Archivo · {temporada.nombre}</span>
          <button onClick={() => setVerId(temporadas.activa)}>Volver a {activa.nombre}</button>
        </div>
      )}

      {!vista && (
        <div className="carril" onTouchStart={alEmpezar} onTouchMove={alMover} onTouchEnd={alSoltar}>
          <div className="tira" style={{ width: `${PESTANAS.length * 100}%`, transform: `translateX(calc(-${idx * (100 / PESTANAS.length)}% + ${arrastre / PESTANAS.length}px))`, transition: arrastre === 0 ? "transform .3s cubic-bezier(.4,0,.2,1)" : "none" }}>
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
          onVer={(id) => { setVerId(id); setTab("inicio"); setVista(null); }} onCerrar={() => setVista({ tipo: "empezar" })} />
      )}
      {vista?.tipo === "empezar" && (
        <EmpezarTemporada actual={activa} apuestasActual={datos.apuestas[activa.id] || []} siguienteNombre={`Temporada ${temporadas.lista.length + 1}`}
          onVolver={() => setVista({ tipo: "temporadas" })} onEmpezar={empezarTemporada} />
      )}
    </div>
  );
}

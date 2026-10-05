import { useState } from "react";
import { Insignia, Sep } from "../piezas/comunes.jsx";
import { analizar, cronica, claveDS } from "../datos/ia.js";
import { fechaLarga, hoy } from "../datos/util.js";

const num = (n) => Number(n || 0);
const eur = (n) => (num(n) >= 0 ? "+" : "") + num(n).toFixed(2) + " €";

function Analisis({ d }) {
  const s = d.stats || {};
  const Mercados = ({ lista, clase }) =>
    (lista || []).map((m, i) => (
      <div key={i} className={`bloque ${clase}`}>
        <div className="entre" style={{ marginBottom: 4 }}>
          <b className="ellipsis" style={{ fontWeight: 500 }}>{m.mercado}</b>
          <div className="fila" style={{ gap: 4 }}><Insignia>{m.record}</Insignia><Insignia c={num(m.pl) >= 0 ? "win" : "loss"}>{eur(m.pl)}</Insignia></div>
        </div>
        <div className="tenue" style={{ fontSize: 12 }}>{m.nota}</div>
      </div>
    ));
  return (
    <div>
      <div className="caja" style={{ fontSize: 14, lineHeight: 1.6 }}>{d.resumen}</div>
      <div className="rejilla3">
        <div className="stat"><b className="pos">{s.winRate}</b><span>Acierto</span></div>
        <div className="stat"><b style={{ color: "var(--cian)" }}>{s.roi}</b><span>ROI</span></div>
        <div className="stat"><b className={num(s.totalPL) >= 0 ? "pos" : "neg"}>{eur(s.totalPL)}</b><span>P&L</span></div>
      </div>
      <div className="rejilla4">
        <div className="stat"><b>{s.totalBets}</b><span>Total</span></div>
        <div className="stat"><b className="pos">{s.wins}</b><span>Ganadas</span></div>
        <div className="stat"><b className="neg">{s.losses}</b><span>Perdidas</span></div>
        <div className="stat"><b style={{ color: "var(--oro)" }}>{num(s.avgOdds).toFixed(2)}</b><span>Cuota media</span></div>
      </div>
      <div className="subtitulo">Mejores mercados</div>
      <Mercados lista={d.mejoresMercados} clase="bien" />
      <div className="subtitulo">Mercados a mejorar</div>
      <Mercados lista={d.peoresMercados} clase="mal" />
      {d.ligas?.length > 0 && (
        <>
          <div className="subtitulo">Por liga</div>
          {d.ligas.map((l, i) => (
            <div key={i} className="bloque entre">
              <span className="ellipsis">{l.liga}</span>
              <div className="fila" style={{ gap: 4 }}><Insignia>{l.bets} ap</Insignia><Insignia c="win">{l.wins} G</Insignia><Insignia c={num(l.pl) >= 0 ? "win" : "loss"}>{eur(l.pl)}</Insignia></div>
            </div>
          ))}
        </>
      )}
      {d.diasSemana?.length > 0 && (
        <>
          <div className="subtitulo">Por día de la semana</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 6 }}>
            {d.diasSemana.map((x, i) => (
              <div key={i} className="stat"><b style={{ fontSize: 12 }}>{x.dia}</b><span>{x.bets} ap · {x.wins} G</span><b className={num(x.pl) >= 0 ? "pos" : "neg"} style={{ fontSize: 12, marginTop: 4 }}>{eur(x.pl)}</b></div>
            ))}
          </div>
        </>
      )}
      <div className="subtitulo">Rachas</div>
      <div className="bloque">{d.rachas}</div>
      <div className="subtitulo">Lo que se ve</div>
      {(d.insights || []).map((x, i) => <div key={i} className="bloque">{x}</div>)}
      <div className="subtitulo">Recomendaciones</div>
      {(d.recomendaciones || []).map((x, i) => <div key={i} className="bloque consejo">{x}</div>)}
    </div>
  );
}

function Cronica({ d }) {
  if (d.vacio) return <div className="pad tenue" style={{ textAlign: "center" }}>{d.mensaje}</div>;
  const b = d.balance || {};
  const parrafos = String(d.cronica || "").split(/\\n|\n/).filter((p) => p.trim());
  return (
    <div className="periodico">
      <div className="cab">
        <div className="entre"><span className="min">Edición semanal</span><span className="min">{fechaLarga(hoy())}</span></div>
        <h2>KAIROS TIMES</h2>
        <div className="min" style={{ letterSpacing: 4 }}>El semanario del apostador</div>
      </div>
      <h3>{d.titular}</h3>
      <p style={{ textAlign: "center", fontStyle: "italic", color: "rgba(200,180,130,0.75)" }}>{d.subtitulo}</p>
      <div className="entre" style={{ justifyContent: "center", gap: 18, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {[["Apuestas", b.apuestas, ""], ["Ganadas", b.ganadas, "pos"], ["Perdidas", b.perdidas, "neg"], ["P&L", eur(b.pl), num(b.pl) >= 0 ? "pos" : "neg"]].map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}><div className={`mono ${c}`} style={{ fontSize: 17 }}>{v ?? 0}</div><div className="min">{l}</div></div>
        ))}
      </div>
      <div className="seccion">Crónica</div>
      {parrafos.map((p, i) => <p key={i}>{p}</p>)}
      <div className="seccion" style={{ color: "var(--gana)" }}>Mejor apuesta</div>
      <p>{d.mejorApuesta}</p>
      <div className="seccion" style={{ color: "var(--pierde)" }}>Peor momento</div>
      <p>{d.peorApuesta}</p>
      <div className="leccion"><div className="seccion" style={{ marginTop: 0 }}>Lección de la semana</div>{d.leccion}</div>
      <div className="seccion" style={{ color: "var(--cian)" }}>Perspectiva</div>
      <p>{d.perspectiva}</p>
    </div>
  );
}

export default function PestanaIA({ bets, onAjustes }) {
  const [modo, setModo] = useState("analisis");
  const [estado, setEstado] = useState({ cargando: false, error: null });
  const [datos, setDatos] = useState({ analisis: null, semana: null });
  const hechas = bets.filter((b) => b.result !== "pending").length;
  const lanzar = async () => {
    if (!claveDS()) return setEstado({ cargando: false, error: "Falta la clave de DeepSeek: Ajustes → IA" });
    setEstado({ cargando: true, error: null });
    try {
      const r = modo === "analisis" ? await analizar(bets) : await cronica(bets);
      setDatos((d) => ({ ...d, [modo]: r }));
      setEstado({ cargando: false, error: null });
    } catch (e) {
      setEstado({ cargando: false, error: e.message });
    }
  };
  const actual = datos[modo];
  return (
    <div className="scroll">
      <div className="pad entre">
        <span className="etiqueta">Inteligencia artificial</span>
        <button className="insignia" onClick={onAjustes}>⚙ claves</button>
      </div>
      <Sep />
      <div className="pad opciones">
        <button className={`opcion ${modo === "analisis" ? "activa" : ""}`} onClick={() => setModo("analisis")}>📊 Análisis</button>
        <button className={`opcion ${modo === "semana" ? "activa" : ""}`} onClick={() => setModo("semana")}>📰 Crónica semanal</button>
      </div>
      <div style={{ padding: "0 18px" }}>
        {!actual && !estado.cargando && (
          <div style={{ textAlign: "center", padding: "26px 0" }}>
            <div className="explica">
              {modo === "analisis" ? `Busca patrones en las ${hechas} apuestas liquidadas de esta temporada: mercados fuertes, ligas y qué mejorar.` : "Una crónica tipo periódico de tus últimos 7 días."}
            </div>
            <button className="boton" style={{ width: "auto", padding: "12px 28px" }} disabled={modo === "analisis" && hechas < 3} onClick={lanzar}>
              {modo === "analisis" ? (hechas < 3 ? "Hacen falta 3 apuestas" : "Analizar") : "Escribir la crónica"}
            </button>
          </div>
        )}
        {estado.cargando && <div style={{ textAlign: "center", padding: "30px 0" }}><div style={{ color: "var(--cian-2)" }}>Pensando con DeepSeek…</div><div className="cargando" /></div>}
        {estado.error && <div className="error">{estado.error}</div>}
        {actual && !estado.cargando && (
          <>
            <div style={{ textAlign: "right", marginBottom: 8 }}><button className="tenue" style={{ fontSize: 11 }} onClick={() => setDatos((d) => ({ ...d, [modo]: null }))}>Repetir</button></div>
            {modo === "analisis" ? <Analisis d={actual} /> : <Cronica d={actual} />}
          </>
        )}
      </div>
      <div className="hueco" />
    </div>
  );
}

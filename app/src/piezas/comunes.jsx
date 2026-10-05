import { estado } from "../datos/calculos.js";
import { fechaCorta, euros } from "../datos/util.js";

export const LOGO = "public/icons/icon-192.png";

export const Sep = () => <div className="sep" />;

export function Insignia({ children, c, className = "" }) {
  return <span className={`insignia ${c ? "c r-" + c : ""} ${className}`}>{children}</span>;
}

export const colorImporte = (n) => (n == null ? "tenue" : n > 0 ? "pos" : n < 0 ? "neg" : "");
// «+52.40» / «−15.00» sin el €, para el marcador
export const masmenos = (n) => (n == null || isNaN(n) ? "—" : (Math.abs(n) < 0.005 ? "" : n > 0 ? "+" : "−") + Math.abs(n).toFixed(2));

// Una apuesta en una lista: fecha · apuesta · P&L (y el bankroll que deja, si se pide)
export function Linea({ bet, onClick, sel, conBank }) {
  const e = estado(bet);
  const pendiente = bet.result === "pending";
  return (
    <button className={`linea r-${e.clave} ${sel ? "sel" : ""}`} onClick={onClick}>
      <span className="f">{fechaCorta(bet.date)}</span>
      <span className="texto">
        <span className="desc" style={{ display: "block" }}>{bet.desc}</span>
        <span className="sub" style={{ display: "block" }}><i className="marca-res" />{e.texto} · @{Number(bet.odds).toFixed(2)} · {bet.stake} €</span>
      </span>
      <span className="importe">
        <span className={pendiente ? "ambar" : colorImporte(bet.pl)} style={{ display: "block" }}>{pendiente ? "EN JUEGO" : masmenos(bet.pl)}</span>
        {conBank && bet.bankroll != null && <span className="sub" style={{ display: "block" }}>{euros(bet.bankroll)}</span>}
      </span>
    </button>
  );
}

// Gráfica del bankroll. `mini`: la del inicio (sin puntos ni fechas, con el último punto en ámbar)
export function Grafica({ bets, inicial, onPunto, sel, mini }) {
  const hechas = bets.filter((b) => b.result !== "pending" && b.bankroll != null);
  if (hechas.length < 2) return mini ? null : <div className="pad tenue" style={{ textAlign: "center", fontSize: 11 }}>Hacen falta 2 apuestas liquidadas para la gráfica</div>;
  const W = 360, H = mini ? 84 : 210;
  const P = mini ? { t: 8, r: 8, b: 6, l: 0 } : { t: 14, r: 14, b: 26, l: 40 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const pts = [{ bankroll: inicial, id: "inicio" }, ...hechas];
  const vs = pts.map((p) => p.bankroll), mn = Math.min(...vs), mx = Math.max(...vs), rng = mx - mn || 1, pv = rng * 0.1;
  const x = (i) => P.l + (i / (pts.length - 1)) * cW, y = (v) => P.t + cH - ((v - mn + pv) / (rng + pv * 2)) * cH;
  const linea = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.bankroll).toFixed(1)}`).join(" ");
  const marcas = Array.from({ length: 4 }, (_, i) => mn - pv + ((rng + pv * 2) / 3) * i);
  const cada = Math.ceil(pts.length / 5);
  const ult = pts.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-label="Evolución del bankroll">
      {marcas.map((v, i) => (
        <g key={i}>
          <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} stroke="var(--linea)" />
          {!mini && <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fill="var(--tenue)" fontSize="9" fontFamily="Chivo Mono, monospace">{Math.round(v)}</text>}
        </g>
      ))}
      <line x1={P.l} y1={y(inicial)} x2={W - P.r} y2={y(inicial)} stroke="var(--tenue)" strokeDasharray="2 3" />
      <polyline points={linea} fill="none" stroke="var(--ambar)" strokeWidth="2" strokeLinejoin="round" />
      {!mini && pts.map((p, i) => {
        if (i === 0) return null;
        const e = estado(p), s = sel === p.id ? 9 : 6;
        return (
          <g key={p.id} className={`r-${e.clave}`} onClick={() => onPunto && onPunto(p)} style={{ cursor: "pointer" }}>
            <rect x={x(i) - 11} y={y(p.bankroll) - 11} width="22" height="22" fill="transparent" />
            <rect x={x(i) - s / 2} y={y(p.bankroll) - s / 2} width={s} height={s} fill={sel === p.id ? "var(--ambar)" : "var(--negro)"} stroke="var(--c)" strokeWidth="1.6" />
          </g>
        );
      })}
      <rect x={x(ult) - 4} y={y(pts[ult].bankroll) - 4} width="8" height="8" fill="var(--ambar)" />
      {!mini && pts.map((p, i) =>
        i === 0 || i === ult || pts.length <= 8 || i % cada === 0 ? (
          <text key={"f" + i} x={x(i)} y={H - 6} textAnchor="middle" fill="var(--tenue)" fontSize="8" fontFamily="Chivo Mono, monospace">{i === 0 ? "INICIO" : fechaCorta(p.date).toUpperCase()}</text>
        ) : null
      )}
    </svg>
  );
}

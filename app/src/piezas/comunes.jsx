import { estado } from "../datos/calculos.js";
import { fechaCorta, signo, euros } from "../datos/util.js";

export const LOGO = "public/icons/icon-192.png";

export const Sep = () => <div className="sep" />;

export function Insignia({ children, c, className = "" }) {
  return <span className={`insignia ${c ? "c r-" + c : ""} ${className}`}>{children}</span>;
}

export function Punto({ bet, size = 28 }) {
  const e = estado(bet);
  return (
    <div className={`punto r-${e.clave}`} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {e.icono}
    </div>
  );
}

export const colorImporte = (n) => (n == null ? "tenue" : n > 0 ? "pos" : n < 0 ? "neg" : "");

// Una apuesta en una lista (inicio, gráfica, historial)
export function Linea({ bet, onClick, sel, conBank }) {
  const e = estado(bet);
  return (
    <button className={`linea r-${e.clave} ${sel ? "sel" : ""}`} onClick={onClick}>
      <Punto bet={bet} />
      <div className="texto">
        <div className="desc ellipsis">{bet.desc}</div>
        <div className="sub">
          {fechaCorta(bet.date)} · @{bet.odds} · {bet.stake} €
        </div>
      </div>
      <div className="importe">
        <div className={bet.result === "pending" ? "tenue" : colorImporte(bet.pl)}>{bet.result === "pending" ? "en juego" : signo(bet.pl)}</div>
        {conBank && bet.bankroll != null && <div className="sub">{euros(bet.bankroll)}</div>}
      </div>
    </button>
  );
}

export function Grafica({ bets, inicial, onPunto, sel }) {
  const hechas = bets.filter((b) => b.result !== "pending" && b.bankroll != null);
  if (hechas.length < 2) return <div className="pad tenue" style={{ textAlign: "center", fontSize: 13 }}>Hacen falta 2 apuestas liquidadas para la gráfica</div>;
  const W = 360, H = 200, P = { t: 16, r: 16, b: 28, l: 44 }, cW = W - P.l - P.r, cH = H - P.t - P.b;
  const pts = [{ bankroll: inicial, id: "inicio" }, ...hechas];
  const vs = pts.map((p) => p.bankroll), mn = Math.min(...vs), mx = Math.max(...vs), rng = mx - mn || 1, pv = rng * 0.12;
  const x = (i) => P.l + (i / (pts.length - 1)) * cW, y = (v) => P.t + cH - ((v - mn + pv) / (rng + pv * 2)) * cH;
  const linea = pts.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.bankroll).toFixed(1)}`).join(" ");
  const area = `${linea} L ${x(pts.length - 1).toFixed(1)} ${P.t + cH} L ${x(0).toFixed(1)} ${P.t + cH} Z`;
  const marcas = Array.from({ length: 4 }, (_, i) => mn - pv + ((rng + pv * 2) / 3) * i);
  const cada = Math.ceil(pts.length / 5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="kb-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a6fd8" stopOpacity="0.2" /><stop offset="100%" stopColor="#3a6fd8" stopOpacity="0" /></linearGradient>
        <linearGradient id="kb-linea" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3a6fd8" /><stop offset="100%" stopColor="#6bb8e8" /></linearGradient>
      </defs>
      {marcas.map((v, i) => (
        <g key={i}>
          <line x1={P.l} y1={y(v)} x2={W - P.r} y2={y(v)} stroke="rgba(255,255,255,0.05)" />
          <text x={P.l - 6} y={y(v) + 4} textAnchor="end" fill="rgba(160,168,188,0.5)" fontSize="9">{Math.round(v)}</text>
        </g>
      ))}
      <line x1={P.l} y1={y(inicial)} x2={W - P.r} y2={y(inicial)} stroke="rgba(201,168,76,0.3)" strokeDasharray="3,3" />
      <path d={area} fill="url(#kb-area)" />
      <path d={linea} fill="none" stroke="url(#kb-linea)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        if (i === 0) return <circle key="inicio" cx={x(0)} cy={y(p.bankroll)} r="3" fill="var(--fondo-2)" stroke="rgba(201,168,76,0.6)" strokeWidth="1.5" />;
        const e = estado(p);
        return (
          <g key={p.id} className={`r-${e.clave}`} onClick={() => onPunto && onPunto(p)} style={{ cursor: "pointer" }}>
            <circle cx={x(i)} cy={y(p.bankroll)} r="12" fill="transparent" />
            <circle cx={x(i)} cy={y(p.bankroll)} r={sel === p.id ? 6.5 : 4.5} fill="var(--fondo-2)" stroke="var(--c)" strokeWidth="1.8" />
          </g>
        );
      })}
      {pts.map((p, i) =>
        i === 0 || i === pts.length - 1 || pts.length <= 8 || i % cada === 0 ? (
          <text key={"f" + i} x={x(i)} y={H - 6} textAnchor="middle" fill="rgba(160,168,188,0.45)" fontSize="8">{i === 0 ? "inicio" : fechaCorta(p.date)}</text>
        ) : null
      )}
    </svg>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";

const LOGO = "/icons/icon-192.png";
const INITIAL_BANKROLL = 15;

const GSHEET_API = "https://script.google.com/macros/s/AKfycbxe8FBH_jA03Nj2QFA3KtL8IANcQaL3d--7PaT-aBBp7r1nYD8IxJGMJdifSVvHlGMMdQ/exec";

// --- Google Sheets sync layer ---
async function fetchBetsFromSheet() {
  const res = await fetch(GSHEET_API + "?action=getBets");
  const data = await res.json();
  return (data.bets || []).map(b => ({
    id: b.id,
    date: b.date,
    type: b.type || "Combinada",
    desc: b.desc || "",
    odds: Number(b.odds) || 0,
    stake: Number(b.stake) || 15,
    result: b.result || "pending",
    pl: b.pl === "" || b.pl === null ? null : Number(b.pl),
    notes: b.notes || "",
  }));
}

async function syncBetToSheet(bet) {
  try {
    await fetch(GSHEET_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "addBet", bet }),
    });
  } catch (e) { console.warn("Sheet sync failed:", e); }
}

async function updateBetOnSheet(bet) {
  try {
    await fetch(GSHEET_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "updateBet", bet }),
    });
  } catch (e) { console.warn("Sheet update failed:", e); }
}

async function syncAllToSheet(bets) {
  try {
    await fetch(GSHEET_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "syncAll", bets }),
    });
  } catch (e) { console.warn("Sheet full sync failed:", e); }
}

function getResultStyle(result, pl) {
  if (result === "win")    return { text: "#5cb85c", bg: "rgba(92,184,92,0.07)",   border: "rgba(92,184,92,0.18)",   label: "Ganada",    icon: "✓" };
  if (result === "loss")   return { text: "#d9534f", bg: "rgba(217,83,79,0.07)",   border: "rgba(217,83,79,0.18)",   label: "Perdida",   icon: "✗" };
  if (result === "pending")return { text: "#4a90c4", bg: "rgba(74,144,196,0.07)",  border: "rgba(74,144,196,0.18)",  label: "Pendiente", icon: "○" };
  if (result === "cashout") {
    if (pl == null) return { text: "#c9a84c", bg: "rgba(201,168,76,0.07)", border: "rgba(201,168,76,0.18)", label: "Cash Out", icon: "◈" };
    if (pl < 0)    return { text: "#e07060", bg: "rgba(224,112,96,0.07)",  border: "rgba(224,112,96,0.18)",  label: "Cash Out −", icon: "◈" };
    const ret = pl + 15;
    if (ret >= 13 && ret <= 17) return { text: "#d4b84a", bg: "rgba(212,184,74,0.07)", border: "rgba(212,184,74,0.18)", label: "Cash Out ~", icon: "◈" };
    return { text: "#3eb58a", bg: "rgba(62,181,138,0.07)", border: "rgba(62,181,138,0.18)", label: "Cash Out +", icon: "◈" };
  }
  return { text: "#888", bg: "rgba(136,136,136,0.07)", border: "rgba(136,136,136,0.18)", label: result, icon: "·" };
}

function isPositive(b) {
  return b.result === "win" || (b.result === "cashout" && b.pl != null && b.pl > 0);
}

function computeStreak(settled) {
  let streak = 0, st = null;
  for (let i = settled.length - 1; i >= 0; i--) {
    const pos = isPositive(settled[i]);
    const neg = settled[i].result === "loss" || (settled[i].result === "cashout" && settled[i].pl != null && settled[i].pl <= 0);
    if (i === settled.length - 1) {
      st = pos ? "pos" : neg ? "neg" : null;
      streak = st ? 1 : 0;
    } else {
      if ((st === "pos" && pos) || (st === "neg" && neg)) streak++;
      else break;
    }
  }
  return { streak, st };
}

function computeBankrolls(bets) {
  let bank = INITIAL_BANKROLL;
  return bets.map(b => {
    if (b.pl != null) {
      bank = parseFloat((bank + b.pl).toFixed(2));
      return { ...b, bankroll: bank };
    }
    return { ...b, bankroll: null };
  });
}

function getDisplayBankroll(bets) {
  const settled = bets.filter(b => b.result !== "pending");
  const base = settled.length > 0 ? (settled[settled.length - 1].bankroll || INITIAL_BANKROLL) : INITIAL_BANKROLL;
  const inPlay = bets.filter(b => b.result === "pending").reduce((s, b) => s + b.stake, 0);
  return parseFloat((base - inPlay).toFixed(2));
}

const fmtM = (n) => n == null ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "€";
const fmtA = (n) => n == null ? "—" : n.toFixed(2) + "€";
const fmtD = (d) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0e18; --bg2: #111628; --bg3: #161b30;
    --surface: rgba(255,255,255,0.03); --s2: rgba(255,255,255,0.055);
    --border: rgba(255,255,255,0.06); --b2: rgba(255,255,255,0.10);
    --text: #d8dce8; --t2: #a0a8bc; --muted: rgba(160,168,188,0.5);
    --gold: #c9a84c; --gold2: #e8c96a; --cyan: #4a9fd4; --cyan2: #6bb8e8; --accent: #3a6fd8;
  }
  html, body { height: 100%; background: var(--bg); color: var(--text);
    font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; }
  #root { height: 100%; }
  ::-webkit-scrollbar { width: 0; }
  input, textarea, button, select { font-family: 'Inter', sans-serif; }
  input:focus, textarea:focus { outline: none; border-color: var(--b2) !important; }
`;

function Sep() { return <div style={{ height: 1, background: "var(--border)" }} />; }

function Badge({ children, color, border, bg }) {
  return <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 3,
    background: bg || "var(--s2)", border: `1px solid ${border || "var(--b2)"}`,
    color: color || "var(--t2)", fontSize: 11, fontFamily: "'DM Mono', monospace",
    letterSpacing: 0.2, whiteSpace: "nowrap", lineHeight: 1.6
  }}>{children}</span>;
}

function RDot({ result, pl, size = 28 }) {
  const s = getResultStyle(result, pl);
  return <div style={{
    width: size, height: size, borderRadius: 6, flexShrink: 0,
    background: s.bg, border: `1px solid ${s.border}`,
    display: "flex", alignItems: "center", justifyContent: "center"
  }}>
    <span style={{ fontSize: size * 0.45, color: s.text, fontWeight: 600, lineHeight: 1 }}>{s.icon}</span>
  </div>;
}

function SyncDot({ status }) {
  const colors = { idle: "var(--muted)", syncing: "var(--cyan)", ok: "#5cb85c", error: "#d9534f" };
  const labels = { idle: "", syncing: "Sync...", ok: "Sync", error: "Offline" };
  return <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <div style={{ width: 6, height: 6, borderRadius: 3, background: colors[status] || colors.idle, animation: status === "syncing" ? "pulse 1s infinite" : "none" }} />
    {status !== "idle" && <span style={{ fontSize: 9, color: colors[status], letterSpacing: 0.3, textTransform: "uppercase" }}>{labels[status]}</span>}
    <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
  </div>;
}

function Header({ bets, syncStatus }) {
  const pending = bets.filter(b => b.result === "pending").length;
  return <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 18px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src={LOGO} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }} alt="logo" />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.1 }}>
          <span style={{ color: "var(--gold2)" }}>Kairos</span>
          <span style={{ color: "var(--text)" }}>Bets</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1.2, textTransform: "uppercase" }}>Value Tracker</div>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <SyncDot status={syncStatus} />
      {pending > 0 && <Badge color="var(--cyan)" border="rgba(74,144,196,0.3)">{pending} en juego</Badge>}
    </div>
  </div>;
}

function Chart({ bets, onPointClick }) {
  const settled = bets.filter(b => b.result !== "pending" && b.bankroll != null);
  if (settled.length < 2) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
      Se necesitan al menos 2 apuestas liquidadas
    </div>
  );
  const W = 360, H = 200, PAD = { t: 16, r: 16, b: 28, l: 48 };
  const chartW = W - PAD.l - PAD.r, chartH = H - PAD.t - PAD.b;
  const points = [{ bankroll: INITIAL_BANKROLL, idx: -1 }, ...settled.map((b, i) => ({ ...b, idx: i }))];
  const vals = points.map(p => p.bankroll);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1, padV = range * 0.12;
  const xS = (i) => PAD.l + (i / (points.length - 1)) * chartW;
  const yS = (v) => PAD.t + chartH - ((v - minV + padV) / (range + padV * 2)) * chartH;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(i).toFixed(1)} ${yS(p.bankroll).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${xS(points.length-1).toFixed(1)} ${(PAD.t+chartH).toFixed(1)} L ${xS(0).toFixed(1)} ${(PAD.t+chartH).toFixed(1)} Z`;
  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks }, (_, i) => minV - padV + ((range + padV * 2) / (yTicks - 1)) * i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a6fd8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3a6fd8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a6fd8" /><stop offset="100%" stopColor="#6bb8e8" />
        </linearGradient>
      </defs>
      {tickVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={yS(v)} x2={W-PAD.r} y2={yS(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PAD.l-6} y={yS(v)+4} textAnchor="end" fill="rgba(160,168,188,0.45)" fontSize="9" fontFamily="DM Mono">{Math.round(v)}</text>
        </g>
      ))}
      <line x1={PAD.l} y1={yS(INITIAL_BANKROLL)} x2={W-PAD.r} y2={yS(INITIAL_BANKROLL)} stroke="rgba(201,168,76,0.25)" strokeWidth="1" strokeDasharray="3,3" />
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        if (i === 0) return <circle key={i} cx={xS(i)} cy={yS(p.bankroll)} r="3" fill="var(--bg2)" stroke="rgba(201,168,76,0.6)" strokeWidth="1.5" />;
        const s = getResultStyle(p.result, p.pl);
        return <circle key={i} cx={xS(i)} cy={yS(p.bankroll)} r="5" fill="var(--bg2)" stroke={s.text} strokeWidth="1.8" style={{ cursor: "pointer" }} onClick={() => onPointClick(p)} />;
      })}
      {points.map((p, i) => {
        if (i === 0 || i === points.length-1 || points.length <= 8 || i % Math.ceil(points.length/5) === 0) {
          return <text key={i} x={xS(i)} y={H-6} textAnchor="middle" fill="rgba(160,168,188,0.4)" fontSize="8" fontFamily="DM Mono">{i === 0 ? "inicio" : fmtD(p.date)}</text>;
        }
        return null;
      })}
    </svg>
  );
}

function ChartTab({ bets, onBet }) {
  const [selected, setSelected] = useState(null);
  const settled = bets.filter(b => b.result !== "pending");
  const totalPL = settled.reduce((s, b) => s + (b.pl || 0), 0);
  const displayBank = getDisplayBankroll(bets);
  const roi = ((displayBank - INITIAL_BANKROLL) / INITIAL_BANKROLL * 100);
  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 18px 12px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge color="var(--gold)" border="rgba(201,168,76,0.25)">{fmtA(displayBank)}</Badge>
          <Badge color={totalPL >= 0 ? "#5cb85c" : "#d9534f"} border={totalPL >= 0 ? "rgba(92,184,92,0.3)" : "rgba(217,83,79,0.3)"}>{fmtM(totalPL)} neto</Badge>
          <Badge color={roi >= 0 ? "var(--cyan)" : "#d9534f"} border={roi >= 0 ? "rgba(74,144,196,0.3)" : "rgba(217,83,79,0.3)"}>{roi >= 0 ? "+" : ""}{roi.toFixed(0)}% ROI</Badge>
        </div>
      </div>
      <Sep />
      <div style={{ padding: "16px 14px 8px" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 }}>Bankroll · toca un punto para ver detalles</div>
        <Chart bets={bets} onPointClick={(p) => setSelected(selected?.id === p.id ? null : p)} />
      </div>
      <Sep />
      {selected && (
        <>
          <div style={{ padding: "12px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Apuesta seleccionada</div>
            <div onClick={() => onBet(selected)} style={{ padding: "13px 14px", borderRadius: 9, cursor: "pointer", background: getResultStyle(selected.result, selected.pl).bg, border: `1px solid ${getResultStyle(selected.result, selected.pl).border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtD(selected.date)} · {selected.type}</span>
                <Badge color={getResultStyle(selected.result, selected.pl).text} border={getResultStyle(selected.result, selected.pl).border}>{getResultStyle(selected.result, selected.pl).label}</Badge>
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, marginBottom: 8 }}>{selected.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6 }}><Badge>@{selected.odds}</Badge><Badge>€{selected.stake}</Badge></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 14, fontFamily: "'DM Mono',monospace", fontWeight: 500, color: getResultStyle(selected.result, selected.pl).text }}>{fmtM(selected.pl)}</span>
                  {selected.bankroll && <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>→ {fmtA(selected.bankroll)}</span>}
                </div>
              </div>
            </div>
          </div>
          <Sep />
        </>
      )}
      <div style={{ padding: "12px 18px 8px" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Todas las apuestas</div>
      </div>
      {[...settled].reverse().map((b, i) => {
        const s = getResultStyle(b.result, b.pl);
        return (
          <div key={b.id}>
            <div onClick={() => setSelected(selected?.id === b.id ? null : b)} style={{ padding: "10px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selected?.id === b.id ? s.bg : "transparent" }}>
              <RDot result={b.result} pl={b.pl} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.desc}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{fmtD(b.date)} · @{b.odds}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: s.text }}>{fmtM(b.pl)}</div>
                {b.bankroll && <div style={{ fontSize: 10, color: "var(--muted)" }}>{fmtA(b.bankroll)}</div>}
              </div>
            </div>
            {i < settled.length - 1 && <Sep />}
          </div>
        );
      })}
      <div style={{ height: 80 }} />
    </div>
  );
}

function Dashboard({ bets, onNew, onBet, onForceSync, syncStatus }) {
  const settled = bets.filter(b => b.result !== "pending");
  const wins = settled.filter(b => b.result === "win").length;
  const losses = settled.filter(b => b.result === "loss").length;
  const cashouts = settled.filter(b => b.result === "cashout").length;
  const totalPL = settled.reduce((s, b) => s + (b.pl || 0), 0);
  const displayBank = getDisplayBankroll(bets);
  const roi = ((displayBank - INITIAL_BANKROLL) / INITIAL_BANKROLL * 100);
  const pending = bets.filter(b => b.result === "pending");
  const { streak, st } = computeStreak(settled);
  const streakColor = st === "pos" ? "#5cb85c" : st === "neg" ? "#d9534f" : "var(--muted)";
  const recent = [...bets].reverse().slice(0, 6);
  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 18px 18px" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 5 }}>Bankroll disponible</div>
        <div style={{ fontSize: 44, fontFamily: "'DM Mono', monospace", fontWeight: 500, letterSpacing: -1.5, color: "var(--text)", lineHeight: 1 }}>{fmtA(displayBank)}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Badge color="var(--gold)" border="rgba(201,168,76,0.25)">base €{INITIAL_BANKROLL}</Badge>
          <Badge color={totalPL >= 0 ? "#5cb85c" : "#d9534f"} border={totalPL >= 0 ? "rgba(92,184,92,0.3)" : "rgba(217,83,79,0.3)"}>{fmtM(totalPL)} neto</Badge>
          <Badge color={roi >= 0 ? "var(--cyan)" : "#d9534f"} border={roi >= 0 ? "rgba(74,144,196,0.3)" : "rgba(217,83,79,0.3)"}>{roi >= 0 ? "+" : ""}{roi.toFixed(0)}% ROI</Badge>
        </div>
        {pending.length > 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, fontStyle: "italic" }}>€{pending.reduce((s,b) => s+b.stake, 0)} en juego · no disponibles hasta resultado</div>}
      </div>
      <Sep />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Ganadas", value: wins, color: "#5cb85c" },
          { label: "Perdidas", value: losses, color: "#d9534f" },
          { label: "C.Out", value: cashouts, color: "#3eb58a" },
          { label: "Racha", value: streak > 0 ? `${streak}${st === "pos" ? "W" : "L"}` : "—", color: streakColor },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "14px 8px", textAlign: "center", borderRight: i < 3 ? "1px solid var(--border)" : "none", background: "var(--bg2)" }}>
            <div style={{ fontSize: 24, fontFamily: "'DM Mono',monospace", fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <Sep />
      {pending.length > 0 && (
        <>
          <div style={{ padding: "14px 18px 8px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>En juego</div>
            {pending.map(b => (
              <div key={b.id} onClick={() => onBet(b)} style={{ padding: "11px 13px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: "rgba(74,144,196,0.07)", border: "1px solid rgba(74,144,196,0.18)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{fmtD(b.date)} · {b.type}</div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.desc}</div>
                </div>
                <Badge color="var(--cyan)" border="rgba(74,144,196,0.3)">@{b.odds}</Badge>
              </div>
            ))}
          </div>
          <Sep />
        </>
      )}
      <div style={{ padding: "14px 18px 8px" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>Recientes</div>
      </div>
      {recent.map((b, i) => (
        <div key={b.id}>
          <div onClick={() => onBet(b)} style={{ padding: "11px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <RDot result={b.result} pl={b.pl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{b.desc}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmtD(b.date)} · @{b.odds}</div>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 500, fontSize: 13, color: b.result === "pending" ? "var(--muted)" : getResultStyle(b.result, b.pl).text, flexShrink: 0 }}>
              {b.result === "pending" ? "—" : fmtM(b.pl)}
            </div>
          </div>
          {i < recent.length - 1 && <Sep />}
        </div>
      ))}
      <Sep />
      <div style={{ padding: "14px 18px 8px" }}>
        <button onClick={onForceSync} disabled={syncStatus === "syncing"} style={{
          width: "100%", padding: "11px", borderRadius: 8,
          background: syncStatus === "syncing" ? "var(--bg3)" : "var(--surface)",
          border: "1px solid var(--border)", color: syncStatus === "syncing" ? "var(--muted)" : "var(--cyan2)",
          fontSize: 12, cursor: syncStatus === "syncing" ? "wait" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6
        }}>
          {syncStatus === "syncing" ? "Sincronizando..." : "Subir todo al Sheet"}
        </button>
      </div>
      <div style={{ height: 90 }} />
      <div style={{ position: "absolute", bottom: 76, right: 18 }}>
        <button onClick={onNew} style={{ width: 50, height: 50, borderRadius: 12, background: "linear-gradient(145deg, var(--accent), var(--cyan))", border: "none", color: "#fff", fontSize: 22, fontWeight: 300, cursor: "pointer", boxShadow: "0 4px 16px rgba(58,111,216,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
    </div>
  );
}

function History({ bets, onBet }) {
  const sorted = [...bets].reverse();
  const totalPL = bets.filter(b => b.pl != null).reduce((s, b) => s + (b.pl || 0), 0);
  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>{bets.length} apuestas</div>
        <div style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: totalPL >= 0 ? "#5cb85c" : "#d9534f" }}>{fmtM(totalPL)}</div>
      </div>
      <Sep />
      {sorted.map((b, i) => {
        const s = getResultStyle(b.result, b.pl);
        return (
          <div key={b.id}>
            <div onClick={() => onBet(b)} style={{ padding: "12px 18px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <RDot result={b.result} pl={b.pl} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtD(b.date)} · {b.type}</span>
                  <span style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, color: b.result === "pending" ? "var(--muted)" : s.text, flexShrink: 0 }}>{b.result === "pending" ? "—" : fmtM(b.pl)}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, marginBottom: 7 }}>{b.desc}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <Badge>@{b.odds}</Badge><Badge>€{b.stake}</Badge>
                  <Badge color={s.text} border={s.border}>{s.label}</Badge>
                </div>
                {b.bankroll != null && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>Bankroll → {fmtA(b.bankroll)}</div>}
              </div>
            </div>
            {i < sorted.length - 1 && <Sep />}
          </div>
        );
      })}
      <div style={{ height: 80 }} />
    </div>
  );
}

function Detail({ bet, onBack, onUpdate }) {
  const [result, setResult] = useState(bet.result);
  const [retorno, setRetorno] = useState(bet.result !== "pending" && bet.pl != null ? (bet.stake + bet.pl).toFixed(2) : "");
  const [notes, setNotes] = useState(bet.notes || "");
  const [saved, setSaved] = useState(false);
  const pl = result === "loss" ? -bet.stake : retorno !== "" ? parseFloat((parseFloat(retorno) - bet.stake).toFixed(2)) : null;
  const save = () => {
    onUpdate({ ...bet, result, pl: result === "pending" ? null : pl, notes });
    setSaved(true);
    setTimeout(() => { setSaved(false); onBack(); }, 600);
  };
  const inp = { width: "100%", padding: "11px 13px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 14 };
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 80px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}>← Volver</button>
      <div style={{ padding: "14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{fmtD(bet.date)} · {bet.type}</div>
        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5, marginBottom: 10 }}>{bet.desc}</div>
        <div style={{ display: "flex", gap: 6 }}><Badge>@{bet.odds}</Badge><Badge>€{bet.stake} stake</Badge></div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Resultado</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {["win", "loss", "cashout", "pending"].map(r => {
            const s = getResultStyle(r, r === result ? pl : null);
            return <button key={r} onClick={() => setResult(r)} style={{ padding: "11px 10px", borderRadius: 7, border: `1px solid ${result === r ? s.border : "var(--border)"}`, background: result === r ? s.bg : "var(--surface)", color: result === r ? s.text : "var(--muted)", fontSize: 13, cursor: "pointer", fontWeight: result === r ? 500 : 400 }}>{s.icon} {s.label}</button>;
          })}
        </div>
      </div>
      {result !== "loss" && result !== "pending" && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Retorno real Bet365 (€)</div>
          <input type="number" step="0.01" value={retorno} onChange={e => setRetorno(e.target.value)} placeholder="ej: 85.15" style={{ ...inp, fontFamily: "'DM Mono',monospace", fontSize: 18 }} />
          {pl != null && <div style={{ marginTop: 7, fontSize: 13, fontFamily: "'DM Mono',monospace", color: pl >= 0 ? "#5cb85c" : "#d9534f" }}>P&L: {fmtM(pl)}</div>}
        </div>
      )}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 }}>Notas</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inp, resize: "none", lineHeight: 1.5 }} />
      </div>
      <button onClick={save} style={{ width: "100%", padding: "13px", borderRadius: 9, background: saved ? "transparent" : "linear-gradient(135deg, var(--accent), var(--cyan))", border: saved ? "1px solid rgba(92,184,92,0.4)" : "none", color: saved ? "#5cb85c" : "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
        {saved ? "✓ Guardado" : "Guardar"}
      </button>
    </div>
  );
}

function NewBet({ onBack, onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [type, setType] = useState("Combinada");
  const [desc, setDesc] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("15");
  const [result, setResult] = useState("pending");
  const [retorno, setRetorno] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const pl = result === "loss" ? -parseFloat(stake || 15) : retorno !== "" ? parseFloat((parseFloat(retorno) - parseFloat(stake || 15)).toFixed(2)) : null;
  const valid = desc.trim() && odds;
  const save = () => {
    if (!valid) return;
    onSave({ id: "b" + Date.now(), date, type, desc, odds: parseFloat(odds), stake: parseFloat(stake || 15), result, pl: result === "pending" ? null : pl, bankroll: null, notes });
    setSaved(true);
    setTimeout(onBack, 600);
  };
  const inp = { width: "100%", padding: "11px 13px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", fontSize: 14 };
  const lbl = { fontSize: 11, color: "var(--muted)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8, display: "block" };
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 80px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>← Volver</button>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 20 }}>Nueva apuesta</div>
      <div style={{ marginBottom: 15 }}><label style={lbl}>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, fontFamily: "'DM Mono',monospace" }} /></div>
      <div style={{ marginBottom: 15 }}>
        <label style={lbl}>Tipo</label>
        <div style={{ display: "flex", gap: 7 }}>
          {["Simple", "Combinada"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "11px", borderRadius: 7, border: `1px solid ${type === t ? "rgba(58,111,216,0.5)" : "var(--border)"}`, background: type === t ? "rgba(58,111,216,0.1)" : "var(--surface)", color: type === t ? "var(--cyan2)" : "var(--muted)", fontSize: 13, cursor: "pointer", fontWeight: type === t ? 500 : 400 }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 15 }}><label style={lbl}>Descripción / Patas</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="ej: Nantes U2.5 (1.61) × Man City gana (2.05)" style={{ ...inp, resize: "none", lineHeight: 1.5 }} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 15 }}>
        <div><label style={lbl}>Cuota total</label><input type="number" step="0.01" value={odds} onChange={e => setOdds(e.target.value)} placeholder="5.67" style={{ ...inp, fontFamily: "'DM Mono',monospace" }} /></div>
        <div><label style={lbl}>Stake €</label><input type="number" step="0.5" value={stake} onChange={e => setStake(e.target.value)} style={{ ...inp, fontFamily: "'DM Mono',monospace" }} /></div>
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={lbl}>Resultado</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {["pending", "win", "loss", "cashout"].map(r => {
            const s = getResultStyle(r, null);
            return <button key={r} onClick={() => setResult(r)} style={{ padding: "10px", borderRadius: 7, border: `1px solid ${result === r ? s.border : "var(--border)"}`, background: result === r ? s.bg : "var(--surface)", color: result === r ? s.text : "var(--muted)", fontSize: 13, cursor: "pointer", fontWeight: result === r ? 500 : 400 }}>{s.icon} {s.label}</button>;
          })}
        </div>
      </div>
      {result !== "loss" && result !== "pending" && (
        <div style={{ marginBottom: 15 }}>
          <label style={lbl}>Retorno real Bet365 (€)</label>
          <input type="number" step="0.01" value={retorno} onChange={e => setRetorno(e.target.value)} placeholder="ej: 85.15" style={{ ...inp, fontFamily: "'DM Mono',monospace", fontSize: 18 }} />
          {pl != null && <div style={{ marginTop: 6, fontSize: 13, fontFamily: "'DM Mono',monospace", color: pl >= 0 ? "#5cb85c" : "#d9534f" }}>P&L: {fmtM(pl)}</div>}
        </div>
      )}
      <div style={{ marginBottom: 22 }}><label style={lbl}>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: "none" }} /></div>
      <button onClick={save} disabled={!valid} style={{ width: "100%", padding: "13px", borderRadius: 9, background: saved ? "transparent" : valid ? "linear-gradient(135deg, var(--accent), var(--cyan))" : "var(--bg3)", border: saved ? "1px solid rgba(92,184,92,0.4)" : "none", color: saved ? "#5cb85c" : valid ? "#fff" : "var(--muted)", fontSize: 14, fontWeight: 500, cursor: valid ? "pointer" : "not-allowed" }}>
        {saved ? "✓ Guardado" : "Guardar apuesta"}
      </button>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "dashboard", label: "Inicio", icon: "◆" },
    { id: "chart", label: "Gráfica", icon: "∿" },
    { id: "history", label: "Historial", icon: "≡" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 58, background: "rgba(12,14,24,0.97)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--border)", display: "flex" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: active === t.id ? "var(--cyan2)" : "var(--muted)", transition: "color 0.15s" }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          <span style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: active === t.id ? 500 : 400 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

const TAB_ORDER = ["dashboard", "chart", "history"];

export default function App() {
  const [bets, setBets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | ok | error
  const [tab, setTab] = useState("dashboard");
  const [view, setView] = useState("main");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    (async () => {
      // 1. Load from localStorage (app is source of truth)
      let localBets = null;
      try {
        const s = await window.storage.get("kairosbets_v4");
        if (s?.value) localBets = JSON.parse(s.value);
      } catch {}

      // Also check legacy storage key
      if (!localBets) {
        try {
          const s = await window.storage.get("kairosbets_v3");
          if (s?.value) localBets = JSON.parse(s.value);
        } catch {}
      }

      if (localBets && localBets.length > 0) {
        // App has data — use it, don't overwrite from Sheet
        setBets(computeBankrolls(localBets));
        try { await window.storage.set("kairosbets_v4", JSON.stringify(localBets)); } catch {}
        setSyncStatus("ok");
      } else {
        // No local data — fetch from Google Sheet as bootstrap
        try {
          setSyncStatus("syncing");
          const sheetBets = await fetchBetsFromSheet();
          if (sheetBets.length > 0) {
            const wb = computeBankrolls(sheetBets);
            setBets(wb);
            try { await window.storage.set("kairosbets_v4", JSON.stringify(sheetBets)); } catch {}
            setSyncStatus("ok");
          } else {
            setSyncStatus("error");
          }
        } catch {
          setSyncStatus("error");
        }
      }
      setLoaded(true);
    })();
  }, []);

  async function persist(raw, newBet, updatedBet) {
    const wb = computeBankrolls(raw);
    setBets(wb);
    try { await window.storage.set("kairosbets_v4", JSON.stringify(raw)); } catch {}

    // Sync to Google Sheet in background
    setSyncStatus("syncing");
    try {
      if (newBet) {
        const betWithBankroll = wb.find(b => b.id === newBet.id);
        await syncBetToSheet({ ...newBet, bankroll: betWithBankroll?.bankroll });
      } else if (updatedBet) {
        const betWithBankroll = wb.find(b => b.id === updatedBet.id);
        await updateBetOnSheet({ ...updatedBet, bankroll: betWithBankroll?.bankroll });
      }
      setSyncStatus("ok");
    } catch {
      setSyncStatus("error");
    }
  }

  async function forceSync() {
    setSyncStatus("syncing");
    try {
      const wb = computeBankrolls(bets);
      await syncAllToSheet(wb);
      setSyncStatus("ok");
    } catch {
      setSyncStatus("error");
    }
  }

  const touchStart = useRef(null);
  const [drag, setDrag] = useState(0);
  const idx = TAB_ORDER.indexOf(tab);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; setDrag(0); };
  const onTouchMove = (e) => { if (touchStart.current !== null) setDrag(e.touches[0].clientX - touchStart.current); };
  const onTouchEnd = () => {
    if (Math.abs(drag) > 55) {
      if (drag < 0 && idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
      if (drag > 0 && idx > 0) setTab(TAB_ORDER[idx - 1]);
    }
    touchStart.current = null;
    setDrag(0);
  };

  if (!loaded) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>Cargando...</div>;

  const openBet = (b) => { setSel(b); setView("detail"); };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ height: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <Header bets={bets} syncStatus={syncStatus} />
        {view === "main" && (
          <div style={{ flex: 1, overflow: "hidden", position: "relative", paddingBottom: 58 }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div style={{ display: "flex", width: `${TAB_ORDER.length * 100}%`, height: "100%", transform: `translateX(calc(-${idx * (100 / TAB_ORDER.length)}% + ${drag / TAB_ORDER.length}px))`, transition: drag === 0 ? "transform 0.3s cubic-bezier(0.4,0,0.2,1)" : "none", willChange: "transform" }}>
              {TAB_ORDER.map(t => (
                <div key={t} style={{ width: `${100 / TAB_ORDER.length}%`, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {t === "dashboard" && <Dashboard bets={bets} onNew={() => setView("newbet")} onBet={openBet} onForceSync={forceSync} syncStatus={syncStatus} />}
                  {t === "chart"     && <ChartTab  bets={bets} onBet={openBet} />}
                  {t === "history"   && <History   bets={bets} onBet={openBet} />}
                </div>
              ))}
            </div>
          </div>
        )}
        {view === "detail" && sel && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Detail bet={sel} onBack={() => { setView("main"); setSel(null); }} onUpdate={u => { const nb = [...bets]; nb[nb.findIndex(x => x.id === u.id)] = u; persist(nb, null, u); }} />
          </div>
        )}
        {view === "newbet" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <NewBet onBack={() => setView("main")} onSave={b => { persist([...bets, b], b, null); setView("main"); }} />
          </div>
        )}
        {view === "main" && <TabBar active={tab} onChange={setTab} />}
      </div>
    </>
  );
}

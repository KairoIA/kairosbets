import { hoy } from "./util.js";

// DeepSeek (texto, análisis, crónica) y Gemini (fotos de apuestas). Las claves se pegan en Ajustes
// y viven solo en el móvil: NUNCA en el código, que es público (lección del 24-sep-2026).
const DS = "kairosbets_deepseek_key";
const GEM = "kairosbets_gemini_key";
const GEMINI_MODELO = "gemini-2.5-flash";

export const claveDS = () => localStorage.getItem(DS) || "";
export const claveGemini = () => localStorage.getItem(GEM) || "";
export const ponerClaves = (ds, gem) => {
  localStorage.setItem(DS, (ds || "").trim());
  localStorage.setItem(GEM, (gem || "").trim());
};

async function deepseek(mensajes, temperatura = 0.3) {
  const k = claveDS();
  if (!k) throw new Error("Falta la clave de DeepSeek (Ajustes → IA)");
  const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
    body: JSON.stringify({ model: "deepseek-chat", messages: mensajes, temperature: temperatura, max_tokens: 4096, response_format: { type: "json_object" } }),
  });
  if (!r.ok) throw new Error("DeepSeek " + r.status + ": " + (await r.text()).slice(0, 200));
  return (await r.json()).choices[0].message.content;
}

async function geminiFoto(base64, tipo, prompt) {
  const k = claveGemini();
  if (!k) throw new Error("Falta la clave de Gemini (Ajustes → IA)");
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
    body: JSON.stringify({
      model: GEMINI_MODELO,
      messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: `data:${tipo};base64,${base64}` } }, { type: "text", text: prompt }] }],
      temperature: 0.1, max_tokens: 4096, response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error("Gemini " + r.status + ": " + (await r.text()).slice(0, 200));
  return (await r.json()).choices[0].message.content;
}

function json(texto) {
  let s = String(texto).replace(/```(json)?/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  try {
    return JSON.parse(s);
  } catch {
    // saltos de línea sueltos dentro de las cadenas
    let fuera = "", dentro = false, prev = "";
    for (const ch of s) {
      if (ch === '"' && prev !== "\\") dentro = !dentro;
      fuera += dentro && ch === "\n" ? "\\n" : dentro && ch === "\r" ? "" : ch;
      prev = ch;
    }
    return JSON.parse(fuera);
  }
}

const FORMATO = `FORMATO OBLIGATORIO para "desc" — sigue EXACTAMENTE este patrón:
- Separar patas con " × "
- Cada pata: "Equipo mercado (cuota)"
- Mercados: "gana", "pierde", "empate", "DC X2", "DC 1X", "Over 2.5", "U2.5", "O2.5", "BTTS", "HT Local", "+3.5", etc.
- Cuotas SIEMPRE con exactamente 2 decimales (1.50, no 1.5)
- CUOTA TOTAL ("odds") = multiplicación de TODAS las cuotas individuales, redondeada a 2 decimales

EJEMPLOS de desc correctas:
- "Burton gana (3.20) × Bradford empate (3.50) × Inter empate descanso (3.20)"
- "Liverpool BTTS (1.61) × Barcelona +3.5 (1.66) × Man City gana (1.66)"
- "Arsenal gana Chelsea (1.55) × Over 2.5 Girona/Celta (1.90)"`;

const SALIDA = (stake) => `Si no se ve o no dice el stake, pon ${stake}. Si no hay fecha, usa "${hoy()}".
Devuelve SOLO JSON válido:
{"type":"Simple" o "Combinada","desc":"...","odds":numero_2_decimales,"stake":numero,"date":"YYYY-MM-DD","notes":""}`;

export async function leerFoto(archivo, stake) {
  const b64 = await new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = mal;
    r.readAsDataURL(archivo);
  });
  const prompt = `Mira esta captura de pantalla de una apuesta deportiva (Bet365, Betfair, etc).
INSTRUCCIONES CRÍTICAS:
1. Identifica TODAS las selecciones/patas de la apuesta. NO te dejes ninguna. Mira la imagen entera.
2. Cada pata tiene: un partido, un mercado y una cuota decimal.
3. STAKE: busca el importe apostado.
4. FECHA: busca fechas de los partidos.

${FORMATO}

${SALIDA(stake)}`;
  return json(await geminiFoto(b64, archivo.type || "image/jpeg", prompt));
}

export async function leerTexto(texto, stake) {
  const prompt = `El usuario quiere registrar una apuesta deportiva. Interpreta este texto:
"${texto}"

${FORMATO}

${SALIDA(stake)}`;
  return json(await deepseek([{ role: "user", content: prompt }]));
}

const resueltas = (bets) => bets.filter((b) => b.result !== "pending").map(({ date, type, desc, odds, stake, result, pl }) => ({ date, type, desc, odds, stake, result, pl }));

export async function analizar(bets) {
  const prompt = `Eres analista experto de apuestas deportivas. Analiza este historial EN ESPAÑOL.
Historial: ${JSON.stringify(resueltas(bets))}
Devuelve SOLO JSON válido:
{"resumen":"2-3 frases","stats":{"totalBets":N,"wins":N,"losses":N,"cashouts":N,"winRate":"X%","roi":"X%","totalPL":N,"avgOdds":N},"mejoresMercados":[{"mercado":"nombre","record":"W-L","pl":N,"nota":"breve"}],"peoresMercados":[{"mercado":"nombre","record":"W-L","pl":N,"nota":"breve"}],"diasSemana":[{"dia":"nombre","bets":N,"wins":N,"pl":N}],"ligas":[{"liga":"nombre","bets":N,"wins":N,"pl":N}],"rachas":"descripción","insights":["1","2","3"],"recomendaciones":["1","2","3"]}
Sé específico. Identifica ligas por nombres de equipos. El campo "roi" es el yield: beneficio total / total apostado.`;
  return json(await deepseek([{ role: "user", content: prompt }], 0.4));
}

export async function cronica(bets) {
  const todas = resueltas(bets);
  const hace7 = new Date(Date.now() - 7 * 864e5);
  const semana = todas.filter((b) => new Date(b.date + "T12:00:00") >= hace7);
  if (!semana.length) return { vacio: true, mensaje: "No hay apuestas resueltas en los últimos 7 días." };
  const prompt = `Eres periodista deportivo. Escribe crónica de apuestas en ESPAÑOL, ameno y profesional.
Semana: ${JSON.stringify(semana)}
Historial: ${JSON.stringify(todas.map(({ date, result, pl, odds }) => ({ date, result, pl, odds })))}
Devuelve SOLO JSON válido:
{"titular":"máx 60 chars estilo prensa deportiva","subtitulo":"resumen del balance de la semana","cronica":"3-4 párrafos contando cada apuesta, partidos, resultados y sorpresas. Sé específico con datos.","balance":{"apuestas":N,"ganadas":N,"perdidas":N,"cashouts":N,"pl":N,"roi":"X%"},"mejorApuesta":"cuál fue y por qué","peorApuesta":"cuál fue y por qué dolió","leccion":"qué se debió hacer mejor","perspectiva":"cómo vamos en general y qué ajustar"}`;
  return json(await deepseek([{ role: "user", content: prompt }], 0.6));
}

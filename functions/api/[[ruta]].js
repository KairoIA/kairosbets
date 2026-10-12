// KairosBets · copia en la nube (12-oct-2026). Función de Cloudflare Pages que atiende /api/*.
// Javi: «deberías ser capaz de meterte y verlo». Hasta ahora todo vivía solo en el móvil; desde esta versión la app
// sube sola una copia completa (la misma de «Guardar copia») cada vez que cambia algo, y Claude la lee desde el VDS.
//
// Dónde se guarda: KV «kairosbets_nube» (enlazado como NUBE en el proyecto Pages; la vista previa usa
// «kairosbets_nube_prueba»). Claves de KV:
//   movil_huella            SHA-256 de la llave del móvil emparejado (la llave nunca se guarda aquí)
//   emparejar_abierto       existe solo mientras hay ventana de emparejamiento (caduca sola)
//   copia_actual            la última copia que mandó el móvil (metadatos: recibida, apuestas)
//   copia_dia:AAAA-MM-DD    la última copia de cada día (hora de Madrid), se borra sola a los 400 días
//   copia_respaldo:<iso>    la copia anterior, si la nueva trae bastantes apuestas menos (por si se borra algo sin querer)
//
// Quién entra (cabecera Authorization: Bearer <llave>):
//   móvil   su llave la crea el propio móvil (32 bytes al azar). Vale solo si se emparejó con la ventana abierta.
//   lector  la llave del VDS (variable de usuario KAIROSBETS_LECTOR); aquí solo está su huella (LECTOR_HUELLA).
// Así ninguna llave pasa por el chat ni por el código, que es público.
//
//   PUT  /api/copia              móvil   guarda la copia
//   GET  /api/copia[?dia=…]      ambos   devuelve la copia (o la de ese día)
//   POST /api/copia/emparejar    —       {clave}: empareja el móvil si la ventana está abierta
//   POST /api/copia/abrir        lector  {horas}: abre la ventana de emparejamiento (1-24 h, 12 por defecto)
//   GET  /api/copia/estado       lector  emparejado, ventana, última copia
//   GET  /api/copia/dias         lector  días con copia
//
// Cambios de Claude (12-oct-2026, Javi: «corrígelo tú, deberías tener poder para modificar las cosas de la app»).
// Claude deja cambios en una bandeja (KV «cambios») y la app los aplica al abrirse o mientras está abierta, avisa de
// lo que cambió con «Deshacer» y lo confirma (sale de la bandeja y queda en «cambios_hechos», las 200 últimas).
//   POST /api/copia/cambios          lector  {cambios: [{tipo:"actualizar", id, campos, motivo} | {tipo:"anadir", apuesta, motivo}]}
//   GET  /api/copia/cambios          ambos   la bandeja
//   POST /api/copia/cambios/hechos   móvil   {hechos: [{cid, resultado}]}
//   POST /api/copia/cambios/anular   lector  {cids}: quita cambios que aún no ha cogido el móvil
//   GET  /api/copia/cambios/hechos   lector  los últimos aplicados

const CABECERAS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const responder = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: CABECERAS });
const MAX_BYTES = 2_000_000;
const DIAS_GUARDADOS = 400;

async function huella(texto) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function quien(request, env) {
  const llave = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (llave.length < 32) return null;
  const h = await huella(llave);
  if (env.LECTOR_HUELLA && h === env.LECTOR_HUELLA) return "lector";
  const movil = await env.NUBE.get("movil_huella");
  return movil && h === movil ? "movil" : null;
}

const diaMadrid = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
const contarApuestas = (d) => Object.values(d?.apuestas || {}).reduce((n, l) => n + (Array.isArray(l) ? l.length : 0), 0);

async function guardarCopia(request, env) {
  const texto = await request.text();
  if (texto.length > MAX_BYTES) return responder({ error: "copia demasiado grande" }, 413);
  let d;
  try { d = JSON.parse(texto); } catch { return responder({ error: "no es JSON" }, 400); }
  // Un móvil vacío o un archivo que no es de KairosBets nunca pisa la copia buena
  if (d?.app !== "KairosBets" || !Array.isArray(d.temporadas?.lista) || !d.temporadas.lista.length || typeof d.apuestas !== "object")
    return responder({ error: "no es una copia de KairosBets con temporadas" }, 422);
  const recibida = new Date().toISOString();
  const apuestas = contarApuestas(d);
  const anterior = await env.NUBE.getWithMetadata("copia_actual");
  if (anterior.value && (anterior.metadata?.apuestas || 0) - apuestas >= 3)
    await env.NUBE.put("copia_respaldo:" + recibida, anterior.value, { metadata: anterior.metadata, expirationTtl: DIAS_GUARDADOS * 86400 });
  const metadata = { recibida, apuestas };
  await env.NUBE.put("copia_actual", texto, { metadata });
  await env.NUBE.put("copia_dia:" + diaMadrid(), texto, { metadata, expirationTtl: DIAS_GUARDADOS * 86400 });
  return responder({ ok: true, recibida, apuestas });
}

async function leerCopia(url, env) {
  const dia = url.searchParams.get("dia");
  if (dia && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return responder({ error: "día mal escrito (AAAA-MM-DD)" }, 400);
  const { value, metadata } = await env.NUBE.getWithMetadata(dia ? "copia_dia:" + dia : "copia_actual");
  if (!value) return responder({ error: "no hay copia" }, 404);
  return new Response(value, { headers: { ...CABECERAS, "x-recibida": metadata?.recibida || "" } });
}

async function emparejar(request, env) {
  let clave = "";
  try { clave = String((await request.json())?.clave || ""); } catch { /* cuerpo vacío o roto */ }
  if (!/^[0-9a-f]{64}$/.test(clave)) return responder({ error: "llave no válida" }, 400);
  const h = await huella(clave);
  if ((await env.NUBE.get("movil_huella")) === h) return responder({ ok: true, ya: true });
  if (!(await env.NUBE.get("emparejar_abierto"))) return responder({ error: "emparejamiento cerrado" }, 403);
  await env.NUBE.put("movil_huella", h, { metadata: { emparejado: new Date().toISOString() } });
  await env.NUBE.delete("emparejar_abierto");   // el primero que llega la cierra
  return responder({ ok: true });
}

async function abrirVentana(request, env) {
  let horas = 12;
  try { horas = Number((await request.json())?.horas) || 12; } catch { /* sin cuerpo: 12 h */ }
  horas = Math.min(24, Math.max(1, horas));
  const hasta = new Date(Date.now() + horas * 3600_000).toISOString();
  await env.NUBE.put("emparejar_abierto", hasta, { expirationTtl: Math.round(horas * 3600) });
  return responder({ ok: true, hasta });
}

async function estado(env) {
  const movil = await env.NUBE.getWithMetadata("movil_huella");
  const ventana = await env.NUBE.get("emparejar_abierto");
  const actual = await env.NUBE.getWithMetadata("copia_actual");   // no list(): tarda hasta un minuto en ver lo nuevo
  return responder({ emparejado: !!movil.value, emparejado_en: movil.metadata?.emparejado || null, ventana_hasta: ventana || null, ultima: actual.metadata || null });
}

async function dias(env) {
  const lista = [];
  let cursor;
  do {
    const r = await env.NUBE.list({ prefix: "copia_dia:", cursor });
    lista.push(...r.keys.map((k) => ({ dia: k.name.slice(10), ...k.metadata })));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return responder({ dias: lista });
}

// ── Cambios de Claude ────────────────────────────────────────────────────────────────────────────────────────
const CAMPOS = ["date", "type", "desc", "odds", "stake", "result", "pl", "notes"];
const RESULTADOS = ["pending", "win", "loss", "cashout"];
const leerLista = async (env, clave) => { try { return JSON.parse((await env.NUBE.get(clave)) || "[]"); } catch { return []; } };

function validarCampos(c) {
  if (!c || typeof c !== "object") return "faltan los campos";
  for (const k of Object.keys(c)) if (!CAMPOS.includes(k)) return `campo no permitido: ${k}`;
  if ("result" in c && !RESULTADOS.includes(c.result)) return `resultado no válido: ${c.result}`;
  for (const k of ["odds", "stake"]) if (k in c && !(Number(c[k]) > 0)) return `${k} no válido`;
  if ("pl" in c && c.pl !== null && !Number.isFinite(Number(c.pl))) return "pl no válido";
  return null;
}

async function ponerCambios(request, env) {
  let lista;
  try { lista = (await request.json())?.cambios; } catch { return responder({ error: "no es JSON" }, 400); }
  if (!Array.isArray(lista) || !lista.length || lista.length > 50) return responder({ error: "manda entre 1 y 50 cambios" }, 400);
  const nuevos = [];
  for (const c of lista) {
    let fallo = null;
    if (c?.tipo === "actualizar") fallo = !c.id ? "falta el id" : validarCampos(c.campos);
    else if (c?.tipo === "anadir") {
      const { id, ...resto } = c.apuesta || {};
      fallo = !id ? "la apuesta nueva necesita id" : validarCampos(resto) || (!resto.desc || !(Number(resto.odds) > 0) || !(Number(resto.stake) > 0) ? "a la apuesta nueva le falta desc, odds o stake" : null);
    } else fallo = "tipo no válido (actualizar | anadir)";
    if (fallo) return responder({ error: fallo, cambio: c }, 422);
    nuevos.push({ ...c, cid: crypto.randomUUID(), creado: new Date().toISOString() });
  }
  const bandeja = await leerLista(env, "cambios");
  await env.NUBE.put("cambios", JSON.stringify([...bandeja, ...nuevos]));
  return responder({ ok: true, cids: nuevos.map((c) => c.cid) });
}

async function cambiosHechos(request, env) {
  let hechos;
  try { hechos = (await request.json())?.hechos; } catch { return responder({ error: "no es JSON" }, 400); }
  if (!Array.isArray(hechos)) return responder({ error: "faltan los hechos" }, 400);
  const cids = new Set(hechos.map((h) => h?.cid));
  const bandeja = await leerLista(env, "cambios");
  const quedan = bandeja.filter((c) => !cids.has(c.cid));
  const cuando = new Date().toISOString();
  const log = [...(await leerLista(env, "cambios_hechos")), ...bandeja.filter((c) => cids.has(c.cid)).map((c) => ({ ...c, aplicado: cuando, resultado: hechos.find((h) => h.cid === c.cid)?.resultado || "" }))];
  await env.NUBE.put("cambios", JSON.stringify(quedan));
  await env.NUBE.put("cambios_hechos", JSON.stringify(log.slice(-200)));
  return responder({ ok: true, quedan: quedan.length });
}

async function anularCambios(request, env) {
  let cids;
  try { cids = new Set((await request.json())?.cids || []); } catch { return responder({ error: "no es JSON" }, 400); }
  const bandeja = await leerLista(env, "cambios");
  const quedan = bandeja.filter((c) => !cids.has(c.cid));
  await env.NUBE.put("cambios", JSON.stringify(quedan));
  return responder({ ok: true, anulados: bandeja.length - quedan.length, quedan: quedan.length });
}

export async function onRequest({ request, env, params }) {
  if (!env.NUBE) return responder({ error: "falta el almacén NUBE en el proyecto" }, 500);
  const url = new URL(request.url);
  const ruta = (Array.isArray(params.ruta) ? params.ruta : [params.ruta]).filter(Boolean).join("/");
  const m = request.method;
  try {
    if (ruta === "copia/emparejar" && m === "POST") return await emparejar(request, env);
    const rol = await quien(request, env);
    if (ruta === "copia") {
      if (m === "PUT") return rol === "movil" ? await guardarCopia(request, env) : responder({ error: "sin permiso" }, 401);
      if (m === "GET") return rol ? await leerCopia(url, env) : responder({ error: "sin permiso" }, 401);
      return responder({ error: "método no permitido" }, 405);
    }
    if (ruta === "copia/cambios") {
      if (m === "GET") return rol ? responder({ cambios: await leerLista(env, "cambios") }) : responder({ error: "sin permiso" }, 401);
      if (m === "POST") return rol === "lector" ? await ponerCambios(request, env) : responder({ error: "sin permiso" }, 401);
      return responder({ error: "método no permitido" }, 405);
    }
    if (ruta === "copia/cambios/hechos") {
      if (m === "POST") return rol === "movil" ? await cambiosHechos(request, env) : responder({ error: "sin permiso" }, 401);
      if (m === "GET") return rol === "lector" ? responder({ hechos: await leerLista(env, "cambios_hechos") }) : responder({ error: "sin permiso" }, 401);
      return responder({ error: "método no permitido" }, 405);
    }
    if (ruta === "copia/cambios/anular" && m === "POST")
      return rol === "lector" ? await anularCambios(request, env) : responder({ error: "sin permiso" }, 401);
    if (["copia/abrir", "copia/estado", "copia/dias"].includes(ruta)) {
      if (rol !== "lector") return responder({ error: "sin permiso" }, 401);
      if (ruta === "copia/abrir" && m === "POST") return await abrirVentana(request, env);
      if (ruta === "copia/estado" && m === "GET") return await estado(env);
      if (ruta === "copia/dias" && m === "GET") return await dias(env);
      return responder({ error: "método no permitido" }, 405);
    }
    return responder({ error: "no existe" }, 404);
  } catch (e) {
    return responder({ error: "fallo interno", detalle: String(e?.message || e) }, 500);
  }
}

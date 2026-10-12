# KairosBets

**Value Betting Tracker** de KairosLab. PWA para el móvil: apuntar apuestas (a mano, o mandándole el pantallazo a Kaira, que devuelve un enlace), liquidarlas y seguir el bankroll por temporadas.

App: **https://kairosbets.pages.dev** (desde el 06-oct-2026; las direcciones de antes en kairoia.github.io redirigen ahí)

## Qué hace (versión 2, oct-2026)
- **Temporadas.** Cada temporada tiene su bankroll inicial y su stake habitual. Al cerrar una, queda en el archivo y se puede consultar siempre (resumen, gráfica, historial), y la nueva empieza a cero.
- **Inicio:** bankroll disponible, neto, ROI (beneficio / lo apostado) y crecimiento del bankroll. Las apuestas en juego se liquidan con un toque.
- **Gráfica** del bankroll e **historial** con búsqueda y filtros.
- **Sin IA dentro de la app (07-oct-2026):** se quitaron la lectura de capturas (Gemini), el análisis y la crónica semanal (DeepSeek). Las capturas las lee Kaira (la secretaria de Javi, en la oficina) y devuelve un enlace `#paquete=` que la app enseña y pide confirmar antes de añadir.
- **Exportar a Excel** (.xlsx, hecho en el propio móvil): pestaña «Resumen» y una por temporada.
- **Copia de seguridad** en un archivo (guardar / cargar), para cambiar de móvil.

Los datos viven en el móvil (`localStorage`); no hay Hoja de Google (decisión de oct-2026). La app ya no guarda claves de IA (al abrirse borra las que hubiera). **Nunca van claves en el código**, que es público.

## Copia en la nube (12-oct-2026)
Javi: «mira la app… deberías ser capaz de meterte y verlo». Cada vez que cambian las temporadas o las apuestas, la app sube sola una copia completa (la misma de «Guardar copia») a `/api/copia`. Así Claude la lee desde el VDS (cash outs, liquidaciones) y perder el móvil no es perder la temporada.
- **Servidor:** `functions/api/[[ruta]].js` (Pages Functions, solo atiende `/api/*`). Guarda en el KV `kairosbets_nube` (enlazado como `NUBE` en producción; la vista previa usa `kairosbets_nube_prueba`). Copia actual + la última de cada día (400 días) + respaldo si una copia nueva trae 3 o más apuestas menos. Un móvil vacío nunca pisa la copia buena.
- **App:** `app/src/datos/nube.js` (sube 1,5 s después de cada cambio, al abrir y al salir; si nada cambió no sube). Ajustes enseña «Nube: copia guardada hace…». En un móvil nuevo, «Recuperar mi copia de la nube».
- **Llaves (ninguna pasa por el chat ni por el código):** la del móvil la crea el propio móvil y el servidor solo guarda su huella. Vale si se empareja con la **ventana de emparejamiento** abierta, que abre Claude desde el VDS y que se cierra sola con el primer móvil que llega. La del VDS está en la variable de usuario `KAIROSBETS_LECTOR`; en Cloudflare solo está su huella (`LECTOR_HUELLA`).
- **Desde el VDS:** `Bets/kairosbets_nube.py` (`ver`, `bajar`, `estado`, `abrir --horas 12`, `dias`; `--base https://prueba.kairosbets.pages.dev` para la prueba).
- **Móvil nuevo o app reinstalada:** `kairosbets_nube.py abrir` → abrir la app → «Recuperar mi copia de la nube».
- Los bindings (KV y `LECTOR_HUELLA`) están en la configuración del proyecto Pages, no en un wrangler.toml. El token de Cloudflare del VDS no tiene permiso de KV: se crearon con el conector de Cloudflare de Claude.

## Desarrollo y publicación
```bash
npm install
npm run build     # compila app/ y deja la app en dist/
npx wrangler@latest pages deploy dist --project-name kairosbets --branch main   # con CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID
```
- Se publica desde la raíz del repo: wrangler compila `functions/` junto con `dist/`. Para probar sin tocar lo de Javi: `--branch prueba` → https://prueba.kairosbets.pages.dev (almacén de prueba).
- El código está en `app/src/`: los datos en `datos/`, las pantallas en `pantallas/` y los estilos en `estilos.css`. En `app/public/` están `manifest.json`, `sw.js`, `icons/` y `_headers`, que se copian tal cual.
- **Por qué Cloudflare y no GitHub Pages:** el 06-oct-2026, en el móvil de Javi, Chrome tenía apuntada una app rota para todo kairoia.github.io. Al instalar salía «This app is already installed» y luego «Could not open app», aunque no aparecía en Aplicaciones. Cambiar la dirección dentro de ese sitio no sirvió.
- **Datos:** el navegador los guarda por sitio, así que se quedaron en kairoia.github.io. El botón «Traer mis datos» de la app abre `kairoia.github.io/kb/traspaso.html` (en el repo `KairoIA/kairoia.github.io`), que manda temporadas y apuestas solo a esta app. Fuera de ese caso, la página ofrece descargar una copia.
- La raíz de este repo (/kairosbets/) y `kairoia.github.io/kb/` solo redirigen, y sus service workers se dan de baja solos.

---
*KairosLab · 2026*

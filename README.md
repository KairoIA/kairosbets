# KairosBets

**Value Betting Tracker** de KairosLab. PWA para el móvil: apuntar apuestas (a mano, o mandándole el pantallazo a Claude, que las escribe directamente), liquidarlas y seguir el dinero y el resultado por temporadas.

App: **https://kairosbets.pages.dev** (desde el 06-oct-2026; las direcciones de antes en kairoia.github.io redirigen ahí)

## Qué hace (versión 2, oct-2026)
- **Temporadas.** Cada temporada tiene su bankroll inicial y su stake habitual. Al cerrar una, queda en el archivo y se puede consultar siempre (resumen, gráfica, historial), y la nueva empieza a cero.
- **Inicio (13-nov-2026, Javi: «exceso de métricas»):** dinero disponible, neto, win rate y racha; lo puesto y lo retirado con botones «Meter» y «Retirar». Las apuestas en juego se liquidan con un toque. Yield y ROI en pequeño debajo (ROI = neto ÷ lo puesto, con recargas). Fuera total apostado, cuota media y el tablero de contadores.
- **Gráfica** del resultado acumulado (empieza en 0) con máximo, mínimo, peor caída (la mayor bajada desde cualquier punto alto, en € y cuántas apuestas) y mejor y peor racha. **Historial** con búsqueda y filtros.
- **Apuntar desde capturas (13-nov-2026):** Javi pasa la captura en el chat de Claude y Claude la escribe en la app por la bandeja de la nube (`boletos.py nuevo` + `kairosbets_nube.py anadir <id>`); la app la aplica sola al abrirse o en ≤1 min, con aviso «Claude ha cambiado» y Deshacer. Sin enlace ni confirmar. El enlace `#paquete=` queda para Kaira.
- **Sin IA dentro de la app (07-oct-2026):** se quitaron la lectura de capturas (Gemini), el análisis y la crónica semanal (DeepSeek). Las capturas las lee Kaira (la secretaria de Javi, en la oficina) y devuelve un enlace `#paquete=` que la app enseña y pide confirmar antes de añadir.
- **Exportar a Excel** (.xlsx, hecho en el propio móvil): pestaña «Resumen» y una por temporada.
- **Copia de seguridad** en un archivo (guardar / cargar), para cambiar de móvil.

Los datos viven en el móvil (`localStorage`); no hay Hoja de Google (decisión de oct-2026). La app ya no guarda claves de IA (al abrirse borra las que hubiera). **Nunca van claves en el código**, que es público.

## Tu dinero (12-oct-2026)
Javi: «la primera apuesta se pierde, me deja en −15 y tengo que poner otros 15; quiero ver lo que sale de mi bolsillo, lo que voy retirando y el ROI sobre lo que he puesto». Cada temporada lleva `movimientos` (`{id, fecha, tipo: ingreso|retirada, importe, nota}`, dentro de `kairosbets_temporadas`).
- **Has puesto** = bankroll inicial + ingresos + **recargas automáticas** (13-nov-2026, Javi: «el bankroll debería ser el dinero disponible… contando con los 15 € de stake que se ponen nuevos si estamos under the water»): si al echar una apuesta no queda dinero libre para su stake, se cuenta que Javi mete ese stake de su bolsillo. No se guardan: se calculan siempre (`cuenta()` en `calculos.js`, y la misma cuenta en `kairosbets_nube.py ver`). Si metió otra cantidad, la apunta a mano y la automática deja de salir (solo salta cuando no llega).
- **Disponible** = has puesto − retirado + neto − lo que está en juego. El que vale es el de la app: el saldo de bet365 no sirve para compararlo (Javi echa allí otras apuestas fuera del método). No se puede retirar más de lo disponible.
- Meter o retirar no es ganar ni perder: la Gráfica va solo con resultados (neto acumulado).
- Se apunta en la pantalla «Tu dinero» (botones «Meter»/«Retirar» del Inicio) o desde el VDS: `Bets/kairosbets_nube.py dinero meter|retirar <importe> --fecha … --nota …`.

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

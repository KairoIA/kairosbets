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

Todo vive en el móvil (`localStorage`); no hay servidor ni Hoja de Google (decisión de oct-2026). La app ya no guarda claves de IA (al abrirse borra las que hubiera). **Nunca van claves en el código**, que es público.

## Desarrollo y publicación
```bash
npm install
npm run build     # compila app/ y deja la app en dist/
npx wrangler@latest pages deploy dist --project-name kairosbets --branch main   # con CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID
```
- El código está en `app/src/`: los datos en `datos/`, las pantallas en `pantallas/` y los estilos en `estilos.css`. En `app/public/` están `manifest.json`, `sw.js`, `icons/` y `_headers`, que se copian tal cual.
- **Por qué Cloudflare y no GitHub Pages:** el 06-oct-2026, en el móvil de Javi, Chrome tenía apuntada una app rota para todo kairoia.github.io. Al instalar salía «This app is already installed» y luego «Could not open app», aunque no aparecía en Aplicaciones. Cambiar la dirección dentro de ese sitio no sirvió.
- **Datos:** el navegador los guarda por sitio, así que se quedaron en kairoia.github.io. El botón «Traer mis datos» de la app abre `kairoia.github.io/kb/traspaso.html` (en el repo `KairoIA/kairoia.github.io`), que manda temporadas y apuestas solo a esta app. Fuera de ese caso, la página ofrece descargar una copia.
- La raíz de este repo (/kairosbets/) y `kairoia.github.io/kb/` solo redirigen, y sus service workers se dan de baja solos.

---
*KairosLab · 2026*

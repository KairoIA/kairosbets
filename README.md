# KairosBets

**Value Betting Tracker** de KairosLab. PWA para el móvil: apuntar apuestas (a mano, con una captura o escribiéndolas), liquidarlas, seguir el bankroll por temporadas y analizarlas con IA.

App: **https://kairosbets.pages.dev** (desde el 06-oct-2026; las direcciones de antes en kairoia.github.io redirigen ahí)

## Qué hace (versión 2, oct-2026)
- **Temporadas.** Cada temporada tiene su bankroll inicial y su stake habitual. Al cerrar una, queda en el archivo y se puede consultar siempre (resumen, gráfica, historial), y la nueva empieza a cero.
- **Inicio:** bankroll disponible, neto, ROI (beneficio / lo apostado) y crecimiento del bankroll. Las apuestas en juego se liquidan con un toque.
- **Gráfica** del bankroll e **historial** con búsqueda y filtros.
- **IA:** análisis de la temporada y crónica semanal (DeepSeek), y lectura de capturas (Gemini).
- **Exportar a Excel** (.xlsx, hecho en el propio móvil): pestaña «Resumen» y una por temporada.
- **Copia de seguridad** en un archivo (guardar / cargar), para cambiar de móvil.

Todo vive en el móvil (`localStorage`); no hay servidor ni Hoja de Google (decisión de oct-2026). Las claves de IA se pegan en Ajustes y no salen del móvil: **nunca van en el código**, que es público.

## Desarrollo y publicación
```bash
npm install
npm run build     # compila app/ y deja la app en dist/
npx wrangler@latest pages deploy dist --project-name kairosbets --branch main   # con CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID
```
- El código está en `app/src/`: los datos en `datos/`, las pantallas en `pantallas/` y los estilos en `estilos.css`. En `app/public/` están `manifest.json`, `sw.js`, `icons/` y `_headers`, que se copian tal cual.
- **Por qué Cloudflare y no GitHub Pages:** el 06-oct-2026, en el móvil de Javi, Chrome tenía apuntada una app rota para todo kairoia.github.io. Al instalar salía «This app is already installed» y luego «Could not open app», aunque no aparecía en Aplicaciones. Cambiar la dirección dentro de ese sitio no sirvió.
- **Datos:** el navegador los guarda por sitio, así que se quedaron en kairoia.github.io. El botón «Traer mis datos» de la app abre `kairoia.github.io/kb/traspaso.html` (en el repo `KairoIA/kairoia.github.io`), que manda temporadas, apuestas y claves de IA solo a esta app. Fuera de ese caso, la página ofrece descargar una copia.
- La raíz de este repo (/kairosbets/) y `kairoia.github.io/kb/` solo redirigen, y sus service workers se dan de baja solos.

---
*KairosLab · 2026*

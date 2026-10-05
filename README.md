# KairosBets

**Value Betting Tracker** de KairosLab. PWA para el móvil: apuntar apuestas (a mano, con una captura o escribiéndolas), liquidarlas, seguir el bankroll por temporadas y analizarlas con IA.

App: https://kairoia.github.io/kairosbets/

## Qué hace (versión 2, oct-2026)
- **Temporadas.** Cada temporada tiene su bankroll inicial y su stake habitual. Al cerrar una, queda en el archivo y se puede consultar siempre (resumen, gráfica, historial), y la nueva empieza a cero.
- **Inicio:** bankroll disponible, neto, ROI (beneficio / lo apostado) y crecimiento del bankroll. Las apuestas en juego se liquidan con un toque.
- **Gráfica** del bankroll e **historial** con búsqueda y filtros.
- **IA:** análisis de la temporada y crónica semanal (DeepSeek), y lectura de capturas (Gemini).
- **Copia en una Hoja de Google:** cada temporada en su pestaña. Si la copia falla, la app lo dice y reintenta. Desde la Hoja se puede recuperar todo en un móvil nuevo.
- **Exportar / cargar copia** en un archivo.

Los datos viven en el móvil (`localStorage`). Las claves de IA y la dirección de la Hoja se pegan en Ajustes y no salen del móvil: **nunca van en el código**, que es público.

## Desarrollo
```bash
npm install
npm run build     # compila app/ y deja index.html + assets/ en la raíz (lo que sirve GitHub Pages)
```
- Código: `app/src/` (datos en `datos/`, pantallas en `pantallas/`, estilos en `estilos.css`).
- `sw.js` (raíz): la página va por red primero (las versiones nuevas llegan solas) y funciona sin conexión.
- Tras cambiar el código hay que hacer `npm run build` y subir también `index.html` y `assets/`.

## La Hoja de Google
`hoja/Codigo.gs` va pegado en la Hoja (Extensiones → Apps Script) y publicado como aplicación web (ejecutar como: yo; acceso: cualquier usuario). La dirección que da se pega en la app: Ajustes → Copia en la Hoja.

---
*KairosLab · 2026*

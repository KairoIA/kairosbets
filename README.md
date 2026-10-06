# KairosBets

**Value Betting Tracker** de KairosLab. PWA para el móvil: apuntar apuestas (a mano, con una captura o escribiéndolas), liquidarlas, seguir el bankroll por temporadas y analizarlas con IA.

App: **https://kairoia.github.io/kb/** (desde el 06-oct-2026; la dirección de antes, /kairosbets/, redirige ahí)

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
npm run build     # compila app/ y deja la app en ../kairoia.github.io/kb/
```
- El código está en `app/src/`: los datos en `datos/`, las pantallas en `pantallas/` y los estilos en `estilos.css`. En `app/public/` están `manifest.json`, `sw.js` e `icons/`, que se copian tal cual.
- **Dónde se publica:** en el repositorio de la web pública de KairosLab (`KairoIA/kairoia.github.io`, carpeta `kb/`), clonado al lado de este. Después de `npm run build` hay que subir ese repositorio. Este repo guarda el código y, en su raíz, solo la página que redirige de la dirección vieja.
- **Por qué /kb/:** el 06-oct-2026, en el móvil de Javi, Chrome se quedó con el registro de la app vieja de /kairosbets/ («This app is already installed» → «Could not open app») y no dejaba reinstalarla. La dirección nueva está en el mismo sitio, así que los datos guardados son los mismos.
- `sw.js` de /kb/: la página y el manifiesto van por red primero (las versiones nuevas llegan solas) y la app funciona sin conexión. Su caché se llama `kb-/kb/-N`.

---
*KairosLab · 2026*

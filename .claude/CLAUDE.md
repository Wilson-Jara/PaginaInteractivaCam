# CLAUDE.md — PaginaInteractivaCam (GameHub)

Documentación completa del proyecto para tener todo el contexto en un solo lugar.

## Resumen

Plataforma web de **juegos interactivos controlados con la cámara** (detección de manos
con MediaPipe / OpenCV / Pygame). El sitio es un catálogo tipo "GameHub" construido con
**Astro**, y el primer juego jugable es **Block Breaker**, un clon de Google Block Breaker
que se controla moviendo la mano frente a la webcam.

- **Framework web:** Astro `^6.4.4` (salida estática, sin integraciones de UI).
- **Lenguaje:** TypeScript (`astro/tsconfigs/strict`).
- **Node:** `>=22.12.0`.
- **Idioma del sitio:** español (`<html lang="es">`).
- **Gestores de paquetes:** hay tanto `package-lock.json` (npm) como `pnpm-lock.yaml` (pnpm).
  El monorepo declara `pnpm-workspace.yaml`. Usar **uno solo** de forma consistente (ver Notas).

## Comandos

Todos desde la raíz del proyecto:

| Comando           | Acción                                            |
| :---------------- | :------------------------------------------------ |
| `npm install`     | Instala dependencias                              |
| `npm run dev`     | Servidor de desarrollo en `localhost:4321`        |
| `npm run build`   | Build de producción a `./dist/`                   |
| `npm run preview` | Previsualiza el build local                       |
| `npm run astro`   | CLI de Astro (`astro add`, `astro check`, etc.)   |

## Estructura del proyecto

```
PaginaInteractivaCam/
├── .claude/                      # Config local de Claude Code + este CLAUDE.md
│   └── settings.local.json       # Settings locales (NO contiene secretos)
├── .vscode/                      # Recomendación de extensión Astro + launch config
├── astro.config.mjs              # Config Astro (ignora ./juegos en el watcher de Vite)
├── tsconfig.json                 # Extiende astro/tsconfigs/strict
├── package.json                  # name: "pagina", dep única: astro
├── pnpm-workspace.yaml           # allowBuilds: esbuild / sharp
├── public/                       # Estáticos (favicon)
├── juegos/                       # Backends Python de los juegos (FUERA del build web)
│   └── block-breaker/
│       ├── main.py               # Juego Block Breaker en Pygame (versión escritorio)
│       └── hand_landmarker.task  # Modelo MediaPipe (binario ~7 MB)
└── src/
    ├── layouts/Layout.astro      # Layout HTML base (head, meta, slot)
    ├── components/
    │   ├── Navbar.astro          # Barra superior con logo "JUEGOS"
    │   ├── Footer.astro          # Pie de página
    │   └── GameCard.astro        # Tarjeta de juego en la grilla
    ├── data/games.ts             # Catálogo de juegos (fuente de datos central)
    ├── pages/
    │   ├── index.astro           # Home: grilla de juegos + paginación (estática)
    │   ├── games/[id].astro      # Detalle de cada juego (ruta dinámica)
    │   └── jugar/block-breaker.astro  # El juego jugable (canvas + cámara + MediaPipe)
    └── styles/global.css         # Variables CSS (tema oscuro estilo Steam) + reset
```

## Arquitectura y flujo

### Datos de juegos — `src/data/games.ts`
- Define la interfaz `Game` y el array `games` (fuente única de verdad).
- Solo `block-breaker` es real; los otros **29** se generan con un bucle como placeholders
  (`juego-2` … `juego-30`) con tag `"Proximamente"`.
- También exporta `categories` (`Todos`, `MediaPipe`, `OpenCV`, `Pygame`).
- Campos de `Game`: `id`, `title`, `cover`, `tags`, `size?`, `category?`, `description?`,
  `pythonBackend?`, `mediapipe?`.

### Rutas (Astro)
- **`/`** (`index.astro`): mapea `games` a `<GameCard>`. La paginación es **decorativa**
  (links `#` estáticos, sin lógica real todavía).
- **`/games/[id]`** (`games/[id].astro`): usa `getStaticPaths()` sobre `games` para
  pre-renderizar una página de detalle por juego. Muestra 404 in-page si no encuentra el id.
  El botón **"Jugar ahora"** solo aparece para `id === "block-breaker"` y enlaza a
  `/jugar/block-breaker`.
- **`/jugar/block-breaker`**: la página del juego web real (ver abajo).

### Juego web — `src/pages/jugar/block-breaker.astro`
Es el archivo más importante y complejo. Todo el juego vive en un único
`<script is:inline type="module">` (~850 líneas de JS de canvas, sin dependencias npm).

- **Render:** `<canvas>` 2D. El layout combina el área de juego (640×720 + HUD 64) y la
  vista de cámara (480×360) lado a lado en el mismo canvas. Escala a DPR para pantallas HiDPI.
- **Control por mano:** se carga **MediaPipe Tasks Vision** vía CDN (jsDelivr,
  `@mediapipe/tasks-vision@0.10.35`) y el modelo `hand_landmarker.task` desde
  `storage.googleapis.com`. Usa el **nudillo central (landmark 9)** para mover la paleta
  (más estable que la punta del dedo) con amplificación 1.5× y suavizado (lerp 0.4).
  Un **puño cerrado** lanza la bola / reinicia.
- **Fallbacks:** intenta delegado **GPU** y cae a **CPU**; si no hay cámara o MediaPipe,
  se puede jugar con **mouse / touch / teclado** (flechas o A/D, Espacio, Esc).
- **Estados:** `start`, `playing`, `paused`, `clear`, `over`, `win`.
- **Contenido del juego:** 10 niveles (mapas ASCII), 7 power-ups
  (multi-bola, paleta larga, fireball, láser, slow, sticky, vida extra) con probabilidad
  ponderada, bloques normales / dobles (plateados, 3 hits) / TNT (explosión en radio) /
  power-up. Combos, partículas, vidas, puntuación.
- **Bucle:** timestep fijo a 60 FPS con acumulador; detección de manos en
  `requestVideoFrameCallback` cuando está disponible.

### Juego de escritorio — `juegos/block-breaker/main.py`
Versión **independiente en Python** (Pygame + OpenCV + MediaPipe Tasks) del mismo juego.
- Resolución mayor (960×768 + HUD 96, cámara 640×480), **15 niveles**, 7 power-ups,
  efectos más ricos (sombras, gradientes, glow, corazones de vida dibujados con fórmula
  paramétrica).
- Usa el **landmark 8 (punta del índice)** para mover, puño para lanzar/reiniciar.
- Requiere `hand_landmarker.task` en la **misma carpeta** (ya incluido).
- Esta carpeta `juegos/` está **excluida del watcher de Vite** (`astro.config.mjs`) y NO
  forma parte del sitio web — es código aparte. La web reimplementa el juego en JS/canvas.
- Para ejecutarlo: `cd juegos/block-breaker && python main.py` (necesita Python con
  `pygame`, `opencv-python`, `mediapipe`, `numpy` instalados; no hay `requirements.txt`).

## Estilos / Tema

`src/styles/global.css` define el tema con variables CSS (paleta oscura estilo Steam:
`--bg-primary:#1b2838`, `--accent:#66c0f4`, etc.), reset universal, fuente **Inter**
(Google Fonts) y scrollbar personalizado. Los componentes `.astro` usan `<style>` con
scope local; el juego usa `<style is:global>` con la fuente **Press Start 2P**.

## Notas, deuda técnica y oportunidades

- **Dos lockfiles** (`package-lock.json` + `pnpm-lock.yaml`): decidir npm **o** pnpm y borrar
  el otro para evitar drift de dependencias.
- **`README.md`** sigue siendo la plantilla por defecto de Astro ("Minimal Starter Kit") —
  conviene reemplazarlo por una descripción real del proyecto.
- **Paginación de la home es falsa** (links `#`); solo hay 30 juegos y casi todos placeholders.
- **Sin filtro por categoría** todavía, aunque `categories` ya está definido.
- **Sin `cover` en ningún juego** → siempre se muestra el placeholder SVG.
- **Dependencias del backend Python no declaradas** (no hay `requirements.txt`/`pyproject.toml`).
- **MediaPipe se carga desde CDN** en tiempo de ejecución: requiere internet para detección
  de manos en la versión web.
- **Branch principal:** `main`. Commits previos: "Inicio Pagina", "Solucion a problemas".

## Privacidad / qué se sube a GitHub

Revisado el repositorio: **no hay secretos, API keys, `.env` ni credenciales**. El control
por cámara ocurre **100% en el navegador** (o local en Python); el vídeo **no se envía a
ningún servidor**.

`.gitignore` ya excluye: `dist/`, `.astro/`, `node_modules/`, logs, `.env*`, `.DS_Store`,
`.idea/`.

⚠️ **Importante sobre este archivo:** la carpeta `.claude/` **NO** está en `.gitignore`, así
que tanto este `CLAUDE.md` como `.claude/settings.local.json` **se subirían a GitHub** tal
cual. `settings.local.json` no contiene secretos hoy, pero si quieres mantener `.claude/`
fuera del repo, añade una de estas líneas a `.gitignore`:

```
.claude/                 # ignora toda la carpeta
# — o, para conservar este CLAUDE.md pero no la config local —
.claude/settings.local.json
```

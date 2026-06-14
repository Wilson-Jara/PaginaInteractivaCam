# GameHub — Juegos interactivos controlados con la cámara

Plataforma web de **mini-juegos arcade que se controlan con la mano** frente a la
webcam, usando **MediaPipe Hand Landmarker**. El sitio es un catálogo tipo "GameHub"
(estilo Voltaic / Aimlabs) construido con **Astro**, con detección de manos 100% en
el navegador y una tabla de récords (leaderboard) en tiempo real con Firebase.

Juegos jugables hoy:

- **Block Breaker** — rompe bloques moviendo la paleta con la mano. Power-ups,
  niveles, combos y vidas.
- **Flappy Bird** — vuela entre tuberías abriendo la mano para aletear. 3 vidas,
  dificultad progresiva y récord.

---

## Tabla de contenidos

- [Stack y requisitos](#stack-y-requisitos)
- [Comandos](#comandos)
- [Arquitectura general](#arquitectura-general)
- [Estructura del proyecto](#estructura-del-proyecto)
- [El motor de juegos (engine)](#el-motor-de-juegos-engine)
- [Cómo añadir un juego nuevo](#cómo-añadir-un-juego-nuevo)
- [Control por cámara (MediaPipe)](#control-por-cámara-mediapipe)
- [Leaderboard y administración (Firebase)](#leaderboard-y-administración-firebase)
- [Temas y estilos](#temas-y-estilos)
- [Portadas de juegos](#portadas-de-juegos)
- [Versión de escritorio (Python)](#versión-de-escritorio-python)
- [Privacidad](#privacidad)
- [Notas y deuda técnica](#notas-y-deuda-técnica)

---

## Stack y requisitos

| Pieza            | Detalle                                                        |
| :--------------- | :------------------------------------------------------------- |
| Framework        | [Astro](https://astro.build) `^6.4.4` (salida estática)        |
| Lenguaje         | TypeScript (`astro/tsconfigs/strict`)                          |
| Render del juego | `<canvas>` 2D puro (sin librerías de juego)                    |
| Visión           | MediaPipe Tasks Vision `0.10.35` (cargado por CDN en runtime)  |
| Backend datos    | Firebase (Firestore + Auth) `^12`                              |
| Node             | `>= 22.12.0`                                                   |
| Idioma           | Español (`<html lang="es">`)                                   |

**Requisitos para jugar:** un navegador moderno con webcam y **conexión a internet**
(MediaPipe y su modelo se descargan desde CDN la primera vez). Sin cámara, los juegos
siguen siendo jugables con **teclado / mouse**.

---

## Comandos

Todos desde la raíz del proyecto:

| Comando           | Acción                                          |
| :---------------- | :---------------------------------------------- |
| `npm install`     | Instala dependencias                            |
| `npm run dev`     | Servidor de desarrollo en `localhost:4321`      |
| `npm run build`   | Build de producción a `./dist/`                 |
| `npm run preview` | Previsualiza el build local                     |
| `npm run astro`   | CLI de Astro (`astro check`, `astro add`, etc.) |

> Para verificar tipos: `npm run astro check`.

---

## Arquitectura general

La idea central es la **separación entre el motor (engine) y cada juego**:

```
┌──────────────────────────────────────────────────────────────┐
│  GameShell.astro  (layout reutilizable: 3 paneles)             │
│  ┌──────────────┬───────────────────────┬──────────────────┐  │
│  │  Leaderboard │      <canvas>         │  Cámara + Imagen  │  │
│  │  (Firestore) │   (el juego dibuja)   │  (MediaPipe view) │  │
│  └──────────────┴───────────────────────┴──────────────────┘  │
│         ▲                  ▲                      ▲             │
│         │                  │                      │            │
│   eventos game:over   GameRuntime           HandTracker        │
│   / game:restart      (loop 60 FPS)      (cámara + worker)     │
└──────────────────────────────────────────────────────────────┘
                            │
                    CameraGame (contrato)
                            │
            ┌───────────────┴───────────────┐
       BlockBreakerGame                 FlappyGame
```

- **El layout es genérico.** `GameShell.astro` monta los 3 paneles para *cualquier*
  juego; solo recibe un `gameId`.
- **El motor es agnóstico al juego.** `GameRuntime` aporta game loop a 60 FPS,
  escalado HiDPI e input unificado (mano + mouse + teclado). `HandTracker` aporta
  cámara + MediaPipe.
- **Cada juego solo implementa su lógica**, cumpliendo el contrato `CameraGame`
  (`update` / `render` / `reset` / `getScore` / `isGameOver`).
- **Una sola ruta** `/jugar/[id]` sirve a todos los juegos jugables.

---

## Estructura del proyecto

```
PaginaInteractivaCam/
├── astro.config.mjs            # Config Astro (ignora ./juegos en el watcher de Vite)
├── tsconfig.json               # Extiende astro/tsconfigs/strict
├── package.json                # deps: astro, firebase
├── public/
│   ├── favicon.svg
│   └── covers/                 # Portadas de los juegos (WebP optimizado)
│       ├── block-breaker.webp
│       └── flappy.webp
├── juegos/                     # Backends Python (FUERA del build web)
│   └── block-breaker/main.py
└── src/
    ├── layouts/Layout.astro    # HTML base (head, slot)
    ├── components/
    │   ├── Navbar.astro        # Barra superior + AdminLogin
    │   ├── Footer.astro
    │   ├── GameCard.astro      # Tarjeta del catálogo (estilo Aimlabs)
    │   ├── GameShell.astro     # ★ Layout reutilizable del juego (3 paneles)
    │   ├── Leaderboard.astro   # Tabla Top 15 en tiempo real (Firestore)
    │   └── AdminLogin.astro    # Login admin (botón en la navbar)
    ├── data/games.ts           # ★ Catálogo de juegos (fuente única de verdad)
    ├── lib/
    │   ├── firebase.ts         # Inicializa Firestore + Auth
    │   ├── firebaseConfig.ts   # Claves públicas de Firebase
    │   └── gameRegistry.ts     # ★ Mapa id -> factory (juegos jugables)
    ├── engine/                 # ★ Motor reutilizable (agnóstico al juego)
    │   ├── types.ts            # Contratos: CameraGame, GameInput, HandInput…
    │   ├── AbstractCameraGame.ts  # Clase base (Template Method)
    │   ├── GameRuntime.ts      # Game loop, escalado, input
    │   ├── HandTracker.ts      # Cámara + MediaPipe (+ Web Worker)
    │   ├── handWorker.ts       # Inferencia de manos en Web Worker
    │   ├── OneEuroFilter.ts    # Suavizado anti-jitter de la mano
    │   ├── events.ts           # Eventos game:over / game:restart
    │   └── canvasUtils.ts      # Helpers de canvas (rRect, overlap, clamp)
    ├── games/
    │   ├── _template/          # Plantilla para crear juegos nuevos
    │   ├── block-breaker/      # BlockBreakerGame, entities, levels, index
    │   └── flappy/             # FlappyGame, levels, index
    ├── pages/
    │   ├── index.astro         # Home: grilla de juegos
    │   ├── games/[id].astro    # Detalle de cada juego (ruta dinámica)
    │   └── jugar/[id].astro    # ★ El juego jugable (monta GameShell)
    └── styles/global.css       # Variables del tema (paleta Voltaic) + reset
```

Los archivos marcados con ★ son los que tocas al añadir un juego.

---

## El motor de juegos (engine)

### Contrato `CameraGame` (`engine/types.ts`)

Todo juego implementa esta interfaz (o extiende `AbstractCameraGame`):

```ts
interface CameraGame {
  readonly config: GameConfig;          // id + resolución lógica
  init(ctx): void;                       // una vez al montar
  update(input: GameInput): void;        // lógica por tick (60 FPS fijo)
  render(ctx): void;                     // dibujo (coords lógicas)
  reset(): void;
  getScore(): number;                    // para el leaderboard
  isGameOver(): boolean;
  onKey?(code, down): void;              // opcional
  onPointerDown?(x, y): void;            // opcional (coords lógicas)
}
```

### `GameInput` — entrada unificada por tick

```ts
interface GameInput {
  hand: HandInput;     // mano de MediaPipe (ver abajo)
  pointer: { x, y } | null;   // mouse/touch en coords lógicas
  keys: Record<string, boolean>;   // teclas por event.code
}

interface HandInput {
  present: boolean;    // ¿hay mano este frame?
  x, y: number;        // nudillo central (landmark 9), 0..1, espejado y suavizado
  tipX, tipY: number;  // punta del índice (landmark 8), 0..1, espejado y suavizado
  fist: boolean;       // puño cerrado
  landmarks: Landmark[] | null;  // crudos (para gestos propios / dibujo)
}
```

### `GameRuntime`

Responsable de todo lo repetible:

- Tamaño del lienzo + escalado a DPR (nitidez en pantallas HiDPI).
- **Game loop con paso fijo a 60 FPS** (acumulador → física determinista).
- Recolección de input (mano + mouse/touch + teclado) en un `GameInput` por tick.
- Transforma el contexto a **coordenadas lógicas** antes de `render()`: el juego
  dibuja siempre en `0..width / 0..height` sin pensar en el DPR.

### `AbstractCameraGame`

Clase base (patrón *Template Method*) que guarda el contexto y centraliza la
emisión de eventos hacia el leaderboard:

- `this.signalGameOver()` → emite `game:over` con el `id` y el score.
- `this.signalRestart()` → emite `game:restart` (limpia el aviso de récord).

---

## Cómo añadir un juego nuevo

La disposición visual ya está "guardada" en `GameShell.astro`, así que **cada juego
nuevo se ve idéntico** (leaderboard + canvas + cámara/imagen). Pasos:

1. **Copia la plantilla:** `src/games/_template` → `src/games/mi-juego`.
2. **Renombra** la clase y el `config.id` (debe coincidir con `games.ts`).
3. **Registra la factory** en `src/lib/gameRegistry.ts`:
   ```ts
   "mi-juego": async () => (await import("../games/mi-juego")).createMiJuego(),
   ```
4. **Añádelo al catálogo** en `src/data/games.ts` con `playable: true`:
   ```ts
   {
     id: "mi-juego",
     title: "Mi Juego",
     cover: "/covers/mi-juego.webp",
     tags: ["MediaPipe"],
     category: "MediaPipe",
     description: "…",
     playable: true,
   }
   ```
5. (Opcional) Pon su **portada** en `public/covers/mi-juego.webp`.

El juego aparece automáticamente en el catálogo y en `/jugar/mi-juego`. No hay que
tocar el layout ni la grilla. Ver `src/games/_template/README.md` para más detalle.

---

## Control por cámara (MediaPipe)

- Se carga **MediaPipe Tasks Vision** desde CDN (jsDelivr) y el modelo
  `hand_landmarker.task` desde `storage.googleapis.com`.
- La **inferencia corre en un Web Worker** (`handWorker.ts`) para no competir con el
  render del juego; si el worker falla, cae a inferencia en el hilo principal.
- La señal de la mano se suaviza con un **filtro One Euro** (anti-jitter) y se aplica
  **predicción de latencia** para compensar el retraso del pipeline de cámara.
- **Fallbacks:** intenta delegado GPU → CPU; sin cámara/MediaPipe se juega con
  mouse / touch / teclado.

Esquemas de control por juego:

- **Block Breaker:** la paleta sigue el **nudillo central** (landmark 9), con
  amplificación para mayor sensibilidad. Puño cerrado lanza la bola.
- **Flappy Bird:** **mano abierta = aletear** (≥3 dedos extendidos, réplica de
  `is_hand_open`). Sin mano o mano cerrada = cae por gravedad.

---

## Leaderboard y administración (Firebase)

### Cómo funciona

- El **Top 15** de cada juego se lee en **tiempo real** desde Firestore
  (`games/{gameId}/scores`) y se muestra en el panel izquierdo del juego.
- Al terminar una partida, el juego emite `game:over` con el score. Si entra en el
  Top 15, el panel ofrece **guardar el nombre del récord** — pero solo si hay un
  **admin logueado** (la seguridad real la imponen las reglas de Firestore).
- El login admin es un botón global en la navbar (`AdminLogin.astro`). Al entrar,
  marca `<body class="is-admin">` para revelar controles `admin-only` en todo el sitio.

### Configuración

Las claves públicas viven en `src/lib/firebaseConfig.ts`. **Son seguras de exponer**:
Firebase protege los datos con las *reglas de seguridad* de Firestore, no con la
API key. Si las claves contienen `PEGAR_AQUI`, la web detecta que no está configurado
y desactiva la tabla y el login (`isFirebaseConfigured`).

Estructura de datos en Firestore:

```
games (colección)
└── {gameId} (doc)
    └── scores (subcolección)
        └── {autoId}: { name: string, score: number, createdAt: timestamp }
```

Para guardar récords necesitas un usuario admin en **Firebase Authentication**
(email/contraseña) y reglas de Firestore que permitan escribir en `scores` solo a
usuarios autenticados.

---

## Temas y estilos

- El tema vive en variables CSS en `src/styles/global.css`. La paleta actual está
  inspirada en **Voltaic**: fondos casi negros con tinte morado, acento **morado
  vibrante** (`--accent: #a855f7`) y un rojo/rosa complementario.
- Cambiar el `:root` recolorea **todo el sitio** (catálogo, tarjetas, navbar, footer,
  leaderboard, página de detalle y el shell del juego), porque todo usa las variables.
- El catálogo y las tarjetas siguen el estilo **Aimlabs**: tarjetas grandes con
  imagen 16:9 + marca de agua, categorías, título en negrita, descripción y una fila
  de autor/estado.
- Los juegos usan la fuente retro **Press Start 2P** dentro del canvas.

---

## Portadas de juegos

- Se guardan en `public/covers/<id>.webp` y se referencian en el campo `cover` de
  `games.ts` (p. ej. `/covers/block-breaker.webp`).
- Conviene optimizarlas a **WebP** (~1280px de ancho) para que la home cargue rápido.
  Ejemplo con `sharp` (ya viene con Astro):
  ```bash
  node -e "require('sharp')('entrada.png').resize({width:1280}).webp({quality:82}).toFile('public/covers/mi-juego.webp')"
  ```

---

## Versión de escritorio (Python)

La carpeta `juegos/` contiene versiones **independientes en Python** (Pygame + OpenCV
+ MediaPipe) de algunos juegos. **No forma parte del sitio web** (está excluida del
watcher de Vite); la web reimplementa cada juego en JS/canvas.

- `juegos/block-breaker/main.py` — Block Breaker de escritorio.
- Requiere `pygame`, `opencv-python`, `mediapipe`, `numpy`.

---

## Privacidad

El control por cámara ocurre **100% en el navegador** (o local en Python). El vídeo
**no se envía a ningún servidor**. Lo único que viaja a Firebase son los récords
(nombre + puntuación) cuando un admin los guarda.

---

## Notas y deuda técnica

- **Dos lockfiles** (`package-lock.json` + `pnpm-lock.yaml`): elegir npm **o** pnpm y
  borrar el otro para evitar drift de dependencias.
- **MediaPipe se carga por CDN** en runtime: requiere internet para la detección de
  manos en la versión web.
- **Dependencias del backend Python no declaradas** (no hay `requirements.txt`).
- `.claude/` no está en `.gitignore`, así que `CLAUDE.md` se sube al repo.

---

Hecho por **Wilson Jara**.

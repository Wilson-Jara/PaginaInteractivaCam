# Plantilla de juego — disposición reutilizable (GameHub)

Esta carpeta es la **plantilla** para crear juegos nuevos que se vean **exactamente
igual** que Block Breaker: la misma disposición de cuadros que ya tienes en pantalla.

```
┌─────────────┬──────────────────────────┬─────────────┐
│  🏆 Top 15  │                          │  📷 Cámara  │
│ Leaderboard │       EL JUEGO           ├─────────────┤
│  (Firestore)│      (tu canvas)         │   Imagen    │
└─────────────┴──────────────────────────┴─────────────┘
```

## ¿Dónde está "guardada" la disposición?

NO está en el juego. Vive en piezas reutilizables y agnósticas al juego:

| Pieza                                | Qué aporta                                            |
| ------------------------------------ | ----------------------------------------------------- |
| `src/components/GameShell.astro`     | El layout de los 3 cuadros + selector de imagen + CSS |
| `src/components/Leaderboard.astro`   | El Top 15 de Firestore (izquierda)                    |
| `src/engine/GameRuntime.ts`          | Game loop 60 FPS, escalado HiDPI, input unificado     |
| `src/engine/HandTracker.ts`          | Cámara + MediaPipe (mano) → `input.hand`              |
| `src/pages/jugar/[id].astro`         | Una ruta `/jugar/<id>` para CUALQUIER juego           |

Por eso, **cualquier** juego que registres aparece con esta misma disposición sin
copiar ni una línea de layout.

## Cómo crear un juego nuevo (4 pasos)

1. **Copia esta carpeta** y renómbrala:
   `src/games/_template`  →  `src/games/mi-juego`

2. **Renombra la clase y el `id`** en `MiJuego.ts` e `index.ts`.
   El `config.id` debe coincidir con el `id` en `games.ts`.

3. **Regístralo** en `src/lib/gameRegistry.ts`:
   ```ts
   "mi-juego": async () => (await import("../games/mi-juego")).createMiJuego(),
   ```

4. **Hazlo jugable** en `src/data/games.ts`: en el objeto de ese juego pon
   `playable: true` (y rellena title, tags, description…).

Listo: abre `/jugar/mi-juego`. Misma disposición, tu lógica.

## Qué te da el motor gratis

- `input.hand` → posición de la mano (`x`/`y` 0..1, ya espejados) + gesto `fist`.
- `input.pointer` → mouse/touch en coords lógicas.
- `input.keys` → teclado por `event.code`.
- `this.signalGameOver()` / `this.signalRestart()` → integra con el leaderboard.
- Escalado automático a DPR; tú dibujas siempre en `0..width / 0..height`.

> El canvas usa la fuente `Press Start 2P` (ya cargada por el shell) para el look retro.
> Mantén la proporción `width:height` parecida a Block Breaker (640×784) para que el
> cuadro central calce igual entre los paneles.

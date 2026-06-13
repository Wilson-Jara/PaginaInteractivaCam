// ============================================================
//  REGISTRY DE JUEGOS (mapa id -> factory con carga diferida)
// ============================================================
//  Fuente única de verdad de qué juegos son JUGABLES y cómo
//  instanciarlos. Cada juego se carga con import() dinámico, así
//  el bundle de cada juego solo se descarga cuando se va a jugar.
//
//  Para añadir un juego nuevo:
//   1. Crea src/games/<tu-juego>/ con su clase (extends AbstractCameraGame).
//   2. Exporta una factory `createX(): CameraGame` en su index.ts.
//   3. Añade una línea aquí.
//   4. Marca `playable: true` en src/data/games.ts.
// ============================================================
import type { CameraGame } from "../engine/types";

export type GameFactory = () => Promise<CameraGame>;

const registry: Record<string, GameFactory> = {
  "block-breaker": async () =>
    (await import("../games/block-breaker")).createBlockBreaker(),
};

/** Devuelve la factory de un juego jugable, o null si no existe. */
export function getGameFactory(id: string): GameFactory | null {
  return registry[id] ?? null;
}

/** true si el juego tiene una implementación jugable registrada. */
export function isPlayable(id: string): boolean {
  return id in registry;
}

/** Lista de ids jugables (para getStaticPaths). */
export function playableIds(): string[] {
  return Object.keys(registry);
}

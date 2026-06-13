// ============================================================
//  CONTRATO DE EVENTOS ENTRE JUEGO Y LEADERBOARD
// ============================================================
//  Genérico para CUALQUIER juego: el detalle lleva `gameId`, así
//  el Leaderboard sabe a qué tabla pertenece el récord.
//  (Antes eran "bb:gameover"/"bb:restart", atados a Block Breaker.)
// ============================================================

export const GAME_OVER_EVENT = "game:over";
export const GAME_RESTART_EVENT = "game:restart";

export interface GameOverDetail {
  gameId: string;
  score: number;
}

export interface GameRestartDetail {
  gameId: string;
}

/** Notifica que terminó una partida con su puntuación final. */
export function emitGameOver(gameId: string, score: number): void {
  window.dispatchEvent(
    new CustomEvent<GameOverDetail>(GAME_OVER_EVENT, {
      detail: { gameId, score },
    })
  );
}

/** Notifica que la partida se reinició (limpia el aviso de récord). */
export function emitRestart(gameId: string): void {
  window.dispatchEvent(
    new CustomEvent<GameRestartDetail>(GAME_RESTART_EVENT, {
      detail: { gameId },
    })
  );
}

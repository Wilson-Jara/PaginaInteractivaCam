// ============================================================
//  CLASE BASE ABSTRACTA PARA JUEGOS (Template Method)
// ============================================================
//  Implementa lo común a todos los juegos:
//   - Guarda el contexto del lienzo.
//   - Centraliza la emisión de eventos hacia el leaderboard
//     (game:over / game:restart) con el `id` del juego.
//
//  Cada juego concreto extiende esta clase e implementa su lógica
//  (update/render/reset/getScore/isGameOver). Para avisar al
//  leaderboard usa `this.signalGameOver()` / `this.signalRestart()`.
// ============================================================
import type { CameraGame, GameConfig, GameInput } from "./types";
import { emitGameOver, emitRestart } from "./events";

export abstract class AbstractCameraGame implements CameraGame {
  abstract readonly config: GameConfig;

  protected ctx!: CanvasRenderingContext2D;

  init(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
    this.onInit();
  }

  /** Hook opcional tras recibir el contexto (override en subclases). */
  protected onInit(): void {}

  abstract update(input: GameInput): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract reset(): void;
  abstract getScore(): number;
  abstract isGameOver(): boolean;

  /** Avisa al leaderboard que terminó la partida (récord candidato). */
  protected signalGameOver(): void {
    emitGameOver(this.config.id, this.getScore());
  }

  /** Avisa al leaderboard que se reinició la partida. */
  protected signalRestart(): void {
    emitRestart(this.config.id);
  }
}

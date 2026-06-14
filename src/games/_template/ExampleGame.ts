// ============================================================
//  PLANTILLA DE JUEGO — copia esta carpeta para crear uno nuevo
// ============================================================
//  Skeleton mínimo y funcional de un CameraGame. Reutiliza el MISMO
//  layout que Block Breaker (leaderboard izq. + juego centro +
//  cámara/imagen der.) sin tocar nada del shell: ese layout vive en
//  src/components/GameShell.astro y es agnóstico al juego.
//
//  CÓMO USARLO (4 pasos):
//   1. Copia esta carpeta:  src/games/_template  ->  src/games/<tu-juego>
//   2. Renombra la clase + el `config.id` (debe coincidir con games.ts).
//   3. Registra la factory en src/lib/gameRegistry.ts.
//   4. En src/data/games.ts marca ese id con `playable: true`.
//
//  El motor (GameRuntime) te da GRATIS: cámara + MediaPipe, game loop
//  a 60 FPS, input unificado (mano/mouse/touch/teclado), escalado HiDPI
//  y el leaderboard de Firestore. Tú solo implementas la lógica abajo.
// ============================================================
import { AbstractCameraGame } from "../../engine/AbstractCameraGame";
import type { GameConfig, GameInput } from "../../engine/types";

export class ExampleGame extends AbstractCameraGame {
  // Resolución LÓGICA del lienzo. El motor escala a la pantalla/DPR.
  // Usa la misma proporción que Block Breaker para que se vea igual.
  readonly config: GameConfig = {
    id: "example", // <-- cámbialo: debe coincidir con games.ts y Firestore
    width: 640,
    height: 784,
  };

  // --- Estado del juego (ejemplo: una "paleta" que sigue la mano) ---
  private score = 0;
  private over = false;
  private paddleX = 0.5; // 0..1, posición horizontal normalizada

  /** Se llama una vez al montar (ya tienes this.ctx disponible). */
  protected onInit(): void {
    this.reset();
  }

  /** Lógica por tick (paso fijo a 60 FPS). */
  update(input: GameInput): void {
    // Prioridad de control: mano > puntero (mouse/touch).
    if (input.hand.present) {
      this.paddleX = input.hand.x; // ya viene espejado (0 izq, 1 der)
    } else if (input.pointer) {
      this.paddleX = input.pointer.x / this.config.width;
    }

    // Ejemplo de gesto: puño cerrado reinicia.
    if (input.hand.fist && this.over) {
      this.reset();
      this.signalRestart();
    }
  }

  /** Dibujo del frame. El contexto YA está en coords lógicas (0..w / 0..h). */
  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this.config;

    // Fondo
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    // HUD
    ctx.fillStyle = "#c7d5e0";
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(this.score).padStart(5, "0"), w / 2, 40);

    // "Paleta" de ejemplo siguiendo la mano
    const pw = 120;
    const px = this.paddleX * w - pw / 2;
    ctx.fillStyle = "#66c0f4";
    ctx.fillRect(px, h - 60, pw, 14);
  }

  /** Reinicia la partida desde cero. */
  reset(): void {
    this.score = 0;
    this.over = false;
    this.paddleX = 0.5;
  }

  getScore(): number {
    return this.score;
  }

  isGameOver(): boolean {
    return this.over;
  }

  /** Termina la partida y avisa al leaderboard (récord candidato). */
  private endGame(): void {
    this.over = true;
    this.signalGameOver();
  }
}

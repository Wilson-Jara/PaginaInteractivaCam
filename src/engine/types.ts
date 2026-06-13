// ============================================================
//  CONTRATOS DEL MOTOR (engine) — agnóstico al juego
// ============================================================
//  Estas interfaces definen el "lenguaje" entre el motor
//  reutilizable (cámara, loop, input, eventos) y cada juego.
//  Un juego nuevo solo tiene que cumplir `CameraGame` y el motor
//  le entrega cámara + MediaPipe + game loop + leaderboard gratis.
// ============================================================

/** Punto de la mano devuelto por MediaPipe (coords normalizadas 0..1). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Entrada de la mano ya procesada por el HandTracker.
 * `x`/`y` están normalizados (0..1) y ESPEJADOS (como se ve el jugador).
 */
export interface HandInput {
  /** Hay una mano visible en la cámara este frame. */
  present: boolean;
  /** Posición horizontal del nudillo central (0 = izq, 1 = der), ya espejada. */
  x: number;
  /** Posición vertical del nudillo central (0 = arriba, 1 = abajo). */
  y: number;
  /** Gesto de puño cerrado (lanzar / reiniciar). */
  fist: boolean;
  /** Landmarks crudos para dibujar el esqueleto (o null si no hay mano). */
  landmarks: readonly Landmark[] | null;
}

/** Posición del puntero (mouse/touch) en COORDENADAS LÓGICAS del juego. */
export interface PointerInput {
  x: number;
  y: number;
}

/**
 * Snapshot de entrada que el motor entrega al juego en cada tick.
 * El juego decide cómo combinar mano / puntero / teclado.
 */
export interface GameInput {
  /** Siempre presente; `present=false` cuando no hay mano. */
  hand: HandInput;
  /** Última posición del puntero sobre el lienzo, o null. */
  pointer: PointerInput | null;
  /** Mapa de teclas presionadas (por `event.code`). */
  keys: Readonly<Record<string, boolean>>;
}

/** Metadatos que el motor necesita para montar un juego. */
export interface GameConfig {
  /** Id único; debe coincidir con el del catálogo (games.ts) y Firestore. */
  id: string;
  /** Resolución lógica del lienzo (el motor escala a DPR/pantalla). */
  width: number;
  height: number;
  /** Escala máxima permitida (default 1.5). */
  maxScale?: number;
}

/**
 * Interfaz que TODO juego controlado por cámara debe cumplir (Strategy).
 * El motor (`GameRuntime`) la orquesta; el juego solo implementa su lógica.
 *
 * Contrato temporal: `update()` se llama a 60 FPS con paso fijo.
 * `render()` recibe el contexto YA transformado a coords lógicas
 * (el juego dibuja en 0..width / 0..height, sin preocuparse del DPR).
 */
export interface CameraGame {
  readonly config: GameConfig;
  /** Se llama una vez al montar el juego. */
  init(ctx: CanvasRenderingContext2D): void;
  /** Lógica por tick (paso fijo 60 FPS). */
  update(input: GameInput): void;
  /** Dibujo del frame (contexto ya escalado a coords lógicas). */
  render(ctx: CanvasRenderingContext2D): void;
  /** Reinicia la partida desde cero. */
  reset(): void;
  /** Puntuación actual (para el leaderboard). */
  getScore(): number;
  /** true si la partida terminó (game over o victoria). */
  isGameOver(): boolean;
  /** Tecla discreta (opcional): el motor mantiene además `input.keys`. */
  onKey?(code: string, down: boolean): void;
  /** Click/tap sobre el lienzo en coords lógicas (opcional). */
  onPointerDown?(x: number, y: number): void;
}

// ============================================================
//  GAME RUNTIME — orquesta el ciclo de vida de un CameraGame
// ============================================================
//  Responsable de TODO lo repetible para que los juegos no lo
//  reimplementen:
//   - Tamaño del lienzo + escala a DPR/pantalla (HiDPI nítido).
//   - Game loop con paso fijo a 60 FPS (acumulador).
//   - Recolección de input (mano del HandTracker + mouse/touch +
//     teclado) en un único snapshot `GameInput` por tick.
//   - Transforma el contexto a coords lógicas antes de render().
//
//  El juego solo dibuja en coords lógicas (0..width / 0..height).
// ============================================================
import type { CameraGame, GameInput, HandInput, PointerInput } from "./types";
import type { HandTracker } from "./HandTracker";

const NO_HAND: HandInput = {
  present: false,
  x: 0.5,
  y: 0.5,
  fist: false,
  landmarks: null,
};

export interface GameRuntimeOptions {
  game: CameraGame;
  canvas: HTMLCanvasElement;
  /** Fuente de la mano; null para jugar solo con mouse/teclado. */
  tracker?: HandTracker | null;
  /** Ancho reservado a paneles laterales en pantallas anchas (px). */
  sidePanelWidth?: number;
  /** Umbral de ancho para mostrar/ocultar paneles laterales (px). */
  breakpoint?: number;
  /** Margen horizontal de la ventana (px). */
  margin?: number;
  /** Margen vertical de la ventana (px). */
  verticalMargin?: number;
}

export class GameRuntime {
  private readonly game: CameraGame;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tracker: HandTracker | null;

  private readonly sidePanelWidth: number;
  private readonly breakpoint: number;
  private readonly margin: number;
  private readonly verticalMargin: number;

  private scale = 1;
  private dpr = 1;

  private readonly keys: Record<string, boolean> = {};
  private pointer: PointerInput | null = null;

  private lastTime = 0;
  private accum = 0;
  private readonly ft = 1000 / 60; // paso fijo 60 FPS

  constructor(opts: GameRuntimeOptions) {
    this.game = opts.game;
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del lienzo");
    this.ctx = ctx;
    this.tracker = opts.tracker ?? null;
    this.sidePanelWidth = opts.sidePanelWidth ?? 720;
    this.breakpoint = opts.breakpoint ?? 1100;
    this.margin = opts.margin ?? 24;
    this.verticalMargin = opts.verticalMargin ?? 80;
  }

  /** Monta listeners, inicializa el juego y arranca el loop. */
  start(): void {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindInput();
    this.game.init(this.ctx);
    requestAnimationFrame(this.loop);
  }

  private resize(): void {
    const { width, height, maxScale = 1.5 } = this.game.config;
    const sidePanels =
      window.innerWidth > this.breakpoint ? this.sidePanelWidth : 0;
    const maxW = window.innerWidth - this.margin - sidePanels;
    const maxH = window.innerHeight - this.verticalMargin;
    this.scale = Math.min(maxW / width, maxH / height, maxScale);
    this.dpr = window.devicePixelRatio || 1;
    const cssW = Math.floor(width * this.scale);
    const cssH = Math.floor(height * this.scale);
    // Backing store a resolución real del dispositivo para nitidez HiDPI.
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
  }

  private bindInput(): void {
    const toLogical = (clientX: number, clientY: number): PointerInput => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / this.scale,
        y: (clientY - rect.top) / this.scale,
      };
    };

    this.canvas.addEventListener("mousemove", (e) => {
      this.pointer = toLogical(e.clientX, e.clientY);
    });
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        if (t) this.pointer = toLogical(t.clientX, t.clientY);
      },
      { passive: false }
    );
    this.canvas.addEventListener("click", (e) => {
      const p = toLogical(e.clientX, e.clientY);
      this.game.onPointerDown?.(p.x, p.y);
    });

    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space") e.preventDefault();
      this.game.onKey?.(e.code, true);
    });
    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      this.game.onKey?.(e.code, false);
    });
  }

  private buildInput(): GameInput {
    return {
      hand: this.tracker ? this.tracker.latest : NO_HAND,
      pointer: this.pointer,
      keys: this.keys,
    };
  }

  private readonly loop = (ts: number): void => {
    requestAnimationFrame(this.loop);
    if (!this.lastTime) this.lastTime = ts;
    this.accum += ts - this.lastTime;
    this.lastTime = ts;
    // Evita la "espiral de la muerte" si la pestaña estuvo en background.
    if (this.accum > 250) this.accum = 250;
    while (this.accum >= this.ft) {
      this.accum -= this.ft;
      this.game.update(this.buildInput());
    }
    this.render();
  };

  private render(): void {
    const c = this.ctx;
    const s = this.scale * this.dpr;
    // Limpiar todo el backing store en coords de dispositivo.
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Transformar a coords lógicas: el juego dibuja sin pensar en DPR.
    c.setTransform(s, 0, 0, s, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    this.game.render(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
}

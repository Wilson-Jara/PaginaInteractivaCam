// ============================================================
//  FLAPPY — juego concreto (extiende AbstractCameraGame)
// ============================================================
//  Portada web de flappy_hand.py: misma dificultad de tuberías,
//  colores y mecánica de control, con el sistema de vidas de Block
//  Breaker. Reutiliza el shell/motor común (cámara + MediaPipe +
//  game loop + leaderboard).
//
//  Control: MANO ABIERTA = aletear (impulso arriba). Sin mano o
//  mano cerrada = cae por gravedad. ESPACIO de respaldo para
//  aletear / arrancar / continuar.
//
//  Vidas: 3, como Block Breaker. Al perder una, el marcador vuelve
//  a 0 y continúas. Al perder las 3, solo se reinicia haciendo CLIC
//  con el mouse en el botón TRY AGAIN. Si en alguna de las 3 vidas
//  se logró un récord, el leaderboard ofrece guardar el nombre para
//  el mejor puntaje de la partida.
// ============================================================
import { AbstractCameraGame } from "../../engine/AbstractCameraGame";
import type { GameConfig, GameInput, Landmark } from "../../engine/types";
import { rRect, clamp } from "../../engine/canvasUtils";
import {
  GAME_W, GAME_H, WIN_W, WIN_H, TOTAL_W, TOTAL_H, GROUND_H,
  GRAVITY, FLAP_STRENGTH, MAX_FALL_SPEED, BIRD_SIZE, BIRD_X, FLAP_COOLDOWN,
  MAX_LIVES,
  PIPE_W, PIPE_GAP_BASE, PIPE_GAP_MIN, PIPE_SPEED_BASE, PIPE_SPEED_MAX,
  PIPE_SPAWN_BASE, PIPE_SPAWN_MIN, DIFFICULTY_STEP, GRAVITY_MAX,
  COL_BG_TOP, COL_BG_BOT, COL_BIRD, COL_BIRD_OUTLINE, COL_BIRD_EYE,
  COL_BIRD_BEAK, COL_BIRD_WING, COL_PIPE, COL_PIPE_DARK, COL_PIPE_CAP,
  COL_GROUND, COL_GROUND_LINE, COL_TEXT, COL_SCORE,
} from "./levels";

// menu  = pantalla inicial (antes de la 1ª partida)
// ready = entre vidas: el pájaro flota esperando que aletees
// playing = jugando
// dead  = se acabaron las 3 vidas (solo reinicia el botón TRY AGAIN)
type State = "menu" | "ready" | "playing" | "dead";

interface Pipe {
  x: number;
  gap: number;
  gapY: number;
  scored: boolean;
}

interface Star {
  x: number;
  y: number;
  b: number;
}

// Botón TRY AGAIN del game over (coords lógicas). Se usa tanto para
// dibujarlo como para detectar el clic exactamente sobre él.
const BTN_W = 240;
const BTN_H = 56;
const BTN_X = GAME_W / 2 - BTN_W / 2;
const BTN_Y = Math.round(GAME_H * 0.6);

export class FlappyGame extends AbstractCameraGame {
  readonly config: GameConfig = {
    id: "flappy",
    width: TOTAL_W,
    height: TOTAL_H,
    maxScale: 2.5,
  };

  private state: State = "menu";
  private birdY = GAME_H / 2;
  private birdVel = 0;
  private pipes: Pipe[] = [];
  private score = 0; // puntaje de la vida actual (reinicia a 0 cada vida)
  private bestRun = 0; // mejor puntaje entre las vidas de ESTA partida
  private best = 0; // mejor histórico de la sesión
  private lives = MAX_LIVES;
  private frameCount = 0;
  private ticks = 0;
  private groundOffset = 0;
  private flapCooldown = 0;
  private deathFlash = 0;

  // Dificultad progresiva (depende del puntaje de la vida actual).
  private pipeSpeed = PIPE_SPEED_BASE;
  private pipeGap = PIPE_GAP_BASE;
  private spawnInterval = PIPE_SPAWN_BASE;
  private gravity = GRAVITY;
  private level = 1;

  private stars: Star[] = [];
  private seed = 246813;

  protected onInit(): void {
    this.makeStars();
    this.newGame();
  }

  getScore(): number {
    // Para el leaderboard: el mejor puntaje logrado en la partida.
    return Math.max(this.score, this.bestRun);
  }

  isGameOver(): boolean {
    return this.state === "dead";
  }

  reset(): void {
    this.newGame();
  }

  // ---- Ciclo de partida ----
  /** Empieza una partida nueva desde cero (3 vidas), va al menú. */
  private newGame(): void {
    this.lives = MAX_LIVES;
    this.bestRun = 0;
    this.deathFlash = 0;
    this.resetLife();
    this.state = "menu";
    this.signalRestart();
  }

  /** Prepara una vida nueva: pájaro al centro, puntaje a 0, dificultad base. */
  private resetLife(): void {
    this.birdY = GAME_H / 2;
    this.birdVel = 0;
    this.pipes = [];
    this.score = 0;
    this.frameCount = 0;
    this.flapCooldown = 0;
    this.pipeSpeed = PIPE_SPEED_BASE;
    this.pipeGap = PIPE_GAP_BASE;
    this.spawnInterval = PIPE_SPAWN_BASE;
    this.gravity = GRAVITY;
    this.level = 1;
  }

  private rand(): number {
    let s = this.seed | 0;
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    this.seed = s;
    return ((s >>> 0) % 100000) / 100000;
  }

  private makeStars(): void {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.floor(this.rand() * GAME_W),
        y: Math.floor(this.rand() * (GAME_H - GROUND_H - 50)),
        b: this.rand(),
      });
    }
  }

  private makePipe(): Pipe {
    const gap = this.pipeGap;
    const margin = Math.max(80, Math.floor(gap / 2) + 30);
    const minY = margin;
    const maxY = GAME_H - GROUND_H - margin;
    const gapY = minY + Math.floor(this.rand() * Math.max(1, maxY - minY));
    return { x: GAME_W + PIPE_W, gap, gapY, scored: false };
  }

  private flap(): void {
    this.birdVel = FLAP_STRENGTH;
  }

  // ---- Input ----
  onKey(code: string, down: boolean): void {
    if (!down) return;
    if (code !== "Space") return;
    // En "dead" el ESPACIO NO hace nada: hay que pulsar TRY AGAIN con el mouse.
    if (this.state === "menu" || this.state === "ready") {
      this.state = "playing";
      this.flap();
    } else if (this.state === "playing") {
      this.flap();
    }
  }

  onPointerDown(x: number, y: number): void {
    // Reiniciar SOLO al hacer clic dentro del botón TRY AGAIN del game over.
    if (this.state !== "dead") return;
    if (x >= BTN_X && x <= BTN_X + BTN_W && y >= BTN_Y && y <= BTN_Y + BTN_H) {
      this.newGame();
    }
  }

  /** ¿Mano abierta? Réplica de is_hand_open() del .py (>=3 dedos extendidos). */
  private isHandOpen(lm: readonly Landmark[]): boolean {
    const tips = [8, 12, 16, 20];
    const mcps = [5, 9, 13, 17];
    let extended = 0;
    for (let i = 0; i < tips.length; i++) {
      if (lm[tips[i]].y < lm[mcps[i]].y) extended++;
    }
    if (Math.abs(lm[4].x - lm[3].x) > 0.04) extended++;
    return extended >= 3;
  }

  // ---- Update ----
  update(input: GameInput): void {
    this.ticks++;
    this.groundOffset += this.pipeSpeed;
    if (this.deathFlash > 0) this.deathFlash--;

    const handOpen =
      input.hand.present && input.hand.landmarks
        ? this.isHandOpen(input.hand.landmarks)
        : false;

    if (handOpen && this.flapCooldown <= 0) {
      // La mano abierta arranca, continúa entre vidas y aletea. En "dead"
      // NO hace nada (se reinicia con clic en TRY AGAIN).
      if (this.state === "menu" || this.state === "ready") {
        this.state = "playing";
        this.flap();
        this.flapCooldown = FLAP_COOLDOWN;
      } else if (this.state === "playing") {
        this.flap();
        this.flapCooldown = FLAP_COOLDOWN;
      }
    }
    if (this.flapCooldown > 0) this.flapCooldown--;

    if (this.state === "playing") {
      this.updatePlaying();
    } else {
      // En menú / entre vidas / muerto, el pájaro flota suavemente.
      this.birdY = GAME_H / 2 + Math.sin(this.ticks * 0.05) * 20;
    }
  }

  private updatePlaying(): void {
    this.frameCount++;

    // Dificultad progresiva por puntaje (suavizada respecto al .py).
    const newLevel = 1 + Math.floor(this.score / DIFFICULTY_STEP);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.pipeSpeed = Math.min(PIPE_SPEED_MAX, PIPE_SPEED_BASE + (this.level - 1) * 0.4);
      this.pipeGap = Math.max(PIPE_GAP_MIN, PIPE_GAP_BASE - (this.level - 1) * 6);
      this.spawnInterval = Math.max(PIPE_SPAWN_MIN, PIPE_SPAWN_BASE - (this.level - 1) * 5);
      this.gravity = Math.min(GRAVITY_MAX, GRAVITY + (this.level - 1) * 0.02);
    }

    // Gravedad.
    this.birdVel += this.gravity;
    if (this.birdVel > MAX_FALL_SPEED) this.birdVel = MAX_FALL_SPEED;
    this.birdY += this.birdVel;

    // Generar tuberías periódicamente.
    if (this.frameCount % Math.max(1, Math.floor(this.spawnInterval)) === 0) {
      this.pipes.push(this.makePipe());
    }

    // Mover y puntuar.
    for (const p of this.pipes) {
      p.x -= this.pipeSpeed;
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true;
        this.score += 1;
      }
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_W >= -10);

    // Colisiones: suelo / techo.
    if (this.birdY + BIRD_SIZE >= GAME_H - GROUND_H || this.birdY - BIRD_SIZE <= 0) {
      this.loseLife();
      return;
    }
    // Colisiones: tuberías.
    const bx = BIRD_X - BIRD_SIZE;
    const by = this.birdY - BIRD_SIZE;
    const bs = BIRD_SIZE * 2;
    for (const p of this.pipes) {
      const topH = p.gapY - p.gap / 2;
      const botY = p.gapY + p.gap / 2;
      if (this.aabb(bx, by, bs, bs, p.x, 0, PIPE_W, topH) ||
          this.aabb(bx, by, bs, bs, p.x, botY, PIPE_W, GAME_H - botY)) {
        this.loseLife();
        return;
      }
    }
  }

  private aabb(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /** Pierde una vida: guarda el mejor puntaje y, si quedan vidas, continúa. */
  private loseLife(): void {
    this.bestRun = Math.max(this.bestRun, this.score);
    this.best = Math.max(this.best, this.bestRun);
    this.lives--;
    this.deathFlash = 8;
    if (this.lives > 0) {
      // Aún quedan vidas: vidanueva con marcador en 0, a esperar aleteo.
      this.resetLife();
      this.state = "ready";
    } else {
      // Se acabaron las 3 vidas: game over real (récord candidato).
      this.state = "dead";
      this.signalGameOver();
    }
  }

  // ---- Render ----
  render(c: CanvasRenderingContext2D): void {
    this.drawBg(c);
    this.drawStars(c);
    for (const p of this.pipes) this.drawPipe(c, p);
    this.drawGround(c);
    this.drawBird(c);

    if (this.deathFlash > 0) {
      c.fillStyle = `rgba(255,255,255,${(this.deathFlash / 8) * 0.5})`;
      c.fillRect(0, 0, GAME_W, GAME_H - GROUND_H);
    }

    c.textAlign = "left";
    c.textBaseline = "alphabetic";

    // HUD: vidas (arriba-izq) + nivel; el score grande va centrado.
    if (this.state === "playing" || this.state === "ready") {
      this.drawLives(c);
      this.drawScore(c);
      c.font = '12px "Press Start 2P", monospace';
      c.fillStyle = this.levelColor();
      c.fillText(`Nivel ${this.level}`, 12, GAME_H - GROUND_H + 38);
    }

    if (this.state === "menu") this.drawMenu(c);
    if (this.state === "ready") this.drawReady(c);
    if (this.state === "dead") this.drawDead(c);

    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
    c.strokeRect(1, 1, WIN_W - 2, WIN_H - 2);
  }

  private levelColor(): string {
    const g = Math.min(255, 80 + this.level * 25);
    const b = Math.max(0, 255 - this.level * 30);
    return `rgb(255,${g},${b})`;
  }

  private drawBg(c: CanvasRenderingContext2D): void {
    const g = c.createLinearGradient(0, 0, 0, GAME_H - GROUND_H);
    g.addColorStop(0, COL_BG_TOP);
    g.addColorStop(1, COL_BG_BOT);
    c.fillStyle = g;
    c.fillRect(0, 0, GAME_W, GAME_H);
  }

  private drawStars(c: CanvasRenderingContext2D): void {
    for (const s of this.stars) {
      const a = Math.floor(128 + 127 * Math.sin(this.ticks * 0.016 + s.b * 10));
      const v = clamp(a, 0, 255);
      c.fillStyle = `rgb(${v},${v},${Math.min(255, v + 40)})`;
      c.fillRect(s.x, s.y, 2, 2);
    }
  }

  private drawPipe(c: CanvasRenderingContext2D, p: Pipe): void {
    const topH = p.gapY - p.gap / 2;
    const botY = p.gapY + p.gap / 2;
    const capH = 18;
    c.fillStyle = COL_PIPE_DARK;
    c.fillRect(p.x, 0, PIPE_W, topH);
    c.fillStyle = COL_PIPE;
    c.fillRect(p.x + 4, 0, PIPE_W - 8, topH);
    c.fillStyle = COL_PIPE_CAP;
    c.fillRect(p.x - 4, topH - capH, PIPE_W + 8, capH);
    const botH = GAME_H - botY;
    c.fillStyle = COL_PIPE_DARK;
    c.fillRect(p.x, botY, PIPE_W, botH);
    c.fillStyle = COL_PIPE;
    c.fillRect(p.x + 4, botY, PIPE_W - 8, botH);
    c.fillStyle = COL_PIPE_CAP;
    c.fillRect(p.x - 4, botY, PIPE_W + 8, capH);
  }

  private drawGround(c: CanvasRenderingContext2D): void {
    const gy = GAME_H - GROUND_H;
    c.fillStyle = COL_GROUND;
    c.fillRect(0, gy, GAME_W, GROUND_H);
    c.strokeStyle = COL_GROUND_LINE;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, gy);
    c.lineTo(GAME_W, gy);
    c.stroke();
    c.lineWidth = 1;
    for (let i = -1; i < GAME_W / 30 + 2; i++) {
      const lx = i * 30 - (Math.floor(this.groundOffset) % 30);
      c.beginPath();
      c.moveTo(lx, gy + 10);
      c.lineTo(lx + 15, gy + GROUND_H);
      c.stroke();
    }
  }

  private drawBird(c: CanvasRenderingContext2D): void {
    const cx = BIRD_X;
    const cy = this.birdY;
    c.fillStyle = COL_BIRD;
    c.beginPath();
    c.arc(cx, cy, BIRD_SIZE, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = COL_BIRD_OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    const ex = cx + 10;
    const ey = cy - 8;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(ex, ey, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COL_BIRD_EYE;
    c.beginPath();
    c.arc(ex + 2, ey, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(ex + 3, ey - 2, 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COL_BIRD_BEAK;
    c.beginPath();
    c.moveTo(cx + BIRD_SIZE, cy);
    c.lineTo(cx + BIRD_SIZE + 14, cy + 4);
    c.lineTo(cx + BIRD_SIZE - 2, cy + 10);
    c.closePath();
    c.fill();
    const wingY = Math.sin(this.ticks * 0.72) * 5;
    c.fillStyle = COL_BIRD_WING;
    c.beginPath();
    c.moveTo(cx - 8, cy + 2);
    c.lineTo(cx - 22, cy + wingY - 5);
    c.lineTo(cx - 5, cy + 14);
    c.closePath();
    c.fill();
  }

  /** Vidas restantes, como pajaritos/círculos arriba-izquierda. */
  private drawLives(c: CanvasRenderingContext2D): void {
    for (let i = 0; i < MAX_LIVES; i++) {
      const cx = 24 + i * 26;
      const cy = 26;
      c.beginPath();
      c.arc(cx, cy, 9, 0, Math.PI * 2);
      if (i < this.lives) {
        c.fillStyle = COL_BIRD;
        c.fill();
        c.strokeStyle = COL_BIRD_OUTLINE;
        c.lineWidth = 2;
        c.stroke();
      } else {
        c.strokeStyle = "rgba(255,255,255,0.45)";
        c.lineWidth = 2;
        c.stroke();
      }
    }
  }

  private drawScore(c: CanvasRenderingContext2D): void {
    c.textAlign = "center";
    c.font = '44px "Press Start 2P", monospace';
    const s = String(this.score);
    c.fillStyle = "#000000";
    c.fillText(s, GAME_W / 2 + 2, 92);
    c.fillStyle = COL_SCORE;
    c.fillText(s, GAME_W / 2, 90);
    c.textAlign = "left";
  }

  private drawMenu(c: CanvasRenderingContext2D): void {
    c.textAlign = "center";
    c.fillStyle = COL_SCORE;
    c.font = '40px "Press Start 2P", monospace';
    c.fillText("FLAPPY", GAME_W / 2, 150);
    c.fillStyle = COL_TEXT;
    c.font = '16px "Press Start 2P", monospace';
    c.fillText("Control por gestos", GAME_W / 2, 200);
    const pulse = Math.floor(180 + 75 * Math.sin(this.ticks * 0.072));
    c.fillStyle = `rgb(${pulse},${pulse},255)`;
    c.font = '15px "Press Start 2P", monospace';
    c.fillText("Abre la mano para jugar", GAME_W / 2, GAME_H * 0.58);
    c.fillStyle = "#969696";
    c.font = '11px "Press Start 2P", monospace';
    c.fillText("(o presiona ESPACIO)", GAME_W / 2, GAME_H * 0.58 + 30);
    c.fillText(`${MAX_LIVES} vidas`, GAME_W / 2, GAME_H * 0.58 + 60);
    c.textAlign = "left";
  }

  private drawReady(c: CanvasRenderingContext2D): void {
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.fillRect(0, 0, GAME_W, GAME_H - GROUND_H);
    c.textAlign = "center";
    c.fillStyle = COL_TEXT;
    c.font = '22px "Press Start 2P", monospace';
    c.fillText(`Te quedan ${this.lives}`, GAME_W / 2, GAME_H * 0.42);
    c.fillText(this.lives === 1 ? "vida" : "vidas", GAME_W / 2, GAME_H * 0.42 + 32);
    const pulse = Math.floor(180 + 75 * Math.sin(this.ticks * 0.072));
    c.fillStyle = `rgb(${pulse},${pulse},255)`;
    c.font = '13px "Press Start 2P", monospace';
    c.fillText("Abre la mano para seguir", GAME_W / 2, GAME_H * 0.58);
    c.fillStyle = "#969696";
    c.font = '11px "Press Start 2P", monospace';
    c.fillText("(o ESPACIO)", GAME_W / 2, GAME_H * 0.58 + 26);
    c.textAlign = "left";
  }

  private drawDead(c: CanvasRenderingContext2D): void {
    c.fillStyle = "rgba(0,0,0,0.62)";
    c.fillRect(0, 0, GAME_W, GAME_H);
    c.textAlign = "center";
    c.fillStyle = "#ff5050";
    c.font = '40px "Press Start 2P", monospace';
    c.fillText("GAME OVER", GAME_W / 2, GAME_H * 0.3);
    c.fillStyle = COL_SCORE;
    c.font = '20px "Press Start 2P", monospace';
    c.fillText(`Puntaje: ${this.bestRun}`, GAME_W / 2, GAME_H * 0.4);
    c.fillStyle = "#c8c864";
    c.font = '14px "Press Start 2P", monospace';
    c.fillText(`Mejor: ${this.best}`, GAME_W / 2, GAME_H * 0.4 + 34);

    // Botón TRY AGAIN (clic con el mouse para reiniciar).
    c.fillStyle = "#ffffff";
    rRect(c, BTN_X, BTN_Y, BTN_W, BTN_H, 8);
    c.fill();
    c.fillStyle = "#202124";
    c.font = '16px "Press Start 2P", monospace';
    c.textBaseline = "middle";
    c.fillText("TRY AGAIN", GAME_W / 2, BTN_Y + BTN_H / 2 + 1);
    c.textBaseline = "alphabetic";
    c.fillStyle = "#969696";
    c.font = '10px "Press Start 2P", monospace';
    c.fillText("Haz clic en el boton", GAME_W / 2, BTN_Y + BTN_H + 26);
    c.textAlign = "left";
  }
}

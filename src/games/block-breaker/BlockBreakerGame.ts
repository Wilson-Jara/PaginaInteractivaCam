// ============================================================
//  BLOCK BREAKER — juego concreto (extiende AbstractCameraGame)
// ============================================================
//  Toda la lógica del juego vive aquí, separada de la cámara y del
//  game loop (que los aporta el motor). Implementa el contrato
//  CameraGame: update/render/reset/getScore/isGameOver + input.
// ============================================================
import { AbstractCameraGame } from "../../engine/AbstractCameraGame";
import type { GameConfig, GameInput } from "../../engine/types";
import { rRect, clamp } from "../../engine/canvasUtils";
import {
  Ball, Block, Paddle, PowerUp, Particle, parseLevel,
} from "./entities";
import {
  GAME_W, GAME_H, HUD_H, WIN_W, WIN_H, TOTAL_W, TOTAL_H,
  BG, HUD_BG, BLK_W, BLK_H, PAD_Y,
  BALL_R, BALL_BASE_SPD, MAX_LIVES, LEVELS,
  BT_DOUBLE, BT_POWERUP,
  PU_MULTI, PU_LONG, PU_FIRE, PU_LASER, PU_SLOW, PU_STICKY, PU_LIFE,
  G_BLUE, G_GREEN, G_YELLOW,
} from "./levels";

type State = "start" | "playing" | "paused" | "clear" | "over" | "win";

export class BlockBreakerGame extends AbstractCameraGame {
  readonly config: GameConfig = {
    id: "block-breaker",
    width: TOTAL_W,
    height: TOTAL_H,
    maxScale: 1.5,
  };

  private state: State = "start";
  private blocks: Block[] = [];
  private balls: Ball[] = [];
  private paddle: Paddle = new Paddle();
  private particles: Particle[] = [];
  private powerups: PowerUp[] = [];

  private lives = MAX_LIVES;
  private score = 0;
  private level = 1;
  private combo = 0;
  private comboTimer = 0;
  private clearTimer = 0;
  private perfect = true;
  private perfectShow = 0;

  private handX = GAME_W / 2;
  private smoothX = GAME_W / 2;

  protected onInit(): void {
    this.resetGame();
  }

  getScore(): number {
    return this.score;
  }

  isGameOver(): boolean {
    return this.state === "over" || this.state === "win";
  }

  reset(): void {
    this.resetGame();
  }

  // ---- Ciclo de partida ----
  private resetLevel(ln: number): void {
    const idx = (ln - 1) % LEVELS.length;
    this.blocks = parseLevel(LEVELS[idx]);
    this.paddle = new Paddle();
    const ball = new Ball(GAME_W / 2, PAD_Y - BALL_R - 1);
    ball.speed = BALL_BASE_SPD + (ln - 1) * 0.5;
    this.balls = [ball];
    this.particles = [];
    this.powerups = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.perfect = true;
    this.state = "start";
  }

  private resetGame(): void {
    this.lives = MAX_LIVES;
    this.score = 0;
    this.level = 1;
    this.resetLevel(this.level);
    this.signalRestart();
  }

  private launchBalls(): void {
    for (const b of this.balls) b.launch();
    this.state = "playing";
  }

  private releaseSticky(): void {
    const sb = this.paddle.stickyBall;
    if (sb) {
      sb.active = true;
      sb.stuck = false;
      sb.launch();
      this.paddle.stickyBall = null;
    }
  }

  // ---- Input ----
  onKey(code: string, down: boolean): void {
    if (!down) return;
    if (code === "Space") {
      if (this.state === "start") this.launchBalls();
      else if (this.state === "over" || this.state === "win") this.resetGame();
      else if (this.state === "paused") this.state = "playing";
      else if (this.state === "playing" && this.paddle.stickyBall) this.releaseSticky();
    }
    if (code === "Escape") {
      if (this.state === "playing") this.state = "paused";
      else if (this.state === "paused") this.state = "playing";
    }
  }

  onPointerDown(): void {
    if (this.state === "start" && this.balls.length > 0) this.launchBalls();
    else if (this.state === "over" || this.state === "win") this.resetGame();
  }

  private handleFist(): void {
    if (this.state === "over" || this.state === "win") this.resetGame();
    else if (this.state === "start" && this.balls.length > 0) this.launchBalls();
    else if (this.state === "playing" && this.paddle.stickyBall) this.releaseSticky();
  }

  // ---- Power-ups ----
  private applyPU(type: string): void {
    switch (type) {
      case PU_MULTI: {
        const nb: Ball[] = [];
        for (const b of [...this.balls]) {
          if (b.stuck) continue;
          for (let i = 0; i < 2; i++) {
            const n = new Ball(b.x, b.y);
            n.active = b.active;
            n.speed = b.speed;
            n.fireball = b.fireball;
            n.fireT = b.fireT;
            const ba = Math.atan2(b.vy, b.vx);
            const off = (i * 2 - 1) * (Math.PI / 4);
            n.vx = n.speed * Math.cos(ba + off);
            n.vy = n.speed * Math.sin(ba + off);
            nb.push(n);
          }
        }
        this.balls.push(...nb);
        break;
      }
      case PU_LONG:
        this.paddle.expand(600);
        break;
      case PU_FIRE:
        for (const b of this.balls) b.activateFire(360);
        break;
      case PU_LASER:
        this.paddle.activateLaser(360);
        break;
      case PU_SLOW:
        for (const b of this.balls) {
          const s = Math.max(BALL_BASE_SPD * 0.7, Math.hypot(b.vx, b.vy) * 0.6);
          b.setSpeed(s);
          b.speed = s;
        }
        break;
      case PU_STICKY:
        this.paddle.sticky = true;
        this.paddle.stickyT = 600;
        break;
      case PU_LIFE:
        this.lives = Math.min(this.lives + 1, 9);
        break;
    }
  }

  private explodeTNT(tx: number, ty: number): void {
    for (let i = 0; i < 20; i++) this.particles.push(new Particle(tx, ty, "#ea4335"));
    for (const b of this.blocks) {
      if (b.alive && Math.hypot(b.x + BLK_W / 2 - tx, b.y + BLK_H / 2 - ty) < 100) {
        const d = b.hit();
        if (d) {
          this.score += b.btype === BT_DOUBLE ? 30 : 10;
          for (let i = 0; i < 4; i++)
            this.particles.push(new Particle(b.x + BLK_W / 2, b.y + BLK_H / 2, b.color));
          if (b.btype === BT_POWERUP && b.powerupType)
            this.powerups.push(new PowerUp(b.x + BLK_W / 2, b.y + BLK_H / 2, b.powerupType));
        }
      }
    }
  }

  // ---- Update ----
  update(input: GameInput): void {
    // Actualizar objetivo de la paleta desde mano o puntero.
    if (input.hand.present) {
      let tx = input.hand.x * GAME_W;
      tx = (tx - GAME_W / 2) * 2.3 + GAME_W / 2; // amplificación 2.3x (más sensible)
      this.handX = clamp(tx, 0, GAME_W);
      if (input.hand.fist) this.handleFist();
    } else if (input.pointer) {
      this.handX = input.pointer.x;
      this.smoothX = input.pointer.x; // el puntero no se suaviza (respuesta directa)
    }

    // Interpolación entre frames de detección (el suavizado anti-jitter ya
    // lo hace el HandTracker con One Euro; aquí solo rellenamos huecos).
    // Lerp alto = respuesta casi directa, sin añadir lag sobre el filtro.
    this.smoothX += (this.handX - this.smoothX) * 0.85;

    if (this.state === "playing" || this.state === "start") {
      this.paddle.update(this.smoothX, input.keys);
    }

    if (this.state === "playing") this.updatePlaying();
    if (this.state === "start") for (const b of this.balls) b.attachTo(this.paddle);
    if (this.state === "clear") {
      this.clearTimer--;
      if (this.clearTimer <= 0) {
        this.level++;
        if (this.level > LEVELS.length) {
          this.state = "win";
          this.signalGameOver();
        } else {
          this.resetLevel(this.level);
        }
      }
    }
    if (this.perfectShow > 0) this.perfectShow--;
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updatePlaying(): void {
    // TNT en explosión.
    for (const b of this.blocks) {
      if (b.alive && b.exploding) {
        b.explodeTimer--;
        if (b.explodeTimer <= 0) {
          b.alive = false;
          this.score += 10;
          for (let i = 0; i < 4; i++)
            this.particles.push(new Particle(b.x + BLK_W / 2, b.y + BLK_H / 2, b.color));
          this.explodeTNT(b.x + BLK_W / 2, b.y + BLK_H / 2);
        }
      }
    }
    // Bola pegada (sticky).
    const sb = this.paddle.stickyBall;
    if (sb && sb.stuck) {
      sb.x = this.paddle.x + this.paddle.w / 2;
      sb.y = this.paddle.y - sb.r - 1;
    }
    // Láser.
    if (this.paddle.laser && this.paddle.laserReady) {
      this.paddle.shoot();
      this.paddle.laserReady = false;
    }
    for (const l of this.paddle.lasers) {
      for (const blk of this.blocks) {
        if (!blk.alive) continue;
        if (l.x > blk.x && l.x < blk.x + BLK_W && l.y > blk.y && l.y < blk.y + BLK_H) {
          const d = blk.hit();
          if (d) {
            this.score += blk.btype === BT_DOUBLE ? 20 : 10;
            for (let i = 0; i < 4; i++)
              this.particles.push(new Particle(blk.x + BLK_W / 2, blk.y + BLK_H / 2, blk.color));
            if (blk.btype === BT_POWERUP && blk.powerupType)
              this.powerups.push(new PowerUp(blk.x + BLK_W / 2, blk.y + BLK_H / 2, blk.powerupType));
          }
          l.y = -100;
          break;
        }
      }
    }
    // Combo.
    this.comboTimer--;
    if (this.comboTimer <= 0) this.combo = 0;
    // Bolas.
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      const res = ball.update(this.blocks, this.paddle, this.particles);
      for (const r of res) {
        if (r[0] === "score") {
          this.combo++;
          this.comboTimer = 180;
          this.score += r[1] * Math.min(this.combo, 5);
        } else if (r[0] === "pu") {
          this.powerups.push(new PowerUp(r[2], r[3], r[1]));
        }
      }
      if (ball.y - ball.r > GAME_H) this.balls.splice(i, 1);
    }
    if (this.balls.length === 0) {
      this.lives--;
      this.perfect = false;
      for (let i = 0; i < 10; i++)
        this.particles.push(new Particle(this.paddle.x + this.paddle.w / 2, PAD_Y, G_BLUE));
      if (this.lives <= 0) {
        this.state = "over";
        this.signalGameOver();
      } else {
        const nb = new Ball(this.paddle.x + this.paddle.w / 2, PAD_Y - BALL_R - 1);
        nb.speed = BALL_BASE_SPD + (this.level - 1) * 0.5;
        this.balls = [nb];
        this.combo = 0;
        this.state = "start";
      }
    }
    // Power-ups cayendo (swept collision para evitar tunneling).
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.update();
      if (!pu.active) {
        this.powerups.splice(i, 1);
        continue;
      }
      const half = pu.size / 2;
      const padTop = this.paddle.y - 5;
      const padBot = this.paddle.y + this.paddle.h + 10;
      const horizOk = pu.x + half >= this.paddle.x && pu.x - half <= this.paddle.x + this.paddle.w;
      const vertOk = pu.prevY - half <= padBot && pu.y + half >= padTop;
      if (horizOk && vertOk) {
        this.applyPU(pu.type);
        for (let j = 0; j < 8; j++) this.particles.push(new Particle(pu.x, pu.y, pu.color));
        this.powerups.splice(i, 1);
      }
    }
    // ¿Nivel completado?
    if (this.blocks.every((b) => !b.alive)) {
      if (this.perfect) {
        this.score += 500;
        this.perfectShow = 180;
      }
      this.state = "clear";
      this.clearTimer = 180;
    }
  }

  // ---- Render ----
  render(c: CanvasRenderingContext2D): void {
    c.fillStyle = BG;
    c.fillRect(0, 0, WIN_W, WIN_H);

    for (const b of this.blocks) b.draw(c);
    for (const p of this.particles) p.draw(c);
    for (const pu of this.powerups) pu.draw(c);
    for (const b of this.balls) b.draw(c);
    this.paddle.draw(c);
    this.drawHUD(c);

    // Borde blanco alrededor del área de juego.
    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
    c.strokeRect(1, 1, WIN_W - 2, WIN_H - 2);

    c.textAlign = "center";
    if (this.state === "start") {
      c.fillStyle = "#aaaaaa";
      c.font = '12px "Press Start 2P", monospace';
      c.fillText("Mueve la mano, luego ESPACIO para empezar", GAME_W / 2, HUD_H + GAME_H / 2 + 40);
    }
    if (this.state === "clear") {
      const lines: Array<[string, string, string, number]> = [
        ["LEVEL CLEAR!", '24px "Press Start 2P", monospace', G_GREEN, -16],
        [`Score: ${String(this.score).padStart(5, "0")}`, '16px "Press Start 2P", monospace', "#ffffff", 20],
      ];
      if (this.perfectShow > 0)
        lines.push(["PERFECT! +500", '14px "Press Start 2P", monospace', G_YELLOW, 52]);
      this.drawOverlay(c, lines, 0.8);
    }
    if (this.state === "paused") {
      this.drawOverlay(
        c,
        [
          ["PAUSED", '24px "Press Start 2P", monospace', "#ffffff", -16],
          ["ESC to resume", '12px "Press Start 2P", monospace', "#aaaaaa", 16],
        ],
        0.8
      );
    }
    if (this.state === "over") this.drawGameOver(c);
    if (this.state === "win") {
      this.drawOverlay(
        c,
        [
          ["YOU WIN!", '32px "Press Start 2P", monospace', G_GREEN, -24],
          [`Score: ${String(this.score).padStart(5, "0")}`, '16px "Press Start 2P", monospace', "#ffffff", 20],
          ["ESPACIO para reiniciar", '12px "Press Start 2P", monospace', "#aaaaaa", 50],
        ],
        0.9
      );
    }
  }

  private drawHUD(c: CanvasRenderingContext2D): void {
    c.fillStyle = HUD_BG;
    c.fillRect(0, 0, WIN_W, HUD_H);
    c.fillStyle = "#ffffff";
    c.font = '18px "Press Start 2P", monospace';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(this.score).padStart(5, "0"), WIN_W / 2, HUD_H / 2);
    for (let i = 0; i < Math.max(MAX_LIVES, this.lives); i++) {
      const cx = 40 + i * 28;
      const cy = HUD_H / 2;
      c.beginPath();
      c.arc(cx, cy, 8, 0, Math.PI * 2);
      if (i < this.lives) {
        c.fillStyle = "#ffffff";
        c.fill();
      } else {
        c.strokeStyle = "#ffffff";
        c.lineWidth = 2;
        c.stroke();
      }
    }
    c.fillStyle = "#ffffff";
    c.font = "16px monospace";
    c.textAlign = "right";
    c.fillText("[⛶] 🔊", WIN_W - 20, HUD_H / 2);
  }

  private drawGameOver(c: CanvasRenderingContext2D): void {
    c.fillStyle = "rgba(32,33,36,0.85)";
    c.fillRect(0, HUD_H, GAME_W, GAME_H);
    const boxW = 340;
    const boxH = 260;
    const bx = GAME_W / 2 - boxW / 2;
    const by = HUD_H + GAME_H / 2 - boxH / 2 - 20;
    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
    rRect(c, bx, by, boxW, boxH, 8);
    c.stroke();
    c.textAlign = "center";
    c.fillStyle = "#ffffff";
    c.font = '28px "Press Start 2P", monospace';
    c.fillText("GAME OVER", GAME_W / 2, by + 50);
    c.font = '14px "Press Start 2P", monospace';
    c.fillText("SCORE", bx + 90, by + 120);
    c.fillText("HIGH", bx + boxW - 90, by + 120);
    c.fillText(String(this.score).padStart(5, "0"), bx + 90, by + 160);
    c.fillText(String(Math.max(this.score, 9650)).padStart(5, "0"), bx + boxW - 90, by + 160);
    const btnW = 200;
    const btnH = 46;
    const btnX = GAME_W / 2 - btnW / 2;
    const btnY = by + boxH + 20;
    c.fillStyle = "#ffffff";
    rRect(c, btnX, btnY, btnW, btnH, 6);
    c.fill();
    c.fillStyle = "#202124";
    c.font = '16px "Press Start 2P", monospace';
    c.fillText("PLAY AGAIN", GAME_W / 2, btnY + btnH / 2 + 2);
  }

  private drawOverlay(
    c: CanvasRenderingContext2D,
    texts: Array<[string, string, string, number]>,
    bgA = 0.55
  ): void {
    c.fillStyle = `rgba(32,33,36,${bgA})`;
    c.fillRect(0, HUD_H, GAME_W, GAME_H);
    const cy = HUD_H + GAME_H / 2;
    c.textAlign = "center";
    for (const [text, font, color, yOff] of texts) {
      c.fillStyle = color;
      c.font = font;
      c.fillText(text, GAME_W / 2, cy + yOff);
    }
  }
}

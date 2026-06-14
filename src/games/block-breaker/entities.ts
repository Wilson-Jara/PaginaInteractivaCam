// ============================================================
//  BLOCK BREAKER — entidades (clases del juego)
// ============================================================
//  Block, PowerUp, Paddle, Ball y Particle. Lógica de física y
//  dibujo de cada elemento. Tipado estricto (TS strict).
// ============================================================
import { rRect, overlap, type Rect } from "../../engine/canvasUtils";
import {
  GAME_W, GAME_H, HUD_H,
  BLK_W, BLK_H, BLK_GAP, BLK_MARGIN, GRID_TOP,
  ROW_COLORS, COLOR_MAP,
  BT_NORMAL, BT_DOUBLE, BT_POWERUP, BT_TNT,
  PU_COLORS, PU_LABELS, PU_WEIGHTS,
  POWERUP_SIZE, POWERUP_FALL_SPD,
  BALL_R, BALL_BASE_SPD, BALL_SPD_INC, BALL_MAX_SPD,
  PAD_SPEED, G_BLUE, G_ORANGE, G_RED,
} from "./levels";

/** Resultado de un tick de la bola, consumido por el juego. */
export type BallResult =
  | ["lose"]
  | ["score", number]
  | ["pu", string, number, number];

/** Elige un tipo de power-up según la tabla de probabilidad ponderada. */
export function weightedPU(): string {
  const total = PU_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of PU_WEIGHTS) {
    if (r < w) return type;
    r -= w;
  }
  return PU_WEIGHTS[0][0];
}

export class Block {
  col: number;
  row: number;
  btype: number;
  alive = true;
  hp = 1;
  maxHp = 1;
  flash = 0;
  powerupType: string | null = null;
  shimmer = 0;
  exploding = false;
  explodeTimer = 0;
  color: string;
  x: number;
  y: number;

  constructor(col: number, row: number, btype = BT_NORMAL, color: string | null = null) {
    this.col = col;
    this.row = row;
    this.btype = btype;
    const base = color || ROW_COLORS[row % ROW_COLORS.length];
    if (btype === BT_DOUBLE) {
      this.hp = 3;
      this.maxHp = 3;
      this.color = "#9aa0a6"; // 3 hits, color plateado
    } else if (btype === BT_POWERUP) {
      this.powerupType = weightedPU();
      this.color = base;
    } else {
      this.color = base;
    }
    this.x = BLK_MARGIN + col * (BLK_W + BLK_GAP);
    this.y = GRID_TOP + row * (BLK_H + BLK_GAP);
  }

  /** Aplica un golpe. Devuelve true si el bloque fue destruido. */
  hit(): boolean {
    if (this.btype === BT_TNT) {
      if (!this.exploding) {
        this.exploding = true;
        this.explodeTimer = 30;
      }
      return false;
    }
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    this.flash = 8;
    return false;
  }

  draw(c: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const col = this.flash > 0 ? "#ffffff" : this.color;
    if (this.flash > 0) this.flash--;

    c.fillStyle = col;
    rRect(c, this.x, this.y, BLK_W, BLK_H, 6);
    c.fill();

    // Brillo superior para el look 3D glossy.
    const g = c.createLinearGradient(this.x, this.y, this.x, this.y + BLK_H);
    g.addColorStop(0, "rgba(255,255,255,0.3)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.15)");
    rRect(c, this.x, this.y, BLK_W, BLK_H, 6);
    c.fillStyle = g;
    c.fill();

    if (this.btype === BT_DOUBLE && this.hp > 1) {
      c.fillStyle = "rgba(0,0,0,0.3)";
      rRect(c, this.x + 6, this.y + 5, BLK_W - 12, BLK_H - 10, 4);
      c.fill();
      if (this.hp > 2) {
        c.fillStyle = "rgba(0,0,0,0.3)";
        rRect(c, this.x + 12, this.y + 10, BLK_W - 24, BLK_H - 20, 2);
        c.fill();
      }
    }

    if (this.btype === BT_TNT) {
      c.fillStyle = "rgba(0,0,0,0.6)";
      if (this.exploding && Math.floor(this.explodeTimer / 5) % 2 === 0) {
        c.fillStyle = "rgba(255,0,0,0.8)";
      }
      c.font = 'bold 10px "Press Start 2P", monospace';
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("TNT", this.x + BLK_W / 2, this.y + BLK_H / 2 + 1);
    } else if (this.btype === BT_POWERUP && this.powerupType) {
      this.shimmer = (this.shimmer || 0) + 0.06;
      c.globalAlpha = 0.5 + 0.3 * Math.sin(this.shimmer);
      c.fillStyle = "#ffffff";
      c.font = "13px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(PU_LABELS[this.powerupType] || "", this.x + BLK_W / 2, this.y + BLK_H / 2 + 2);
      c.globalAlpha = 1;
    }
  }
}

export class PowerUp {
  x: number;
  y: number;
  prevY: number;
  type: string;
  color: string;
  size = POWERUP_SIZE;
  active = true;

  constructor(x: number, y: number, type: string) {
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.type = type;
    this.color = PU_COLORS[type];
  }

  update(): void {
    this.prevY = this.y;
    this.y += POWERUP_FALL_SPD;
    if (this.y > GAME_H + HUD_H + this.size) this.active = false;
  }

  draw(c: CanvasRenderingContext2D): void {
    c.fillStyle = this.color;
    rRect(c, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, 8);
    c.fill();
    c.font = "15px monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(PU_LABELS[this.type] || "?", this.x, this.y + 1);
  }

  rect(): Rect {
    return { x: this.x - this.size / 2, y: this.y - this.size / 2, w: this.size, h: this.size };
  }
}

export class Paddle {
  baseW = 100;
  w = 100;
  h = 12;
  x: number;
  y: number;
  prevX: number;
  sticky = false;
  laser = false;
  laserT = 0;
  longT = 0;
  stickyT = 0;
  stickyBall: Ball | null = null;
  lasers: Array<{ x: number; y: number }> = [];
  laserReady = false;

  constructor() {
    this.x = GAME_W / 2 - this.w / 2;
    this.y = GAME_H - 44;
    this.prevX = this.x;
  }

  update(mx: number | null, keys: Readonly<Record<string, boolean>>): void {
    this.prevX = this.x;
    let t = mx !== null ? mx - this.w / 2 : this.x;
    if (keys["ArrowLeft"] || keys["KeyA"]) t = this.x - PAD_SPEED;
    if (keys["ArrowRight"] || keys["KeyD"]) t = this.x + PAD_SPEED;
    this.x = Math.max(0, Math.min(GAME_W - this.w, t));
    if (this.longT > 0) {
      this.longT--;
      if (this.longT <= 0) this.w = this.baseW;
    }
    if (this.stickyT > 0) {
      this.stickyT--;
      if (this.stickyT <= 0) this.sticky = false;
    }
    if (this.laserT > 0) {
      this.laserT--;
      if (this.laserT <= 0) this.laser = false;
      else if (this.laserT % 30 === 0) this.shoot();
    }
    for (const l of this.lasers) l.y -= 8;
    this.lasers = this.lasers.filter((l) => l.y > 0);
  }

  expand(d = 300): void {
    this.w = Math.floor(this.baseW * 1.5);
    this.longT = d;
  }

  activateLaser(d = 180): void {
    this.laser = true;
    this.laserT = d;
  }

  shoot(): void {
    if (this.laser) {
      this.lasers.push({ x: this.x + 10, y: this.y });
      this.lasers.push({ x: this.x + this.w - 10, y: this.y });
    }
  }

  draw(c: CanvasRenderingContext2D): void {
    c.fillStyle = "#ffffff";
    rRect(c, this.x, this.y, this.w, this.h, this.h / 2);
    c.fill();

    if (this.laser) {
      c.fillStyle = G_RED;
      c.fillRect(this.x + 6, this.y - 6, 8, 6);
      c.fillRect(this.x + this.w - 14, this.y - 6, 8, 6);
    }
    for (const l of this.lasers) {
      c.fillStyle = G_RED;
      c.fillRect(l.x - 1, l.y, 3, 14);
    }
  }

  rect(): Rect {
    return { x: this.x, y: this.y - 5, w: this.w, h: this.h + 15 };
  }
}

export class Ball {
  x: number;
  y: number;
  r = BALL_R;
  color = G_BLUE;
  active = false;
  speed = BALL_BASE_SPD;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }> = [];
  fireball = false;
  fireT = 0;
  stuck = false;
  bounces = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.vx = this.speed * Math.cos(a);
    this.vy = this.speed * Math.sin(a);
  }

  attachTo(p: Paddle): void {
    this.x = p.x + p.w / 2;
    this.y = p.y - this.r - 1;
    this.stuck = true;
  }

  launch(): void {
    this.active = true;
    this.stuck = false;
    this.vy = -Math.abs(this.vy);
  }

  setSpeed(s: number): void {
    const o = Math.hypot(this.vx, this.vy);
    if (o < 0.01) return;
    const r = s / o;
    this.vx *= r;
    this.vy *= r;
  }

  activateFire(d = 120): void {
    this.fireball = true;
    this.fireT = d;
  }

  update(blocks: Block[], paddle: Paddle, particles: Particle[]): BallResult[] {
    if (!this.active || this.stuck) return [];
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    if (this.fireball) {
      this.fireT--;
      if (this.fireT <= 0) this.fireball = false;
    }
    if (this.x - this.r < 0) {
      this.x = this.r;
      this.vx = Math.abs(this.vx);
    }
    if (this.x + this.r > GAME_W) {
      this.x = GAME_W - this.r;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y - this.r < HUD_H) {
      this.y = HUD_H + this.r;
      this.vy = Math.abs(this.vy);
    }
    if (this.y - this.r > GAME_H) return [["lose"]];

    const res: BallResult[] = [];
    const br: Rect = { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    const pr = paddle.rect();
    if (paddle.sticky && overlap(br, pr) && this.vy > 0) {
      this.active = false;
      this.stuck = true;
      paddle.stickyBall = this;
      return [];
    }
    if (overlap(br, pr) && this.vy > 0) {
      let rel = (this.x - paddle.x) / paddle.w;
      rel = Math.max(-0.85, Math.min(0.85, rel * 2 - 1));
      const a = rel * (Math.PI / 3);
      const spd = Math.hypot(this.vx, this.vy);
      this.bounces++;
      const inc = Math.min(this.bounces * 0.05, 3);
      const ns = Math.min(spd + BALL_SPD_INC + inc, BALL_MAX_SPD);
      this.vx = ns * Math.sin(a);
      this.vy = -ns * Math.cos(a);
      this.y = paddle.y - this.r - 1;
      this.speed = ns;
      if (paddle.laser) paddle.laserReady = true;
    }
    for (const blk of blocks) {
      if (!blk.alive) continue;
      const bkr: Rect = { x: blk.x, y: blk.y, w: BLK_W, h: BLK_H };
      if (!overlap(br, bkr)) continue;
      if (!this.fireball) {
        const ol = br.x + br.w - bkr.x;
        const or2 = bkr.x + bkr.w - br.x;
        const ot = br.y + br.h - bkr.y;
        const ob = bkr.y + bkr.h - br.y;
        const m = Math.min(ol, or2, ot, ob);
        if (m === ot || m === ob) this.vy *= -1;
        else this.vx *= -1;
      }
      const destroyed = blk.hit();
      if (destroyed) {
        this.color = blk.color;
        for (let i = 0; i < 6; i++)
          particles.push(new Particle(blk.x + BLK_W / 2, blk.y + BLK_H / 2, blk.color));
        if (blk.btype === BT_POWERUP && blk.powerupType)
          res.push(["pu", blk.powerupType, blk.x + BLK_W / 2, blk.y + BLK_H / 2]);
        res.push(["score", blk.btype === BT_DOUBLE ? 30 : 10]);
      } else {
        this.color = blk.color;
        for (let i = 0; i < 2; i++)
          particles.push(new Particle(blk.x + BLK_W / 2, blk.y + BLK_H / 2, blk.color));
      }
      if (!this.fireball) break;
    }
    return res;
  }

  draw(c: CanvasRenderingContext2D): void {
    if (this.fireball) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const a = (i / this.trail.length) * 0.6;
        c.globalAlpha = a;
        c.fillStyle = G_ORANGE;
        c.beginPath();
        c.arc(t.x, t.y, this.r * 0.8, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      const g = c.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.r * 2);
      g.addColorStop(0, "#fff7e6");
      g.addColorStop(0.5, G_ORANGE);
      g.addColorStop(1, "rgba(250,144,62,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(this.x, this.y, this.r * 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fff7e6";
      c.beginPath();
      c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      c.fill();
    }
  }
}

export class Particle {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 3;
    this.vx = sp * Math.cos(a);
    this.vy = sp * Math.sin(a);
    this.life = 12 + Math.floor(Math.random() * 16);
    this.maxLife = this.life;
    this.r = 2 + Math.floor(Math.random() * 3);
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life--;
  }

  draw(c: CanvasRenderingContext2D): void {
    const a = (this.life / this.maxLife) ** 0.7;
    c.globalAlpha = a;
    c.fillStyle = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }
}

/** Construye los bloques de un nivel a partir de su mapa ASCII. */
export function parseLevel(data: string[]): Block[] {
  const b: Block[] = [];
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === ".") continue;
      const base = ROW_COLORS[r % ROW_COLORS.length];
      if (ch === "D") b.push(new Block(c, r, BT_DOUBLE, COLOR_MAP[ch] || base));
      else if (ch === "T") b.push(new Block(c, r, BT_TNT, base));
      else if (ch === "*") b.push(new Block(c, r, BT_POWERUP, base));
      else {
        // Bloque normal del color indicado: sin azar, para conservar la
        // simetría exacta del diseño del nivel.
        b.push(new Block(c, r, BT_NORMAL, COLOR_MAP[ch] || base));
      }
    }
  }
  return b;
}

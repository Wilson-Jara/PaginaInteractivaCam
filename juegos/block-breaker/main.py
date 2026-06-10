import pygame
import mediapipe
import cv2
import sys
import math
import random
import numpy as np
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions
from mediapipe.tasks.python.vision.hand_landmarker import HandLandmarksConnections
from mediapipe.tasks.python.vision.core.image import Image as mp_Image, ImageFormat
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode
from mediapipe.tasks.python.core.base_options import BaseOptions

mp_connections = HandLandmarksConnections()
HAND_CONNECTIONS = mp_connections.HAND_CONNECTIONS

def draw_hand_landmarks(frame, landmarks, connections):
    h, w = frame.shape[:2]
    # Dibujar puntos
    for lm in landmarks:
        cx, cy = int(lm.x * w), int(lm.y * h)
        cv2.circle(frame, (cx, cy), 3, (0, 255, 0), -1)
    # Dibujar conexiones
    for conn in connections:
        x1, y1 = int(landmarks[conn.start].x * w), int(landmarks[conn.start].y * h)
        x2, y2 = int(landmarks[conn.end].x * w), int(landmarks[conn.end].y * h)
        cv2.line(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)

pygame.init()
pygame.font.init()

GAME_W, GAME_H = 960, 768
HUD_H = 96
WIN_W = GAME_W
WIN_H = GAME_H + HUD_H
FPS = 60

BASE_W = WIN_W
BASE_H = WIN_H

DEFAULT_SCALE = 1

CAM_W = 640
CAM_H = 480
TOTAL_W = BASE_W + CAM_W
TOTAL_H = BASE_H

BG_GAME = (18, 18, 18)
BG_HUD = (30, 30, 30)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY_DARK = (80, 80, 80)
GRAY_MED = (140, 140, 140)
GRAY_LIGHT = (200, 200, 200)

G_BLUE = (66, 133, 244)
G_RED = (234, 67, 53)
G_YELLOW = (251, 188, 5)
G_GREEN = (52, 168, 83)
G_PURPLE = (153, 77, 195)
G_ORANGE = (255, 109, 0)
G_TEAL = (0, 188, 212)
G_PINK = (233, 30, 99)

ROW_COLORS = [G_BLUE, G_RED, G_YELLOW, G_GREEN, G_PURPLE, G_ORANGE, G_TEAL, G_PINK]

COLS = 10
ROWS = 5
BLK_GAP = 6
BLK_MARGIN = 24
BLK_H = 36
BLK_W = (GAME_W - 2 * BLK_MARGIN - BLK_GAP * (COLS - 1)) // COLS
GRID_TOP = 80

PAD_W = 144
PAD_H = 20
PAD_Y = GAME_H - 40
PAD_COLOR = WHITE
PAD_RADIUS = PAD_H // 2
PAD_SPEED = 14

BALL_R = 12
BALL_BASE_SPD = 13.0
BALL_SPD_INCREMENT = 0.3
BALL_MAX_SPD = 30.0

MAX_LIVES = 3
LIFE_R = 14

POWERUP_FALL_SPD = 4.0
POWERUP_SIZE = 32

PU_MULTI = "multi"
PU_FIRE = "fire"
PU_LASER = "laser"
PU_LONG = "long"
PU_SLOW = "slow"
PU_LIFE = "life"
PU_STICKY = "sticky"

PU_COLORS = {
    PU_MULTI: (0, 200, 255),
    PU_FIRE: (255, 100, 0),
    PU_LASER: (255, 50, 50),
    PU_LONG: (100, 255, 100),
    PU_SLOW: (180, 100, 255),
    PU_LIFE: (255, 80, 120),
    PU_STICKY: (255, 255, 100),
}
PU_LABELS = {
    PU_MULTI: "M",
    PU_FIRE: "F",
    PU_LASER: "L",
    PU_LONG: "W",
    PU_SLOW: "S",
    PU_LIFE: "+",
    PU_STICKY: "G",
}

BT_NORMAL = 0
BT_DOUBLE = 1
BT_POWERUP = 2

try:
    SCORE_FONT = pygame.font.Font(None, 56)
    SMALL_FONT = pygame.font.SysFont("consolas", 24, bold=True)
    UI_FONT = pygame.font.SysFont("consolas", 36, bold=True)
    BIG_FONT = pygame.font.SysFont("consolas", 72, bold=True)
    LEVEL_FONT = pygame.font.SysFont("consolas", 48, bold=True)
    PU_FONT = pygame.font.SysFont("consolas", 20, bold=True)
except Exception:
    SCORE_FONT = pygame.font.SysFont("monospace", 44, bold=True)
    SMALL_FONT = SCORE_FONT
    UI_FONT = SCORE_FONT
    BIG_FONT = SCORE_FONT
    LEVEL_FONT = SCORE_FONT
    PU_FONT = SCORE_FONT

LEVELS = [
    # Nivel 1: Filas simples
    [
        "RRRRRRRRRR",
        "YYYYYYYYYY",
        "GGGGGGGGGG",
        "BBBBBBBBBB",
        "..........",
    ],
    # Nivel 2: Diamante
    [
        "....RR....",
        "...YYYY...",
        "..GGGGGG..",
        ".BBBBBBBB.",
        "RRRRRRRRRR",
    ],
    # Nivel 3: Cruz
    [
        "..BBBBBB..",
        "..BBBBBB..",
        "RRRRRRRRRR",
        "..BBBBBB..",
        "..BBBBBB..",
    ],
    # Nivel 4: Pirámide invertida
    [
        "RRRRRRRRRR",
        ".RRRRRRRR.",
        "..RRRRRR..",
        "...RRRR...",
        "....RR....",
    ],
    # Nivel 5: Marco
    [
        "RRRRRRRRRR",
        "R........R",
        "R.RRRRRR.R",
        "R........R",
        "RRRRRRRRRR",
    ],
    # Nivel 6: Ajedrez
    [
        "R.Y.G.B.R.",
        "Y.G.B.R.Y.",
        "G.B.R.Y.G.",
        "B.R.Y.G.B.",
        "R.Y.G.B.R.",
    ],
    # Nivel 7: Doble línea con huecos
    [
        "RR..RR..RR",
        "YY..YY..YY",
        "GG..GG..GG",
        "BB..BB..BB",
        "RR..RR..RR",
    ],
    # Nivel 8: X pattern
    [
        "R........R",
        ".R......R.",
        "..R....R..",
        ".R......R.",
        "R........R",
    ],
    # Nivel 9: Bloques dobles
    [
        "DDDDDDDDDD",
        "DDDDDDDDDD",
        "..........",
        "DDDDDDDDDD",
        "DDDDDDDDDD",
    ],
    # Nivel 10: Espiral
    [
        "RRRRRRRRRR",
        "R........R",
        "R.RRRRRR.R",
        "R.R.....R.",
        "R.RRRRRRR.",
    ],
    # Nivel 11: Triángulos
    [
        "....RR....",
        "...RRRR...",
        "..RRRRRR..",
        ".RRRRRRRR.",
        "RRRRRRRRRR",
    ],
    # Nivel 12: Líneas diagonales
    [
        "R.........",
        ".Y........",
        "..G.......",
        "...B......",
        "....R.....",
    ],
    # Nivel 13: Cuadrados concéntricos
    [
        "RRRRRRRRRR",
        "R........R",
        "R.YYYYYY.R",
        "R........R",
        "RRRRRRRRRR",
    ],
    # Nivel 14: Zigzag
    [
        "RR........",
        "..YY......",
        "....GG....",
        "......BB..",
        "........RR",
    ],
    # Nivel 15: Patrón complejo
    [
        "R.Y.G.B.R.",
        "Y.G.B.R.Y.",
        "G.B.R.Y.G.",
        "B.R.Y.G.B.",
        "R.Y.G.B.R.",
    ],
]


def draw_powerup_icon(surf, pu_type, cx, cy, size, color):
    if pu_type == PU_MULTI:
        for dx, dy in [(-size//3, 0), (size//3, -size//4), (size//3, size//4)]:
            pygame.draw.circle(surf, color, (cx + dx, cy + dy), size//4)
            pygame.draw.circle(surf, WHITE, (cx + dx - 2, cy + dy - 2), size//8)
    
    elif pu_type == PU_FIRE:
        pts = [
            (cx, cy - size//2),
            (cx + size//3, cy),
            (cx + size//4, cy + size//3),
            (cx, cy + size//2),
            (cx - size//4, cy + size//3),
            (cx - size//3, cy),
        ]
        pygame.draw.polygon(surf, color, pts)
        pygame.draw.polygon(surf, (255, 200, 100), [
            (cx, cy - size//4),
            (cx + size//6, cy),
            (cx, cy + size//4),
            (cx - size//6, cy),
        ])
    
    elif pu_type == PU_LASER:
        pygame.draw.polygon(surf, color, [
            (cx - size//4, cy - size//2),
            (cx + size//4, cy - size//2),
            (cx + size//6, cy - size//6),
            (cx + size//3, cy - size//6),
            (cx, cy + size//2),
            (cx - size//6, cy + size//6),
            (cx - size//3, cy + size//6),
        ])
        pygame.draw.circle(surf, (255, 255, 200), (cx, cy), size//6)
    
    elif pu_type == PU_LONG:
        pygame.draw.rect(surf, color, (cx - size//2, cy - size//6, size, size//3), border_radius=4)
        pygame.draw.polygon(surf, color, [
            (cx - size//2, cy),
            (cx - size//2 - size//4, cy - size//4),
            (cx - size//2 - size//4, cy + size//4),
        ])
        pygame.draw.polygon(surf, color, [
            (cx + size//2, cy),
            (cx + size//2 + size//4, cy - size//4),
            (cx + size//2 + size//4, cy + size//4),
        ])
    
    elif pu_type == PU_SLOW:
        pygame.draw.circle(surf, color, (cx, cy), size//2, 4)
        pygame.draw.circle(surf, color, (cx, cy), size//3, 4)
        pygame.draw.line(surf, color, (cx, cy), (cx, cy - size//3), 4)
        pygame.draw.line(surf, color, (cx, cy), (cx + size//4, cy), 4)
        pygame.draw.circle(surf, color, (cx, cy), 4)
    
    elif pu_type == PU_LIFE:
        r = size // 4
        pygame.draw.circle(surf, color, (cx - r, cy - r//2), r)
        pygame.draw.circle(surf, color, (cx + r, cy - r//2), r)
        pts = [(cx - r * 2, cy - r//2), (cx + r * 2, cy - r//2), (cx, cy + r * 2)]
        pygame.draw.polygon(surf, color, pts)
        pygame.draw.circle(surf, (255, 200, 200), (cx - r, cy - r//2), r//2)
        pygame.draw.circle(surf, (255, 200, 200), (cx + r, cy - r//2), r//2)
    
    elif pu_type == PU_STICKY:
        pygame.draw.circle(surf, color, (cx, cy - size//6), size//3)
        pygame.draw.rect(surf, color, (cx - size//4, cy, size//2, size//3), border_radius=4)
        pygame.draw.circle(surf, (255, 255, 200), (cx - size//6, cy - size//4), size//8)


class Block:
    def __init__(self, col, row, btype=BT_NORMAL, color=None):
        self.col = col
        self.row = row
        self.btype = btype
        self.color = color or ROW_COLORS[row % len(ROW_COLORS)]
        self.alive = True
        self.hp = 1
        self.max_hp = 1
        self.flash_timer = 0
        self.powerup_type = None
        self.shimmer = 0.0

        if btype == BT_DOUBLE:
            self.hp = 2
            self.max_hp = 2
            self.color = tuple(max(0, c - 40) for c in (color or ROW_COLORS[row % len(ROW_COLORS)]))
        elif btype == BT_POWERUP:
            self.hp = 1
            self.max_hp = 1
            self.powerup_type = random.choice([PU_MULTI, PU_FIRE, PU_LASER, PU_LONG, PU_SLOW, PU_LIFE, PU_STICKY])

        self.rect = self._make_rect()

    def _make_rect(self):
        x = BLK_MARGIN + self.col * (BLK_W + BLK_GAP)
        y = GRID_TOP + self.row * (BLK_H + BLK_GAP)
        return pygame.Rect(x, y, BLK_W, BLK_H)

    def hit(self):
        self.hp -= 1
        if self.hp <= 0:
            self.alive = False
            return True
        self.flash_timer = 10
        return False

    def draw(self, surf, frame):
        if not self.alive:
            return

        col = self.color
        if self.flash_timer > 0:
            col = WHITE
            self.flash_timer -= 1

        shadow_rect = self.rect.move(4, 4)
        shadow_surf = pygame.Surface((shadow_rect.w, shadow_rect.h), pygame.SRCALPHA)
        pygame.draw.rect(shadow_surf, (0, 0, 0, 60), shadow_surf.get_rect(), border_radius=8)
        surf.blit(shadow_surf, shadow_rect.topleft)

        pygame.draw.rect(surf, col, self.rect, border_radius=8)

        grad = pygame.Surface((self.rect.w, self.rect.h), pygame.SRCALPHA)
        for y in range(self.rect.h // 2):
            alpha = int(50 * (1 - y / (self.rect.h // 2)))
            pygame.draw.line(grad, (255, 255, 255, alpha), (4, y), (self.rect.w - 4, y))
        for y in range(self.rect.h // 2, self.rect.h):
            alpha = int(40 * ((y - self.rect.h // 2) / (self.rect.h // 2)))
            pygame.draw.line(grad, (0, 0, 0, alpha), (4, y), (self.rect.w - 4, y))
        surf.blit(grad, self.rect.topleft)

        pygame.draw.rect(surf, tuple(min(255, c + 30) for c in col), self.rect, width=2, border_radius=8)

        if self.btype == BT_DOUBLE and self.hp == 2:
            inner = self.rect.inflate(-16, -12)
            pygame.draw.rect(surf, tuple(min(255, c + 60) for c in self.color), inner, border_radius=6)
            pygame.draw.rect(surf, col, inner, width=2, border_radius=6)

        elif self.btype == BT_POWERUP:
            self.shimmer = (self.shimmer + 0.08) % (math.pi * 2)
            glow = int(50 * math.sin(self.shimmer))
            glow_col = tuple(min(255, max(0, c + glow)) for c in self.color)
            pygame.draw.rect(surf, glow_col, self.rect.inflate(-6, -6), border_radius=6)
            if self.powerup_type:
                icon_col = PU_COLORS.get(self.powerup_type, WHITE)
                draw_powerup_icon(surf, self.powerup_type, self.rect.centerx, self.rect.centery, min(self.rect.w, self.rect.h) - 8, icon_col)


class PowerUp:
    def __init__(self, x, y, pu_type):
        self.x = float(x)
        self.y = float(y)
        self.pu_type = pu_type
        self.color = PU_COLORS.get(pu_type, WHITE)
        self.label = PU_LABELS.get(pu_type, "?")
        self.size = POWERUP_SIZE
        self.active = True
        self.rect = pygame.Rect(int(self.x - self.size // 2), int(self.y - self.size // 2),
                                self.size, self.size)

    def update(self):
        self.y += POWERUP_FALL_SPD
        self.rect.x = int(self.x - self.size // 2)
        self.rect.y = int(self.y - self.size // 2)
        if self.y > GAME_H + self.size:
            self.active = False

    def draw(self, surf):
        glow_r = self.size // 2 + 8
        glow = pygame.Surface((glow_r * 2, glow_r * 2), pygame.SRCALPHA)
        for r, a in [(glow_r, 20), (glow_r - 4, 40), (glow_r - 8, 60)]:
            pygame.draw.circle(glow, (*self.color, a), (glow_r, glow_r), r)
        surf.blit(glow, (int(self.x) - glow_r, int(self.y) - glow_r))

        pygame.draw.rect(surf, self.color, self.rect, border_radius=10)

        inner = self.rect.inflate(-8, -8)
        pygame.draw.rect(surf, tuple(min(255, c + 50) for c in self.color), inner, border_radius=6)

        pygame.draw.rect(surf, tuple(min(255, c + 80) for c in self.color), self.rect, width=2, border_radius=10)

        draw_powerup_icon(surf, self.pu_type, self.rect.centerx, self.rect.centery, self.size - 12, WHITE)


class Paddle:
    def __init__(self):
        self.base_w = PAD_W
        self.w = PAD_W
        self.h = PAD_H
        self.x = (GAME_W - self.w) // 2
        self.y = PAD_Y
        self.rect = pygame.Rect(self.x, self.y, self.w, self.h)
        self.long_timer = 0
        self.sticky = False
        self.sticky_timer = 0
        self.sticky_ball = None
        self.laser = False
        self.laser_timer = 0
        self.lasers = []
        self.laser_ready = False

    def update(self, mx=None, keys=None):
        if mx is not None:
            target = mx - self.w // 2
        else:
            target = self.x

        if keys:
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                target = self.x - PAD_SPEED
            if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                target = self.x + PAD_SPEED

        self.x = max(0, min(GAME_W - self.w, int(target)))
        self.rect.x = self.x
        self.rect.width = self.w

        if self.long_timer > 0:
            self.long_timer -= 1
            if self.long_timer <= 0:
                self.w = self.base_w
                self.rect.width = self.w

        if self.sticky_timer > 0:
            self.sticky_timer -= 1
            if self.sticky_timer <= 0:
                self.sticky = False

        if self.laser_timer > 0:
            self.laser_timer -= 1
            if self.laser_timer <= 0:
                self.laser = False

        for laser in self.lasers:
            laser["y"] -= 8
        self.lasers = [l for l in self.lasers if l["y"] > 0]

    def expand(self, duration=300):
        self.w = int(self.base_w * 1.5)
        self.rect.width = self.w
        self.long_timer = duration

    def activate_laser(self, duration=180):
        self.laser = True
        self.laser_timer = duration

    def shoot(self):
        if self.laser:
            self.lasers.append({"x": self.x + 12, "y": self.y})
            self.lasers.append({"x": self.x + self.w - 12, "y": self.y})

    def draw(self, surf):
        col = PAD_COLOR
        if self.sticky:
            col = (255, 255, 100)
        if self.long_timer > 0 and self.long_timer < 120 and self.long_timer % 20 < 10:
            col = (200, 200, 200)

        shadow_rect = self.rect.move(4, 6)
        shadow_surf = pygame.Surface((shadow_rect.w, shadow_rect.h), pygame.SRCALPHA)
        pygame.draw.rect(shadow_surf, (0, 0, 0, 80), shadow_surf.get_rect(), border_radius=PAD_RADIUS)
        surf.blit(shadow_surf, shadow_rect.topleft)

        pygame.draw.rect(surf, col, self.rect, border_radius=PAD_RADIUS)

        grad = pygame.Surface((self.rect.w, self.rect.h), pygame.SRCALPHA)
        for y in range(self.rect.h // 2):
            alpha = int(70 * (1 - y / (self.rect.h // 2)))
            pygame.draw.line(grad, (255, 255, 255, alpha), (PAD_RADIUS, y), (self.rect.w - PAD_RADIUS, y))
        surf.blit(grad, self.rect.topleft)

        pygame.draw.rect(surf, tuple(min(255, c + 40) for c in col), self.rect, width=2, border_radius=PAD_RADIUS)

        if self.laser:
            pygame.draw.rect(surf, G_RED, pygame.Rect(self.x + 8, self.y - 8, 10, 8), border_radius=2)
            pygame.draw.rect(surf, G_RED, pygame.Rect(self.x + self.w - 18, self.y - 8, 10, 8), border_radius=2)
            pygame.draw.circle(surf, (255, 150, 150), (self.x + 12, self.y - 8), 4)
            pygame.draw.circle(surf, (255, 150, 150), (self.x + self.w - 14, self.y - 8), 4)

        for laser in self.lasers:
            glow_surf = pygame.Surface((12, 32), pygame.SRCALPHA)
            pygame.draw.line(glow_surf, (255, 100, 100, 100), (6, 0), (6, 32), 8)
            surf.blit(glow_surf, (laser["x"] - 6, laser["y"] - 4))
            pygame.draw.line(surf, (255, 200, 200), (laser["x"], laser["y"]), (laser["x"], laser["y"] + 28), 4)


class Ball:
    def __init__(self, x, y):
        self.x = float(x)
        self.y = float(y)
        self.r = BALL_R
        self.color = WHITE
        self.active = False
        angle = -math.pi / 2 + random.uniform(-0.35, 0.35)
        self.speed = BALL_BASE_SPD
        self.base_speed = BALL_BASE_SPD
        self.vx = self.speed * math.cos(angle)
        self.vy = self.speed * math.sin(angle)
        self.trail = []
        self.fireball = False
        self.fire_timer = 0
        self.stuck = False
        self.bounce_count = 0

    def attach_to(self, paddle):
        self.x = paddle.x + paddle.w // 2
        self.y = paddle.y - self.r - 1
        self.stuck = True

    def launch(self):
        self.active = True
        self.stuck = False
        angle = -math.pi / 2 + random.uniform(-0.35, 0.35)
        self.vx = self.speed * math.cos(angle)
        self.vy = self.speed * math.sin(angle)

    def set_speed(self, new_speed):
        old = math.hypot(self.vx, self.vy)
        if old < 0.01:
            return
        ratio = new_speed / old
        self.vx *= ratio
        self.vy *= ratio
        self.speed = new_speed

    def activate_fire(self, duration=120):
        self.fireball = True
        self.fire_timer = duration

    def update(self, blocks, paddle, particles):
        if not self.active or self.stuck:
            return []

        results = []

        self.trail.append((int(self.x), int(self.y)))
        if len(self.trail) > 10:
            self.trail.pop(0)

        self.x += self.vx
        self.y += self.vy

        if self.fireball:
            self.fire_timer -= 1
            if self.fire_timer <= 0:
                self.fireball = False

        if self.x - self.r < 0:
            self.x = self.r
            self.vx = abs(self.vx)
        elif self.x + self.r > GAME_W:
            self.x = GAME_W - self.r
            self.vx = -abs(self.vx)

        if self.y - self.r < 0:
            self.y = self.r
            self.vy = abs(self.vy)

        if self.y - self.r > GAME_H:
            return ["lose_life"]

        ball_rect = pygame.Rect(int(self.x - self.r), int(self.y - self.r),
                                self.r * 2, self.r * 2)

        if paddle.sticky and ball_rect.colliderect(paddle.rect) and self.vy > 0:
            self.active = False
            self.stuck = True
            paddle.sticky_ball = self
            return []

        if ball_rect.colliderect(paddle.rect) and self.vy > 0:
            rel = (self.x - paddle.x) / paddle.w
            rel = rel * 2 - 1
            rel = max(-0.9, min(0.9, rel))
            angle = rel * (math.pi / 3)
            spd = math.hypot(self.vx, self.vy)
            self.bounce_count += 1
            speed_increase = min(self.bounce_count * 0.06, 4.0)
            new_spd = min(spd + BALL_SPD_INCREMENT + speed_increase, BALL_MAX_SPD)
            self.vx = new_spd * math.sin(angle)
            self.vy = -new_spd * math.cos(angle)
            self.y = paddle.y - self.r - 1
            self.speed = new_spd
            ball_rect = pygame.Rect(int(self.x - self.r), int(self.y - self.r),
                                    self.r * 2, self.r * 2)
            if paddle.laser:
                paddle.laser_ready = True

        for blk in blocks:
            if not blk.alive:
                continue
            if not ball_rect.colliderect(blk.rect):
                continue

            ol = ball_rect.right - blk.rect.left
            overlap_right = blk.rect.right - ball_rect.left
            ot = ball_rect.bottom - blk.rect.top
            ob = blk.rect.bottom - ball_rect.top
            min_ov = min(ol, overlap_right, ot, ob)

            if not self.fireball:
                if min_ov == ot or min_ov == ob:
                    self.vy *= -1
                else:
                    self.vx *= -1

            destroyed = blk.hit()

            if destroyed:
                self.color = blk.color
                cx, cy = blk.rect.center
                for _ in range(8):
                    particles.append(Particle(cx, cy, blk.color))

                if blk.btype == BT_POWERUP and blk.powerup_type:
                    results.append(("powerup", blk.powerup_type, cx, cy))

                if blk.btype == BT_DOUBLE:
                    results.append(("score", 20))
                else:
                    results.append(("score", 10))
            else:
                self.color = blk.color
                for _ in range(3):
                    particles.append(Particle(blk.rect.centerx, blk.rect.centery, blk.color))

            if not self.fireball:
                break

        return results

    def draw(self, surf):
        for i, (tx, ty) in enumerate(self.trail):
            progress = (i + 1) / len(self.trail) if self.trail else 0
            alpha = int(120 * progress)
            r_trail = max(4, int(self.r * progress * 0.8))
            if r_trail > 0:
                trail_surf = pygame.Surface((r_trail * 2, r_trail * 2), pygame.SRCALPHA)
                col = (*self.color, alpha)
                pygame.draw.circle(trail_surf, col, (r_trail, r_trail), r_trail)
                surf.blit(trail_surf, (tx - r_trail, ty - r_trail))

        if self.fireball:
            for r_glow, a in [(self.r * 5, 30), (self.r * 3, 60), (self.r * 2, 90)]:
                glow = pygame.Surface((r_glow * 2, r_glow * 2), pygame.SRCALPHA)
                pygame.draw.circle(glow, (255, 100, 0, a), (r_glow, r_glow), r_glow)
                surf.blit(glow, (int(self.x) - r_glow, int(self.y) - r_glow))
            pygame.draw.circle(surf, (255, 180, 80), (int(self.x), int(self.y)), self.r + 4)
            pygame.draw.circle(surf, (255, 220, 150), (int(self.x), int(self.y)), self.r + 2)
        else:
            glow = pygame.Surface((self.r * 4, self.r * 4), pygame.SRCALPHA)
            glow_col = (*self.color, 40)
            pygame.draw.circle(glow, glow_col, (self.r * 2, self.r * 2), self.r * 2)
            surf.blit(glow, (int(self.x) - self.r * 2, int(self.y) - self.r * 2))

            pygame.draw.circle(surf, self.color, (int(self.x), int(self.y)), self.r)

            highlight_r = max(4, self.r // 2)
            pygame.draw.circle(surf, (255, 255, 255),
                               (int(self.x) - self.r // 3, int(self.y) - self.r // 3), highlight_r)


class Particle:
    def __init__(self, x, y, color, size_range=(2, 5), speed_range=(1.5, 4.5)):
        self.x = float(x)
        self.y = float(y)
        angle = random.uniform(0, math.pi * 2)
        speed = random.uniform(*speed_range)
        self.vx = speed * math.cos(angle)
        self.vy = speed * math.sin(angle)
        self.life = random.randint(15, 35)
        self.max_life = self.life
        self.r = random.randint(*size_range)
        self.color = color

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.12
        self.life -= 1

    def draw(self, surf):
        alpha = int(255 * (self.life / self.max_life) ** 0.7)
        ps = pygame.Surface((self.r * 2, self.r * 2), pygame.SRCALPHA)
        pygame.draw.circle(ps, (*self.color, alpha), (self.r, self.r), self.r)
        surf.blit(ps, (int(self.x) - self.r, int(self.y) - self.r))

        if self.r > 4:
            glow_r = self.r + 4
            glow_surf = pygame.Surface((glow_r * 2, glow_r * 2), pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (*self.color, alpha // 3), (glow_r, glow_r), glow_r)
            surf.blit(glow_surf, (int(self.x) - glow_r, int(self.y) - glow_r))


def parse_level(level_data, level_num):
    blocks = []
    color_map = {
        'B': G_BLUE, 'R': G_RED, 'Y': G_YELLOW, 'G': G_GREEN,
        'P': G_PURPLE, 'O': G_ORANGE, 'T': G_TEAL, 'K': G_PINK,
    }
    for row, row_str in enumerate(level_data):
        for col, ch in enumerate(row_str):
            if ch == '.':
                continue
            elif ch == 'D':
                c = color_map.get(ch, ROW_COLORS[row % len(ROW_COLORS)])
                blocks.append(Block(col, row, BT_DOUBLE, c))
            elif ch == '*':
                c = ROW_COLORS[row % len(ROW_COLORS)]
                blocks.append(Block(col, row, BT_POWERUP, c))
            else:
                c = color_map.get(ch, ROW_COLORS[row % len(ROW_COLORS)])
                if random.random() < 0.12:
                    blocks.append(Block(col, row, BT_POWERUP, c))
                elif random.random() < 0.20 + level_num * 0.03:
                    blocks.append(Block(col, row, BT_DOUBLE, c))
                else:
                    blocks.append(Block(col, row, BT_NORMAL, c))
    return blocks


def draw_heart(surf, cx, cy, r, filled):
    if filled:
        col = G_RED
    else:
        col = GRAY_DARK
    
    size = r * 2
    heart_points = []
    
    for angle in range(0, 360, 5):
        rad = math.radians(angle)
        x = size * 16 * math.pow(math.sin(rad), 3) / 16
        y = -size * (13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)) / 16
        heart_points.append((cx + x, cy + y - size//2))
    
    if filled:
        pygame.draw.polygon(surf, col, heart_points)
        highlight_points = []
        for angle in range(200, 340, 5):
            rad = math.radians(angle)
            x = size * 14 * math.pow(math.sin(rad), 3) / 16
            y = -size * (13 * math.cos(rad) - 5 * math.cos(2*rad) - 2 * math.cos(3*rad) - math.cos(4*rad)) / 16
            highlight_points.append((cx + x, cy + y - size//2))
        if len(highlight_points) > 2:
            pygame.draw.polygon(surf, (255, 150, 150), highlight_points)
    else:
        pygame.draw.polygon(surf, col, heart_points)
        pygame.draw.polygon(surf, GRAY_MED, heart_points, 2)


def draw_hud(surf, score, lives, level, combo):
    hud_rect = pygame.Rect(0, 0, WIN_W, HUD_H)
    pygame.draw.rect(surf, BG_HUD, hud_rect)

    grad = pygame.Surface((WIN_W, HUD_H), pygame.SRCALPHA)
    for y in range(HUD_H):
        alpha = int(30 * (1 - y / HUD_H))
        pygame.draw.line(grad, (255, 255, 255, alpha), (0, y), (WIN_W, y))
    surf.blit(grad, (0, 0))

    pygame.draw.line(surf, GRAY_DARK, (0, HUD_H - 2), (WIN_W, HUD_H - 2))
    pygame.draw.line(surf, (50, 50, 50), (0, HUD_H - 4), (WIN_W, HUD_H - 4))

    cy = HUD_H // 2
    for i in range(max(MAX_LIVES, lives)):
        cx = 32 + i * (LIFE_R * 2 + 16)
        draw_heart(surf, cx, cy, LIFE_R - 2, i < lives)

    score_str = f"{score:06d}"
    s_surf = SCORE_FONT.render(score_str, True, WHITE)
    surf.blit(s_surf, s_surf.get_rect(center=(WIN_W // 2, cy + 2)))

    if combo > 1:
        combo_txt = f"x{combo}"
        c_surf = SMALL_FONT.render(combo_txt, True, G_YELLOW)
        surf.blit(c_surf, c_surf.get_rect(midleft=(WIN_W // 2 + 100, cy + 2)))

    lvl_txt = f"LVL {level}"
    l_surf = SMALL_FONT.render(lvl_txt, True, GRAY_MED)
    surf.blit(l_surf, l_surf.get_rect(midright=(WIN_W - 24, cy + 2)))


def draw_overlay(surf, texts, bg_alpha=160):
    ov = pygame.Surface((GAME_W, GAME_H), pygame.SRCALPHA)
    ov.fill((0, 0, 0, bg_alpha))
    surf.blit(ov, (0, 0))
    cy = GAME_H // 2
    for i, (text, font, color, y_offset) in enumerate(texts):
        t = font.render(text, True, color)
        surf.blit(t, t.get_rect(center=(GAME_W // 2, cy + y_offset)))


def draw_start_overlay(surf):
    msg = UI_FONT.render("Cierra el puno para empezar", True, (200, 200, 200))
    surf.blit(msg, msg.get_rect(center=(GAME_W // 2, GAME_H // 2 + 50)))


def compute_scale(screen_w, screen_h):
    scale = min(screen_w / BASE_W, screen_h / BASE_H)
    scaled_w = int(BASE_W * scale)
    scaled_h = int(BASE_H * scale)
    offset_x = (screen_w - scaled_w) // 2
    offset_y = (screen_h - scaled_h) // 2
    return scale, offset_x, offset_y, scaled_w, scaled_h


def screen_to_virtual(sx, sy, scale, ox, oy):
    return int((sx - ox) / scale), int((sy - oy) / scale)


STATE_START = "start"
STATE_PLAYING = "playing"
STATE_PAUSED = "paused"
STATE_LEVEL_CLEAR = "level_clear"
STATE_GAMEOVER = "gameover"
STATE_WIN = "win"


def main():
    screen_w = TOTAL_W * DEFAULT_SCALE
    screen_h = TOTAL_H * DEFAULT_SCALE
    screen = pygame.display.set_mode((screen_w, screen_h), pygame.RESIZABLE)
    pygame.display.set_caption("Block Breaker - Hand Control")
    clock = pygame.time.Clock()
    pygame.mouse.set_visible(False)

    scale, ox, oy, scaled_w, scaled_h = compute_scale(screen_w, screen_h)
    virtual_screen = pygame.Surface((TOTAL_W, TOTAL_H))

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: No se pudo abrir la camara.")
        pygame.quit()
        sys.exit()

    hand_detector = None
    try:
        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path="hand_landmarker.task"),
            running_mode=VisionTaskRunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        hand_detector = HandLandmarker.create_from_options(options)
        print("Hand detector initialized successfully")
    except Exception as e:
        print(f"Hand detector init failed: {e}")
        print("Make sure hand_landmarker.task is in the same folder")

    hand_x = BASE_W // 2
    hand_y = BASE_H - 50
    smooth_x = hand_x
    smooth_y = hand_y
    cam_frame = None
    cam_display = None
    hand_sensitivity = 1.5

    def reset_level(lvl_num):
        nonlocal blocks, balls, paddle, particles, powerups, state, combo, combo_timer
        idx = (lvl_num - 1) % len(LEVELS)
        blocks = parse_level(LEVELS[idx], lvl_num)
        paddle = Paddle()
        ball = Ball(GAME_W // 2, PAD_Y - BALL_R - 1)
        ball.speed = BALL_BASE_SPD + (lvl_num - 1) * 0.6
        ball.base_speed = ball.speed
        ball.bounce_count = 0
        balls = [ball]
        particles = []
        powerups = []
        combo = 0
        combo_timer = 0
        state = STATE_START

    def reset_game():
        nonlocal lives, score, level
        lives = MAX_LIVES
        score = 0
        level = 1
        reset_level(level)

    blocks = []
    balls = []
    paddle = None
    particles = []
    powerups = []
    lives = MAX_LIVES
    score = 0
    level = 1
    combo = 0
    combo_timer = 0
    state = STATE_START
    level_clear_timer = 0

    reset_game()

    game_surf = pygame.Surface((GAME_W, GAME_H))

    while True:
        ret, frame = cap.read()
        if ret:
            frame = cv2.flip(frame, 1)
            cam_frame = frame
            if hand_detector:
                try:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mp_image = mp_Image(image_format=ImageFormat.SRGB, data=rgb_frame)
                    result = hand_detector.detect(mp_image)
                    if result.hand_landmarks and len(result.hand_landmarks) > 0:
                        landmarks = result.hand_landmarks[0]
                        
                        draw_hand_landmarks(cam_frame, landmarks, HAND_CONNECTIONS)
                        
                        if state in (STATE_GAMEOVER, STATE_WIN, STATE_START, STATE_PLAYING):
                            fist = (
                                landmarks[8].y > landmarks[5].y and
                                landmarks[12].y > landmarks[9].y and
                                landmarks[16].y > landmarks[13].y and
                                landmarks[20].y > landmarks[17].y
                            )
                            if fist:
                                if state in (STATE_GAMEOVER, STATE_WIN):
                                    reset_game()
                                elif state == STATE_START:
                                    for b in balls:
                                        b.launch()
                                    state = STATE_PLAYING
                                elif state == STATE_PLAYING and paddle.sticky_ball:
                                    paddle.sticky_ball.active = True
                                    paddle.sticky_ball.stuck = False
                                    paddle.sticky_ball.launch()
                                    paddle.sticky_ball = None

                        index_tip = landmarks[8]
                        target_x = int(index_tip.x * BASE_W * 1.5)
                        target_y = int(index_tip.y * BASE_H * 1.5)
                        target_x = max(0, min(BASE_W, target_x))
                        target_y = max(0, min(BASE_H, target_y))
                        smooth_x += (target_x - smooth_x) * 0.7
                        smooth_y += (target_y - smooth_y) * 0.7
                        hand_x = int(smooth_x)
                        hand_y = int(smooth_y)
                except Exception as e:
                    pass

        mx, my = hand_x, hand_y
        keys = pygame.key.get_pressed()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.VIDEORESIZE:
                screen_w, screen_h = event.w, event.h
                screen = pygame.display.set_mode((screen_w, screen_h), pygame.RESIZABLE)
                scale, ox, oy, scaled_w, scaled_h = compute_scale(screen_w, screen_h)

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    if state == STATE_PLAYING:
                        state = STATE_PAUSED
                    elif state == STATE_PAUSED:
                        state = STATE_PLAYING

                if event.key == pygame.K_SPACE:
                    if state == STATE_START:
                        for b in balls:
                            b.launch()
                        state = STATE_PLAYING
                    elif state in (STATE_GAMEOVER, STATE_WIN):
                        reset_game()
                    elif state == STATE_PAUSED:
                        state = STATE_PLAYING

        if state == STATE_PLAYING:
            paddle.update(mx=min(mx, GAME_W), keys=keys)

            if paddle.sticky_ball and paddle.sticky_ball.stuck:
                paddle.sticky_ball.x = paddle.x + paddle.w // 2
                paddle.sticky_ball.y = paddle.y - paddle.sticky_ball.r - 1

            if paddle.laser and paddle.laser_ready:
                paddle.shoot()
                paddle.laser_ready = False

            if keys[pygame.K_SPACE] and paddle.sticky_ball:
                paddle.sticky_ball.active = True
                paddle.sticky_ball.stuck = False
                paddle.sticky_ball.launch()
                paddle.sticky_ball = None

            for laser in paddle.lasers:
                laser_rect = pygame.Rect(laser["x"] - 1, laser["y"], 2, 12)
                for blk in blocks:
                    if blk.alive and laser_rect.colliderect(blk.rect):
                        destroyed = blk.hit()
                        if destroyed:
                            if blk.btype == BT_DOUBLE:
                                score += 20
                            else:
                                score += 10
                            cx, cy = blk.rect.center
                            for _ in range(6):
                                particles.append(Particle(cx, cy, blk.color))
                            if blk.btype == BT_POWERUP and blk.powerup_type:
                                powerups.append(PowerUp(cx, cy, blk.powerup_type))
                        laser["y"] = -100
                        break

            combo_timer -= 1
            if combo_timer <= 0:
                combo = 0

            for ball in balls[:]:
                res = ball.update(blocks, paddle, particles)

                for r in res:
                    if r == "lose_life":
                        pass
                    elif isinstance(r, tuple):
                        if r[0] == "score":
                            combo += 1
                            combo_timer = 180
                            multiplier = min(combo, 5)
                            score += r[1] * multiplier
                        elif r[0] == "powerup":
                            pu_type, px, py = r[1], r[2], r[3]
                            powerups.append(PowerUp(px, py, pu_type))

                if ball.y - ball.r > GAME_H:
                    balls.remove(ball)

            if len(balls) == 0:
                lives -= 1
                for _ in range(15):
                    particles.append(Particle(paddle.x + paddle.w // 2, PAD_Y, WHITE))
                if lives <= 0:
                    state = STATE_GAMEOVER
                else:
                    new_ball = Ball(paddle.x + paddle.w // 2, PAD_Y - BALL_R - 1)
                    new_ball.speed = BALL_BASE_SPD + (level - 1) * 0.6
                    new_ball.base_speed = new_ball.speed
                    new_ball.bounce_count = 0
                    balls = [new_ball]
                    combo = 0
                    state = STATE_START

            for pu in powerups[:]:
                pu.update()
                if not pu.active:
                    powerups.remove(pu)
                    continue
                if pu.rect.colliderect(paddle.rect):
                    new_lives = apply_powerup(pu.pu_type, paddle, balls, level, lives)
                    if new_lives is not None:
                        lives = new_lives
                    for _ in range(10):
                        particles.append(Particle(pu.x, pu.y, pu.color, (1, 3), (1, 3)))
                    powerups.remove(pu)

            if all(not b.alive for b in blocks):
                state = STATE_LEVEL_CLEAR
                level_clear_timer = 240

            for p in particles:
                p.update()
            particles = [p for p in particles if p.life > 0]

        elif state == STATE_START:
            paddle.update(mx=min(mx, GAME_W), keys=keys)
            for b in balls:
                b.attach_to(paddle)

        elif state == STATE_LEVEL_CLEAR:
            level_clear_timer -= 1
            for p in particles:
                p.update()
            particles = [p for p in particles if p.life > 0]
            if level_clear_timer <= 0:
                level += 1
                if level > len(LEVELS):
                    state = STATE_WIN
                else:
                    reset_level(level)

        elif state == STATE_PAUSED:
            pass

        game_surf.fill(BG_GAME)

        grad = pygame.Surface((GAME_W, GAME_H), pygame.SRCALPHA)
        for y in range(0, GAME_H, 4):
            alpha = int(15 * (1 - y / GAME_H))
            pygame.draw.line(grad, (255, 255, 255, alpha), (0, y), (GAME_W, y))
        game_surf.blit(grad, (0, 0))

        for blk in blocks:
            blk.draw(game_surf, 0)

        for p in particles:
            p.draw(game_surf)

        for pu in powerups:
            pu.draw(game_surf)

        for ball in balls:
            ball.draw(game_surf)

        paddle.draw(game_surf)

        if state == STATE_START:
            draw_start_overlay(game_surf)

        if state == STATE_LEVEL_CLEAR:
            draw_overlay(game_surf, [
                ("LEVEL CLEAR!", BIG_FONT, G_GREEN, -20),
                (f"Score: {score:06d}", UI_FONT, WHITE, 25),
            ], 120)

        if state == STATE_PAUSED:
            draw_overlay(game_surf, [
                ("PAUSED", BIG_FONT, WHITE, -20),
                ("Press ESC or click to resume", SMALL_FONT, GRAY_MED, 25),
            ])

        if state == STATE_GAMEOVER:
            draw_overlay(game_surf, [
                ("GAME OVER", BIG_FONT, G_RED, -30),
                (f"Score: {score:06d}", UI_FONT, WHITE, 20),
                ("Click o cierra el puno para reiniciar", SMALL_FONT, GRAY_MED, 50),
            ])

        if state == STATE_WIN:
            draw_overlay(game_surf, [
                ("YOU WIN!", BIG_FONT, G_GREEN, -30),
                (f"Final Score: {score:06d}", UI_FONT, WHITE, 20),
                ("Click o cierra el puno para jugar de nuevo", SMALL_FONT, GRAY_MED, 50),
            ])

        virtual_screen.fill(BG_HUD)
        draw_hud(virtual_screen, score, lives, level, combo)
        virtual_screen.blit(game_surf, (0, HUD_H))

        if cam_frame is not None:
            cam_rgb = cv2.cvtColor(cam_frame, cv2.COLOR_BGR2RGB)
            cam_rgb = cv2.resize(cam_rgb, (CAM_W, CAM_H))
            cam_surface = pygame.surfarray.make_surface(np.transpose(cam_rgb, (1, 0, 2)))
            virtual_screen.blit(cam_surface, (BASE_W, 0))

        scaled_surf = pygame.transform.smoothscale(virtual_screen, (scaled_w, scaled_h))
        screen.fill(BLACK)
        screen.blit(scaled_surf, (ox, oy))

        pygame.display.flip()
        clock.tick(FPS)

    cap.release()
    if hand_detector:
        hand_detector.close()

def apply_powerup(pu_type, paddle, balls, level, lives):
    if pu_type == PU_MULTI:
        new_balls = []
        for ball in balls[:]:
            for i in range(2):
                nb = Ball(ball.x, ball.y)
                nb.active = ball.active
                nb.speed = ball.speed
                angle_offset = (i * 2 - 1) * math.pi / 4
                base_angle = math.atan2(ball.vy, ball.vx)
                new_angle = base_angle + angle_offset
                nb.vx = nb.speed * math.cos(new_angle)
                nb.vy = nb.speed * math.sin(new_angle)
                nb.color = ball.color
                new_balls.append(nb)
        balls.extend(new_balls)

    elif pu_type == PU_FIRE:
        for ball in balls:
            ball.activate_fire(240)

    elif pu_type == PU_LASER:
        paddle.activate_laser(360)

    elif pu_type == PU_LONG:
        paddle.expand(600)

    elif pu_type == PU_SLOW:
        for ball in balls:
            cur = math.hypot(ball.vx, ball.vy)
            ball.set_speed(max(BALL_BASE_SPD, cur * 0.75))

    elif pu_type == PU_LIFE:
        return lives + 1

    elif pu_type == PU_STICKY:
        paddle.sticky = True
        paddle.sticky_timer = 600

    return None


if __name__ == "__main__":
    main()

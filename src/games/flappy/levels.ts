// ============================================================
//  FLAPPY — constantes y paleta de colores
// ============================================================
//  Portadas 1:1 de flappy_hand.py (versión escritorio en Pygame):
//  mismas dimensiones, física, dificultad y colores para que el
//  juego web se vea y se sienta igual.
// ============================================================

// Resolución interna del juego (igual que SCREEN_W/H del .py).
export const GAME_W = 600;
export const GAME_H = 700;
export const WIN_W = GAME_W;
export const WIN_H = GAME_H;
export const TOTAL_W = GAME_W;
export const TOTAL_H = GAME_H;

export const GROUND_H = 60;

// Física del pájaro (suavizada: más lenta y manejable que el .py).
export const GRAVITY = 0.28;
export const FLAP_STRENGTH = -6.6;
export const MAX_FALL_SPEED = 7.5;
export const BIRD_SIZE = 28;
export const BIRD_X = 100;
export const FLAP_COOLDOWN = 9; // frames entre aleteos con mano abierta

// Vidas: como en Block Breaker. Al perder una, el marcador vuelve a 0.
export const MAX_LIVES = 3;

// Tuberías (más espacio y más lentas que el .py).
export const PIPE_W = 65;
export const PIPE_GAP_BASE = 210;
export const PIPE_GAP_MIN = 160;
export const PIPE_SPEED_BASE = 3;
export const PIPE_SPEED_MAX = 6;
export const PIPE_SPAWN_BASE = 110; // frames entre tuberías (más separadas)
export const PIPE_SPAWN_MIN = 75;

// Dificultad progresiva: sube de nivel cada N puntos (más lento que el .py).
export const DIFFICULTY_STEP = 8;
export const GRAVITY_MAX = 0.55;

// Colores (paleta moderna del .py), en hex.
export const COL_BG_TOP = "#19193c"; // (25,25,60)
export const COL_BG_BOT = "#2d1450"; // (45,20,80)
export const COL_BIRD = "#ffd232"; // (255,210,50)
export const COL_BIRD_OUTLINE = "#f0be28"; // (240,190,40)
export const COL_BIRD_EYE = "#282828"; // (40,40,40)
export const COL_BIRD_BEAK = "#ff781e"; // (255,120,30)
export const COL_BIRD_WING = "#e6b41e"; // (230,180,30)
export const COL_PIPE = "#32c878"; // (50,200,120)
export const COL_PIPE_DARK = "#23a05f"; // (35,160,95)
export const COL_PIPE_CAP = "#3cdc8c"; // (60,220,140)
export const COL_GROUND = "#503c28"; // (80,60,40)
export const COL_GROUND_LINE = "#645037"; // (100,80,55)
export const COL_TEXT = "#ffffff";
export const COL_SCORE = "#ffff64"; // (255,255,100)

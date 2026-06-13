// ============================================================
//  BLOCK BREAKER — constantes, paleta de colores y niveles
// ============================================================
//  Datos puros (sin lógica). La resolución lógica del juego es
//  TOTAL_W x TOTAL_H; el motor se encarga de escalar a la pantalla.
// ============================================================

// Dimensiones del área de juego + HUD.
export const GAME_W = 640;
export const GAME_H = 720;
export const HUD_H = 64;
export const WIN_W = GAME_W;
export const WIN_H = GAME_H + HUD_H;
export const TOTAL_W = WIN_W;
export const TOTAL_H = WIN_H;

export const BG = "#202124";
export const HUD_BG = "#202124";

// Colores de Google.
export const G_BLUE = "#4285f4";
export const G_RED = "#ea4335";
export const G_YELLOW = "#fbbc04";
export const G_GREEN = "#34a853";
export const G_PURPLE = "#a142f4";
export const G_ORANGE = "#fa903e";
export const G_TEAL = "#24c1e0";
export const G_PINK = "#f538a0";
export const ROW_COLORS = [
  G_RED, G_YELLOW, G_GREEN, G_BLUE, G_PURPLE, G_ORANGE, G_TEAL, G_PINK,
];

// Grilla de bloques.
export const COLS = 8;
export const ROWS = 4;
export const BLK_GAP = 2;
export const BLK_MARGIN = 40;
export const BLK_H = 28;
export const BLK_W = Math.floor(
  (GAME_W - 2 * BLK_MARGIN - BLK_GAP * (COLS - 1)) / COLS
);
export const GRID_TOP = HUD_H + 40;

// Paleta y bola.
export const PAD_W = 120;
export const PAD_H = 12;
export const PAD_Y = GAME_H - 44;
export const PAD_RADIUS = 6;
export const PAD_SPEED = 12;
export const BALL_R = 7;
export const BALL_BASE_SPD = 8;
export const BALL_SPD_INC = 0.15;
export const BALL_MAX_SPD = 16;
export const MAX_LIVES = 3;

// Tipos de bloque.
export const BT_NORMAL = 0;
export const BT_DOUBLE = 1;
export const BT_POWERUP = 2;
export const BT_TNT = 3;

// Power-ups (7, como en Google Block Breaker).
export const PU_MULTI = "multi";
export const PU_LONG = "expand";
export const PU_FIRE = "fire";
export const PU_LASER = "laser";
export const PU_SLOW = "slow";
export const PU_STICKY = "sticky";
export const PU_LIFE = "life";

export const PU_COLORS: Record<string, string> = {
  [PU_MULTI]: "#24c1e0",
  [PU_LONG]: "#34a853",
  [PU_FIRE]: "#fa903e",
  [PU_LASER]: "#ea4335",
  [PU_SLOW]: "#4285f4",
  [PU_STICKY]: "#a142f4",
  [PU_LIFE]: "#f538a0",
};

export const PU_LABELS: Record<string, string> = {
  [PU_MULTI]: "⭐",
  [PU_LONG]: "↔️",
  [PU_FIRE]: "🔥",
  [PU_LASER]: "⚡",
  [PU_SLOW]: "🐌",
  [PU_STICKY]: "🧲",
  [PU_LIFE]: "❤️",
};

// Tabla de probabilidad ponderada: heart es raro, multi/expand comunes.
export const PU_WEIGHTS: ReadonlyArray<[string, number]> = [
  [PU_MULTI, 26],
  [PU_LONG, 22],
  [PU_FIRE, 14],
  [PU_LASER, 14],
  [PU_SLOW, 12],
  [PU_STICKY, 8],
  [PU_LIFE, 4],
];

export const POWERUP_SIZE = 24;
export const POWERUP_FALL_SPD = 3;

// Mapa carácter -> color para los mapas ASCII.
export const COLOR_MAP: Record<string, string> = {
  B: G_BLUE,
  R: G_RED,
  Y: G_YELLOW,
  G: G_GREEN,
  P: G_PURPLE,
  O: G_ORANGE,
  T: G_TEAL,
  K: G_PINK,
};

// 10 niveles (mapas ASCII). '.'=vacío, 'D'=doble/plateado, 'T'=TNT, '*'=power-up.
export const LEVELS: string[][] = [
  // Nivel 1: Muro Clásico (Breakout) - calentamiento rápido
  ["RRRRRRRR", "OOOOOOOO", "YYYYYYYY", "GGGGGGGG"],
  // Nivel 2: Damero (Arkanoid) - ángulos difíciles, pocas piezas
  ["R.R.R.R.", ".Y.Y.Y.Y", "G.G.G.G.", ".B.B.B.B", "P.P.P.P."],
  // Nivel 3: Pirámide con núcleo TNT - colapso rápido
  ["...TT...", "..O**O..", ".YYYYYY.", "GGGGGGGG"],
  // Nivel 4: Fortaleza - borde plateado, hay que entrar al núcleo
  ["DRRRRRRD", "R.T**T.R", "R......R", "DRRRRRRD"],
  // Nivel 5: Space Invader (homenaje) - pictórico
  ["..G..G..", ".GGGGGG.", "G.GGGG.G", "GGG**GGG", "G.G..G.G", "..G..G.."],
  // Nivel 6: Embudos - carriles verticales que canalizan la bola
  ["B.B.T.B.", "B.B.B.B.", "B.B*B.B.", "B.B.B.B.", "B.B.T.B."],
  // Nivel 7: Doble Muralla - filas plateadas que bloquean el avance
  ["DDDDDDDD", "P......P", "T..**..T", "P......P", "DDDDDDDD"],
  // Nivel 8: Cruz Diagonal - bolsillos cerrados con TNT
  ["D......D", ".O....O.", "..R**R..", "...TT...", "..R**R..", ".O....O.", "D......D"],
  // Nivel 9: Diamante - plateado en el borde, TNT y mejoras dentro
  ["...DD...", "..R**R..", ".Y.TT.Y.", "G..GG..G", ".Y.TT.Y.", "..R**R..", "...DD..."],
  // Nivel 10: Jefe Final - denso, TNT encadenado y plateado mixto
  ["DTDTDTDT", "TDTDTDTD", "D.P**P.D", "TDTDTDTD", "DTDTDTDT", "P......P"],
];

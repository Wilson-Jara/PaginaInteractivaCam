// ============================================================
//  BLOCK BREAKER — constantes, paleta de colores y niveles
// ============================================================
//  Datos puros (sin lógica). La resolución lógica del juego es
//  TOTAL_W x TOTAL_H; el motor se encarga de escalar a la pantalla.
// ============================================================

// Dimensiones del área de juego + HUD.
export const GAME_W = 950;
export const GAME_H = 930;
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

// Grilla de bloques. COLS impar -> hay columna central, así los diseños
// pueden ser simétricos (espejo izquierda/derecha). Los niveles se diseñan
// con un número IMPAR de filas para mantener la simetría vertical también.
export const COLS = 13;
export const ROWS = 7;
export const BLK_GAP = 2;
export const BLK_MARGIN = 44;
export const BLK_H = 28;
export const BLK_W = Math.floor(
  (GAME_W - 2 * BLK_MARGIN - BLK_GAP * (COLS - 1)) / COLS
);
export const GRID_TOP = HUD_H + 40;

// Paleta y bola.
// Paleta más corta (100) = más difícil de atajar.
export const PAD_W = 100;
export const PAD_H = 12;
export const PAD_Y = GAME_H - 44;
export const PAD_RADIUS = 6;
export const PAD_SPEED = 16;
export const BALL_R = 7;
// Velocidades subidas: arranque más rápido, acelera más y techo más alto.
export const BALL_BASE_SPD = 12;
export const BALL_SPD_INC = 0.28;
export const BALL_MAX_SPD = 24;
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

// Power-ups activos: multi-bola, paleta larga, fireball y slow.
// (Se quitaron imán/sticky, vida extra y láser.)
export const PU_WEIGHTS: ReadonlyArray<[string, number]> = [
  [PU_MULTI, 30],
  [PU_LONG, 28],
  [PU_FIRE, 22],
  [PU_SLOW, 20],
];

export const POWERUP_SIZE = 24;
export const POWERUP_FALL_SPD = 4;

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

// Niveles (mapas ASCII). Cada fila mide COLS (13) caracteres y todos los
// diseños son SIMÉTRICOS en espejo (col c == col 12-c) con un número impar
// de filas. '.'=vacío, letras=color, 'D'=plateado(3 golpes), 'T'=TNT,
// '*'=power-up. Diseños inspirados en clásicos de Arkanoid/Breakout.
export const LEVELS: string[][] = [
  // 1) Pirámide arcoíris — escalera de colores, calentamiento vistoso.
  [
    "......R......",
    ".....OOO.....",
    "....YYYYY....",
    "...GGG*GGG...",
    "..BBBBBBBBB..",
    ".PPPPPPPPPPP.",
    "KKKKKKKKKKKKK",
  ],
  // 2) Diamante — anidado de colores, puntas de TNT.
  [
    "......T......",
    ".....OYO.....",
    "....OYGYO....",
    "...OYG*GYO...",
    "....OYGYO....",
    ".....OYO.....",
    "......T......",
  ],
  // 3) Corazón — relleno, power-ups en el núcleo.
  [
    "..KKK...KKK..",
    ".KKKKKKKKKKK.",
    "KKKKKKKKKKKKK",
    "KKKKKK*KKKKKK",
    ".KKKKKKKKKKK.",
    "...KKK*KKK...",
    ".....KKK.....",
  ],
  // 4) Estrella — destello de rayos amarillos.
  [
    "......Y......",
    "...Y..Y..Y...",
    "....YYYYY....",
    "YYYYYY*YYYYYY",
    "....YYYYY....",
    "...Y..Y..Y...",
    "......Y......",
  ],
  // 5) Space Invader — homenaje pictórico.
  [
    "..G.......G..",
    "...G.....G...",
    "..GGGGGGGGG..",
    ".GG.GG*GG.GG.",
    "GGGGGGGGGGGGG",
    "G.G.......G.G",
    "..G.......G..",
  ],
  // 6) Mariposa — alas naranjas, cuerpo amarillo.
  [
    "PP.........PP",
    "PPP.......PPP",
    "OOOO..Y..OOOO",
    "OOOOO.*.OOOOO",
    "OOOO..Y..OOOO",
    "PPP...Y...PPP",
    "PP....Y....PP",
  ],
  // 7) Flor — pétalos rojos y corazón amarillo.
  [
    "...RR...RR...",
    "..RRR.R.RRR..",
    ".RRR.RYR.RRR.",
    "RR.RYY*YYR.RR",
    ".RRR.RYR.RRR.",
    "..RRR.R.RRR..",
    "...RR...RR...",
  ],
  // 8) Fantasma — cuerpo morado con ojos huecos.
  [
    "....PPPPP....",
    "..PPPPPPPPP..",
    ".PPPPPPPPPPP.",
    ".PPP.PPP.PPP.",
    ".PPPPP*PPPPP.",
    ".PPPPPPPPPPP.",
    ".P.P.P.P.P.P.",
  ],
  // 9) Calavera — toda plateada (3 golpes): muy resistente.
  [
    "..DDDDDDDDD..",
    ".DDDDDDDDDDD.",
    "DDD..DDD..DDD",
    ".DDDDD*DDDDD.",
    "..DDDDDDDDD..",
    "..D.D.D.D.D..",
    "...D.D.D.D...",
  ],
  // 10) Equis — diagonales con TNT en las puntas y el cruce.
  [
    "T...........T",
    "..B.......B..",
    "....B.*.B....",
    "......T......",
    "....G...G....",
    "..G.......G..",
    "G...........G",
  ],
  // 11) Jefe final — fortaleza concéntrica plateada con núcleo de TNT.
  [
    "DDDDDDDDDDDDD",
    "D...........D",
    "D.DDDDDDDDD.D",
    "D.D..T*T..D.D",
    "D.DDDDDDDDD.D",
    "D...........D",
    "DDDDDDDDDDDDD",
  ],
];

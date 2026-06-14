export interface Game {
  id: string;
  title: string;
  cover: string;
  tags: string[];
  size?: string;
  category?: string;
  description?: string;
  pythonBackend?: boolean;
  mediapipe?: boolean;
  /** true si el juego tiene versión web jugable (registrada en gameRegistry). */
  playable?: boolean;
}

export const games: Game[] = [
  {
    id: "block-breaker",
    title: "Block Breaker",
    cover: "/covers/block-breaker.webp",
    tags: ["MediaPipe", "Pygame", "OpenCV"],
    size: "",
    category: "MediaPipe",
    description: "Rompe bloques controlando la paleta con tu mano mediante MediaPipe. Incluye power-ups, múltiples niveles y cámara en tiempo real.",
    pythonBackend: true,
    mediapipe: true,
    playable: true,
  },
  {
    id: "flappy",
    title: "Flappy Bird",
    cover: "/covers/flappy.webp",
    tags: ["MediaPipe"],
    size: "",
    category: "MediaPipe",
    description: "Flappy Bird controlado con tu mano mediante MediaPipe. Sube y baja la mano para volar entre las tuberías sin chocar. ¡Cuanto más lejos llegues, más rápido va!",
    pythonBackend: false,
    mediapipe: true,
    playable: true,
  },
];

export const categories = [
  "Todos",
  "MediaPipe",
  "OpenCV",
  "Pygame",
];

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
    cover: "",
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
    cover: "",
    tags: ["MediaPipe"],
    size: "",
    category: "MediaPipe",
    description: "Flappy Bird controlado con tu mano mediante MediaPipe. Sube y baja la mano para volar entre las tuberías sin chocar. ¡Cuanto más lejos llegues, más rápido va!",
    pythonBackend: false,
    mediapipe: true,
    playable: true,
  },
  ...Array.from({ length: 28 }, (_, i) => ({
    id: `juego-${i + 3}`,
    title: `Juego ${i + 3}`,
    cover: "",
    tags: ["Proximamente"],
    size: "",
    category: ["MediaPipe", "OpenCV", "Pygame"][i % 3],
    description: "",
    pythonBackend: true,
    mediapipe: i % 3 === 0,
    playable: false,
  })),
];

export const categories = [
  "Todos",
  "MediaPipe",
  "OpenCV",
  "Pygame",
];

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
  ...Array.from({ length: 29 }, (_, i) => ({
    id: `juego-${i + 2}`,
    title: `Juego ${i + 2}`,
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

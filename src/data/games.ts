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
  })),
];

export const categories = [
  "Todos",
  "MediaPipe",
  "OpenCV",
  "Pygame",
];

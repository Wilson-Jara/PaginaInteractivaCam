// ============================================================
//  FLAPPY — punto de entrada del módulo (factory)
// ============================================================
//  Expone una factory para que el registry cree una instancia
//  sin acoplarse a la clase concreta.
// ============================================================
import type { CameraGame } from "../../engine/types";
import { FlappyGame } from "./FlappyGame";

export function createFlappy(): CameraGame {
  return new FlappyGame();
}

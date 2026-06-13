// ============================================================
//  BLOCK BREAKER — punto de entrada del módulo (factory)
// ============================================================
//  Expone una factory para que el registry cree una instancia
//  sin acoplarse a la clase concreta.
// ============================================================
import type { CameraGame } from "../../engine/types";
import { BlockBreakerGame } from "./BlockBreakerGame";

export function createBlockBreaker(): CameraGame {
  return new BlockBreakerGame();
}

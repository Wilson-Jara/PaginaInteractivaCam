// ============================================================
//  PLANTILLA — punto de entrada del módulo (factory)
// ============================================================
//  Expone una factory para que el registry cree una instancia
//  sin acoplarse a la clase concreta. Copia este patrón en tu juego.
// ============================================================
import type { CameraGame } from "../../engine/types";
import { ExampleGame } from "./ExampleGame";

export function createExample(): CameraGame {
  return new ExampleGame();
}

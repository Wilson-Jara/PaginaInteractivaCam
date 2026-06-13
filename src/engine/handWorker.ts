// ============================================================
//  WEB WORKER DE DETECCIÓN DE MANOS (MediaPipe fuera del hilo)
// ============================================================
//  Corre la inferencia de MediaPipe en un hilo aparte para que
//  NUNCA compita con el render del juego en el hilo principal.
//
//  Protocolo de mensajes:
//   main -> worker:  { type:'init', bundleUrl, wasmUrl, modelUrl }
//                    { type:'frame', bitmap, timestamp }   (bitmap transferido)
//   worker -> main:  { type:'ready', delegate:'GPU'|'CPU' }
//                    { type:'error', message }
//                    { type:'result', landmarks, timestamp }
// ============================================================
/// <reference lib="webworker" />
import type { Landmark } from "./types";

interface InitMsg {
  type: "init";
  bundleUrl: string;
  wasmUrl: string;
  modelUrl: string;
}
interface FrameMsg {
  type: "frame";
  bitmap: ImageBitmap;
  timestamp: number;
}
type InMsg = InitMsg | FrameMsg;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// `any`: MediaPipe se carga por CDN y no trae tipos en este contexto.
let landmarker: any = null;

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      const { HandLandmarker, FilesetResolver } = await import(
        /* @vite-ignore */ msg.bundleUrl
      );
      const vision = await FilesetResolver.forVisionTasks(msg.wasmUrl);
      const makeOptions = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: msg.modelUrl, delegate },
        runningMode: "VIDEO" as const,
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
      });
      let delegate: "GPU" | "CPU" = "GPU";
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, makeOptions("GPU"));
      } catch (gpuErr) {
        landmarker = await HandLandmarker.createFromOptions(vision, makeOptions("CPU"));
        delegate = "CPU";
      }
      ctx.postMessage({ type: "ready", delegate });
    } catch (err) {
      ctx.postMessage({ type: "error", message: String(err) });
    }
    return;
  }

  if (msg.type === "frame") {
    if (!landmarker) {
      msg.bitmap.close();
      return;
    }
    let landmarks: Landmark[] | null = null;
    try {
      const res = landmarker.detectForVideo(msg.bitmap, msg.timestamp);
      landmarks = res?.landmarks?.[0] ?? null;
    } catch {
      landmarks = null;
    } finally {
      msg.bitmap.close(); // liberar el frame siempre
    }
    ctx.postMessage({ type: "result", landmarks, timestamp: msg.timestamp });
  }
};

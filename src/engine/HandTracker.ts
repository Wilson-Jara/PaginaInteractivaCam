// ============================================================
//  HAND TRACKER — cámara + MediaPipe + gesto de puño + esqueleto
// ============================================================
//  Encapsula TODA la complejidad de visión por computadora para
//  que los juegos no la repitan: inicializa la webcam, carga
//  MediaPipe Tasks Vision (con fallback GPU -> CPU), corre el bucle
//  de detección y expone una `HandInput` normalizada y espejada.
//
//  - `latest` siempre tiene el último estado de la mano.
//  - Dibuja el esqueleto sobre un <canvas> opcional (panel de cámara).
// ============================================================
import type { HandInput, Landmark } from "./types";

const MP_VERSION = "0.10.35";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Conexiones del esqueleto de la mano (para dibujar líneas entre landmarks).
const HAND_CONNECTIONS: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Pulgar
  [0, 5], [5, 6], [6, 7], [7, 8], // Índice
  [5, 9], [9, 10], [10, 11], [11, 12], // Medio
  [9, 13], [13, 14], [14, 15], [15, 16], // Anular
  [13, 17], [17, 18], [18, 19], [19, 20], // Meñique
  [0, 17], // Base de la palma
];

export interface HandTrackerOptions {
  video: HTMLVideoElement;
  /** Lienzo donde dibujar el esqueleto (panel de cámara). Opcional. */
  overlay?: HTMLCanvasElement | null;
  /** Callback de estado para mostrar mensajes de carga al usuario. */
  onStatus?: (message: string, hideAfterMs?: number) => void;
}

export interface HandTrackerStartResult {
  camera: boolean;
  mediapipe: boolean;
}

const DEFAULT_HAND: HandInput = {
  present: false,
  x: 0.5,
  y: 0.5,
  fist: false,
  landmarks: null,
};

export class HandTracker {
  /** Último estado de la mano (lo lee el juego cada frame). */
  readonly latest: HandInput = { ...DEFAULT_HAND };

  private readonly video: HTMLVideoElement;
  private readonly overlay: HTMLCanvasElement | null;
  private readonly overlayCtx: CanvasRenderingContext2D | null;
  private readonly onStatus?: (message: string, hideAfterMs?: number) => void;

  // `any` a propósito: MediaPipe se carga por CDN y no trae tipos aquí.
  private detector: any = null;
  private running = false;

  constructor(opts: HandTrackerOptions) {
    this.video = opts.video;
    this.overlay = opts.overlay ?? null;
    this.overlayCtx = this.overlay ? this.overlay.getContext("2d") : null;
    this.onStatus = opts.onStatus;
  }

  /** Arranca cámara + MediaPipe + bucle de detección. */
  async start(): Promise<HandTrackerStartResult> {
    this.status("Solicitando camara...");
    const camera = await this.initCamera();
    let mediapipe = false;
    if (camera) {
      mediapipe = await this.initMediaPipe();
      if (mediapipe) this.runDetectionLoop();
    }
    return { camera, mediapipe };
  }

  /** Detiene el bucle y libera la cámara. */
  stop(): void {
    this.running = false;
    const stream = this.video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
  }

  private status(message: string, hideAfterMs?: number): void {
    this.onStatus?.(message, hideAfterMs);
  }

  private async initCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 60 },
        },
      });
      this.video.srcObject = stream;
      await new Promise<void>((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });
      await this.video.play();
      return true;
    } catch (e) {
      console.warn("HandTracker camera:", e);
      this.status("Sin camara. Usa mouse/teclado.", 2500);
      return false;
    }
  }

  private async initMediaPipe(): Promise<boolean> {
    try {
      this.status("Cargando deteccion de manos...");
      // URLs por CDN: dejamos que el navegador las cargue en runtime.
      const bundleUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
      const wasmUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
      const { HandLandmarker, FilesetResolver } = await import(
        /* @vite-ignore */ bundleUrl
      );
      const vision = await FilesetResolver.forVisionTasks(wasmUrl);
      const makeOptions = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO" as const,
        numHands: 1,
        minHandDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      try {
        this.detector = await HandLandmarker.createFromOptions(
          vision,
          makeOptions("GPU")
        );
      } catch (gpuErr) {
        console.warn("MediaPipe GPU no disponible, usando CPU:", gpuErr);
        this.detector = await HandLandmarker.createFromOptions(
          vision,
          makeOptions("CPU")
        );
      }
      this.status("Manos detectadas! Mueve tu mano.", 1500);
      return true;
    } catch (e) {
      console.error("HandTracker MediaPipe:", e);
      this.status("Sin deteccion de manos. Usa mouse/teclado.", 2500);
      return false;
    }
  }

  private runDetectionLoop(): void {
    this.running = true;
    const run = () => {
      if (!this.running) return;
      this.detect();
      const v = this.video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      if (typeof v.requestVideoFrameCallback === "function") {
        v.requestVideoFrameCallback(run);
      } else {
        requestAnimationFrame(run);
      }
    };
    run();
  }

  private detect(): void {
    if (!this.detector || this.video.readyState < 2) return;
    try {
      const result = this.detector.detectForVideo(this.video, performance.now());
      const hands: Landmark[][] = result?.landmarks ?? [];
      if (hands.length > 0) {
        this.applyHand(hands[0]);
        this.drawOverlay(hands[0]);
      } else {
        this.latest.present = false;
        this.latest.fist = false;
        this.latest.landmarks = null;
        this.drawOverlay(null);
      }
    } catch (e) {
      console.warn("HandTracker detect:", e);
    }
  }

  /** Convierte landmarks crudos en HandInput normalizado + espejado. */
  private applyHand(lm: Landmark[]): void {
    const knuckle = lm[9]; // nudillo central: más estable que la punta del dedo
    this.latest.present = true;
    // Espejo en X porque el panel de cámara está reflejado (scaleX(-1)).
    this.latest.x = 1 - knuckle.x;
    this.latest.y = knuckle.y;
    // Puño cerrado: las 4 puntas por debajo de sus nudillos.
    this.latest.fist =
      lm[8].y > lm[5].y &&
      lm[12].y > lm[9].y &&
      lm[16].y > lm[13].y &&
      lm[20].y > lm[17].y;
    this.latest.landmarks = lm;
  }

  /**
   * Dibuja el esqueleto sobre el panel de cámara.
   * El panel ya está reflejado por CSS, así que usamos p.x crudo.
   */
  private drawOverlay(lm: Landmark[] | null): void {
    if (!this.overlay || !this.overlayCtx) return;
    // Ajustar resolución del lienzo al tamaño visible de la cámara.
    if (this.overlay.width !== this.overlay.clientWidth) {
      this.overlay.width = this.overlay.clientWidth;
    }
    if (this.overlay.height !== this.overlay.clientHeight) {
      this.overlay.height = this.overlay.clientHeight;
    }
    const ow = this.overlay.width;
    const oh = this.overlay.height;
    const c = this.overlayCtx;
    c.clearRect(0, 0, ow, oh);
    if (!lm) return;

    c.strokeStyle = "#4285f4";
    c.lineWidth = 2;
    for (const [i, j] of HAND_CONNECTIONS) {
      const p1 = lm[i];
      const p2 = lm[j];
      c.beginPath();
      c.moveTo(p1.x * ow, p1.y * oh);
      c.lineTo(p2.x * ow, p2.y * oh);
      c.stroke();
    }
    c.fillStyle = "#0f0";
    for (const p of lm) {
      c.beginPath();
      c.arc(p.x * ow, p.y * oh, 3, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// ============================================================
//  HAND TRACKER — cámara + MediaPipe (en Web Worker) + esqueleto
// ============================================================
//  Orquesta la visión por computadora para que los juegos no la
//  repitan. La INFERENCIA corre en un Web Worker (handWorker.ts),
//  así nunca compite con el render del juego en el hilo principal:
//
//   1. Inicializa la webcam (hilo principal, para mostrarla).
//   2. Arranca el worker y le pasa frames con createImageBitmap
//      (transferencia zero-copy). Backpressure: 1 frame en vuelo.
//   3. Al recibir landmarks: aplica One Euro (anti-jitter), calcula
//      el puño y dibuja el esqueleto (operaciones baratas).
//
//  Si el worker no está disponible, cae a inferencia en el hilo
//  principal (compatibilidad).
// ============================================================
import type { HandInput, Landmark } from "./types";
import { OneEuroFilter, type OneEuroOptions } from "./OneEuroFilter";

const MP_VERSION = "0.10.35";
const BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Detección simple de móvil: ahí la inferencia es más lenta, así que
// reducimos resolución de cámara y procesamos frames más pequeños.
const IS_MOBILE =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);

// Ancho al que se reduce el frame antes de la inferencia (menos píxeles =
// detección más rápida). En móvil bajamos más para ganar FPS.
const INFER_WIDTH = IS_MOBILE ? 256 : 480;

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
  /** Parámetros del filtro One Euro (suavizado adaptativo de la mano). */
  filter?: OneEuroOptions;
  /**
   * Predicción de latencia (ms). Proyecta la posición hacia adelante usando
   * la velocidad de la mano para compensar el retraso del pipeline de cámara
   * (captura + inferencia). 0 = sin predicción. ~80-120ms suele ir bien.
   */
  predictMs?: number;
}

export interface HandTrackerStartResult {
  camera: boolean;
  mediapipe: boolean;
  /** true si la inferencia corre en un Web Worker (fuera del hilo principal). */
  worker: boolean;
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

  // Filtros One Euro: suavizado adaptativo por eje (mata el jitter en
  // reposo sin añadir lag al mover la mano rápido).
  private readonly filterX: OneEuroFilter;
  private readonly filterY: OneEuroFilter;

  // Predicción de latencia: proyecta la posición con la velocidad estimada
  // para compensar el retraso del pipeline (captura + inferencia).
  private readonly predictMs: number;
  private predPrevX: number | null = null;
  private predPrevY: number | null = null;
  private predPrevT: number | null = null;

  // Inferencia en worker (preferida).
  private worker: Worker | null = null;
  private workerBusy = false;
  // Inferencia en hilo principal (fallback). `any`: MediaPipe via CDN.
  private detector: any = null;

  private running = false;

  constructor(opts: HandTrackerOptions) {
    this.video = opts.video;
    this.overlay = opts.overlay ?? null;
    this.overlayCtx = this.overlay ? this.overlay.getContext("2d") : null;
    this.onStatus = opts.onStatus;
    this.filterX = new OneEuroFilter(opts.filter);
    this.filterY = new OneEuroFilter(opts.filter);
    this.predictMs = opts.predictMs ?? 0;
  }

  /** Arranca cámara + worker (o fallback) + bucle de detección. */
  async start(): Promise<HandTrackerStartResult> {
    this.status("Solicitando camara...");
    const camera = await this.initCamera();
    if (!camera) return { camera: false, mediapipe: false, worker: false };

    // 1) Intentar Web Worker (inferencia fuera del hilo principal).
    const workerOk = await this.initWorker();
    if (workerOk) {
      this.runWorkerLoop();
      return { camera: true, mediapipe: true, worker: true };
    }

    // 2) Fallback: inferencia en el hilo principal.
    const mp = await this.initMainThread();
    if (mp) this.runMainLoop();
    return { camera: true, mediapipe: mp, worker: false };
  }

  /** Detiene el bucle, termina el worker y libera la cámara. */
  stop(): void {
    this.running = false;
    this.worker?.terminate();
    this.worker = null;
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
          // En móvil pedimos menos resolución: la cámara captura más ligero
          // y la inferencia es más rápida.
          width: { ideal: IS_MOBILE ? 480 : 640 },
          height: { ideal: IS_MOBILE ? 360 : 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
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

  // ---------- Inferencia en Web Worker (preferida) ----------

  private initWorker(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.status("Cargando deteccion de manos...");
        const worker = new Worker(new URL("./handWorker.ts", import.meta.url), {
          type: "module",
        });
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            worker.terminate();
            console.warn("[HandTracker] Worker: timeout al inicializar.");
            resolve(false);
          }
        }, 20000);

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === "ready") {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              this.worker = worker;
              console.info(`[HandTracker] Worker listo. Delegado: ${msg.delegate}`);
              this.status("Manos detectadas! Mueve tu mano.", 1500);
              resolve(true);
            }
          } else if (msg.type === "error") {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              worker.terminate();
              console.warn("[HandTracker] Worker fallo al iniciar:", msg.message);
              resolve(false);
            }
          } else if (msg.type === "result") {
            this.onWorkerResult(msg.landmarks, msg.timestamp);
          }
        };

        worker.onerror = (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            worker.terminate();
            console.warn("[HandTracker] Worker error:", err.message);
            resolve(false);
          }
        };

        worker.postMessage({
          type: "init",
          bundleUrl: BUNDLE_URL,
          wasmUrl: WASM_URL,
          modelUrl: MODEL_URL,
        });
      } catch (e) {
        console.warn("[HandTracker] No se pudo crear el worker:", e);
        resolve(false);
      }
    });
  }

  private runWorkerLoop(): void {
    this.running = true;
    const run = () => {
      if (!this.running) return;
      this.sendFrameToWorker();
      this.scheduleNext(run);
    };
    run();
  }

  /** Captura un frame y lo transfiere al worker (1 en vuelo: backpressure). */
  private sendFrameToWorker(): void {
    if (!this.worker || this.workerBusy) return;
    if (this.video.readyState < 2) return;
    this.workerBusy = true;
    const ts = performance.now();
    // Reducimos el frame antes de mandarlo: MediaPipe procesa cada píxel, así
    // que menos píxeles = detección mucho más rápida (clave en móvil).
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;
    const scale = Math.min(1, INFER_WIDTH / vw);
    createImageBitmap(this.video, {
      resizeWidth: Math.round(vw * scale),
      resizeHeight: Math.round(vh * scale),
      resizeQuality: "low",
    })
      .then((bmp) => {
        if (!this.worker || !this.running) {
          bmp.close();
          this.workerBusy = false;
          return;
        }
        this.worker.postMessage({ type: "frame", bitmap: bmp, timestamp: ts }, [bmp]);
      })
      .catch((e) => {
        console.warn("[HandTracker] createImageBitmap:", e);
        this.workerBusy = false;
      });
  }

  private onWorkerResult(landmarks: Landmark[] | null, timestamp: number): void {
    this.workerBusy = false;
    if (landmarks && landmarks.length > 0) {
      this.applyHand(landmarks, timestamp / 1000);
      this.drawOverlay(landmarks);
    } else {
      this.clearHand();
      this.drawOverlay(null);
    }
  }

  // ---------- Inferencia en hilo principal (fallback) ----------

  private async initMainThread(): Promise<boolean> {
    try {
      this.status("Cargando deteccion de manos...");
      const { HandLandmarker, FilesetResolver } = await import(
        /* @vite-ignore */ BUNDLE_URL
      );
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const makeOptions = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO" as const,
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
      });
      try {
        this.detector = await HandLandmarker.createFromOptions(vision, makeOptions("GPU"));
        console.info("[HandTracker] Hilo principal. Delegado: GPU");
      } catch (gpuErr) {
        console.warn("MediaPipe GPU no disponible, usando CPU:", gpuErr);
        this.detector = await HandLandmarker.createFromOptions(vision, makeOptions("CPU"));
        console.info("[HandTracker] Hilo principal. Delegado: CPU");
      }
      this.status("Manos detectadas! Mueve tu mano.", 1500);
      return true;
    } catch (e) {
      console.error("HandTracker MediaPipe:", e);
      this.status("Sin deteccion de manos. Usa mouse/teclado.", 2500);
      return false;
    }
  }

  private runMainLoop(): void {
    this.running = true;
    const run = () => {
      if (!this.running) return;
      this.detectMainThread();
      this.scheduleNext(run);
    };
    run();
  }

  private detectMainThread(): void {
    if (!this.detector || this.video.readyState < 2) return;
    try {
      const result = this.detector.detectForVideo(this.video, performance.now());
      const hands: Landmark[][] = result?.landmarks ?? [];
      if (hands.length > 0) {
        this.applyHand(hands[0], performance.now() / 1000);
        this.drawOverlay(hands[0]);
      } else {
        this.clearHand();
        this.drawOverlay(null);
      }
    } catch (e) {
      console.warn("HandTracker detect:", e);
    }
  }

  // ---------- Común ----------

  /** Programa el siguiente tick por frame de vídeo (o RAF como respaldo). */
  private scheduleNext(run: () => void): void {
    const v = this.video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    if (typeof v.requestVideoFrameCallback === "function") {
      v.requestVideoFrameCallback(run);
    } else {
      requestAnimationFrame(run);
    }
  }

  /** Convierte landmarks crudos en HandInput normalizado, espejado y suavizado. */
  private applyHand(lm: Landmark[], tSeconds: number): void {
    const knuckle = lm[9]; // nudillo central: más estable que la punta del dedo
    this.latest.present = true;
    // Espejo en X porque el panel de cámara está reflejado (scaleX(-1)),
    // y suavizado adaptativo para eliminar el jitter de los landmarks.
    // Posición filtrada (anti-jitter). Es la base para estimar velocidad.
    const filtX = this.filterX.filter(1 - knuckle.x, tSeconds);
    const filtY = this.filterY.filter(knuckle.y, tSeconds);
    let outX = filtX;
    let outY = filtY;

    // Predicción de latencia: extrapola con la velocidad (sobre la señal ya
    // filtrada) para adelantar el retraso del pipeline. Cap por eje para que
    // un salto brusco no dispare la proyección.
    if (this.predictMs > 0 && this.predPrevT !== null) {
      const dt = tSeconds - this.predPrevT;
      if (dt > 0 && dt < 0.2) {
        const vx = (filtX - (this.predPrevX as number)) / dt;
        const vy = (filtY - (this.predPrevY as number)) / dt;
        const ahead = this.predictMs / 1000;
        const px = Math.max(-0.15, Math.min(0.15, vx * ahead));
        const py = Math.max(-0.15, Math.min(0.15, vy * ahead));
        outX = Math.max(0, Math.min(1, filtX + px));
        outY = Math.max(0, Math.min(1, filtY + py));
      }
    }
    // Guardar la posición filtrada (no la proyectada) para la próxima velocidad.
    this.predPrevX = filtX;
    this.predPrevY = filtY;
    this.predPrevT = tSeconds;

    this.latest.x = outX;
    this.latest.y = outY;
    // Puño cerrado: las 4 puntas por debajo de sus nudillos.
    this.latest.fist =
      lm[8].y > lm[5].y &&
      lm[12].y > lm[9].y &&
      lm[16].y > lm[13].y &&
      lm[20].y > lm[17].y;
    this.latest.landmarks = lm;
  }

  /** Marca "sin mano" y reinicia los filtros (evita saltos al reaparecer). */
  private clearHand(): void {
    this.latest.present = false;
    this.latest.fist = false;
    this.latest.landmarks = null;
    this.filterX.reset();
    this.filterY.reset();
    this.predPrevX = null;
    this.predPrevY = null;
    this.predPrevT = null;
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

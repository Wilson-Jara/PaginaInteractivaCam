// ============================================================
//  ONE EURO FILTER — suavizado adaptativo de baja latencia
// ============================================================
//  Filtro estándar para señales ruidosas de tracking (manos,
//  cursores). A diferencia de un lerp fijo, adapta el suavizado
//  a la velocidad del movimiento:
//    - mano casi quieta  -> mucho suavizado (elimina el jitter)
//    - mano rápida        -> poco suavizado (sin lag perceptible)
//
//  Referencia: Casiez, Roussel & Vogel (2012), "1€ Filter".
//
//  Parámetros (sobre coordenadas normalizadas 0..1):
//    - minCutoff: más bajo = más suave en reposo (más lag).
//    - beta:      más alto  = menos lag al moverse rápido.
//    - dCutoff:   corte del estimador de velocidad (1.0 va bien).
// ============================================================
export interface OneEuroOptions {
  /** Frecuencia de respaldo (Hz) si no se pasan timestamps. */
  freq?: number;
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

export class OneEuroFilter {
  private readonly freq: number;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(opts: OneEuroOptions = {}) {
    this.freq = opts.freq ?? 60;
    // minCutoff: suavizado en reposo. beta: responde al moverse (mas alto =
    // menos lag al mover la mano rapido). beta alto es clave para que el
    // movimiento se sienta directo sin reintroducir jitter en reposo.
    this.minCutoff = opts.minCutoff ?? 1.2;
    this.beta = opts.beta ?? 0.6;
    this.dCutoff = opts.dCutoff ?? 1.0;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** Filtra un valor. `t` en segundos (opcional pero recomendado). */
  filter(x: number, t?: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = t ?? 0;
      this.dxPrev = 0;
      return x;
    }
    let dt = t !== undefined ? t - this.tPrev : 1 / this.freq;
    if (dt <= 0 || !isFinite(dt)) dt = 1 / this.freq; // guarda contra saltos de reloj

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const aC = this.alpha(cutoff, dt);
    const xHat = aC * x + (1 - aC) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = t ?? this.tPrev + dt;
    return xHat;
  }

  /** Reinicia el estado (p. ej. al perder y recuperar la mano). */
  reset(): void {
    this.xPrev = null;
    this.tPrev = null;
    this.dxPrev = 0;
  }
}

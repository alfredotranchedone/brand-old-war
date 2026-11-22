import type { Point } from '../core/hex';

/** Raggio dell'esagono in coordinate mondo (pixel a zoom 1). */
export const HEX_SIZE = 32;

/** Livelli di zoom discreti. */
export const ZOOM_LEVELS: readonly number[] = [0.6, 1, 1.5, 2.2];

export interface Viewport {
  /** Dimensioni del canvas in pixel CSS. */
  readonly width: number;
  readonly height: number;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Camera 2D: `center` è il punto del mondo al centro del viewport.
 * Le conversioni sono in pixel CSS; il devicePixelRatio lo gestisce il renderer.
 */
export class Camera {
  center: Point = { x: 0, y: 0 };
  zoomIndex = 1;

  get scale(): number {
    return ZOOM_LEVELS[this.zoomIndex] ?? 1;
  }

  screenToWorld(s: Point, vp: Viewport): Point {
    return {
      x: (s.x - vp.width / 2) / this.scale + this.center.x,
      y: (s.y - vp.height / 2) / this.scale + this.center.y,
    };
  }

  worldToScreen(w: Point, vp: Viewport): Point {
    return {
      x: (w.x - this.center.x) * this.scale + vp.width / 2,
      y: (w.y - this.center.y) * this.scale + vp.height / 2,
    };
  }

  /** Sposta la camera di un delta in pixel schermo (trascinamento). */
  panBy(dxScreen: number, dyScreen: number): void {
    this.center = {
      x: this.center.x - dxScreen / this.scale,
      y: this.center.y - dyScreen / this.scale,
    };
  }

  /**
   * Cambia livello di zoom tenendo fermo il punto del mondo sotto `anchor` (coordinate schermo).
   * Restituisce true se lo zoom è cambiato.
   */
  zoomStep(step: number, anchor: Point, vp: Viewport): boolean {
    const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, this.zoomIndex + step));
    if (next === this.zoomIndex) return false;
    const world = this.screenToWorld(anchor, vp);
    this.zoomIndex = next;
    this.center = {
      x: world.x - (anchor.x - vp.width / 2) / this.scale,
      y: world.y - (anchor.y - vp.height / 2) / this.scale,
    };
    return true;
  }

  /** Centra sui limiti dati scegliendo il livello di zoom più grande che li contiene interi. */
  fit(bounds: Bounds, vp: Viewport, margin = 24): void {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    let best = 0;
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
      const s = ZOOM_LEVELS[i] ?? 1;
      if (w * s <= vp.width - 2 * margin && h * s <= vp.height - 2 * margin) best = i;
    }
    this.zoomIndex = best;
    this.center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  }

  /** Impedisce di trascinare la mappa del tutto fuori dallo schermo. */
  clampTo(bounds: Bounds, vp: Viewport): void {
    const halfW = vp.width / 2 / this.scale;
    const halfH = vp.height / 2 / this.scale;
    // Il centro può spostarsi finché almeno metà viewport resta sopra la mappa.
    const minX = bounds.minX - halfW / 2;
    const maxX = bounds.maxX + halfW / 2;
    const minY = bounds.minY - halfH / 2;
    const maxY = bounds.maxY + halfH / 2;
    this.center = {
      x: Math.min(maxX, Math.max(minX, this.center.x)),
      y: Math.min(maxY, Math.max(minY, this.center.y)),
    };
  }
}

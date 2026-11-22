/**
 * Simboli militari APP-6 generati al volo con milsymbol (MIT) e messi in cache:
 * un raster per tipo di unità, fazione e risoluzione (livello di zoom × devicePixelRatio).
 */
import ms from 'milsymbol';
import { type Side, type UnitType, sidcForSide } from '../core/units';

ms.setStandard('APP6');

/** Dimensione del simbolo in unità mondo (parametro `size` di milsymbol a zoom 1). */
export const SYMBOL_SIZE = 28;

export interface SymbolRaster {
  readonly canvas: HTMLCanvasElement;
  /** Punto del raster da far coincidere con il centro dell'esagono (centro della cornice). */
  readonly anchorX: number;
  readonly anchorY: number;
  /** Pixel del raster per unità mondo. */
  readonly pixelsPerUnit: number;
}

const OPTIONS = {
  colorMode: 'Medium',
  fill: true,
  frame: true,
  icon: true,
  monoColor: '',
  outlineWidth: 0,
} as const;

const cache = new Map<string, SymbolRaster>();

/** Raster del simbolo per la scala in pixel richiesta (zoom × dpr). */
export function getSymbolRaster(type: UnitType, side: Side, pixelsPerUnit: number): SymbolRaster {
  // Arrotonda la scala a passi di 0,25 per riusare i raster.
  const scale = Math.max(0.25, Math.round(pixelsPerUnit * 4) / 4);
  const key = `${type.id}|${side}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const symbol = new ms.Symbol(sidcForSide(type, side), { ...OPTIONS, size: SYMBOL_SIZE * scale });
  const canvas = symbol.asCanvas();
  const anchor = symbol.getOctagonAnchor();
  const raster: SymbolRaster = { canvas, anchorX: anchor.x, anchorY: anchor.y, pixelsPerUnit: scale };
  cache.set(key, raster);
  return raster;
}

/** Immagine SVG del simbolo (data URL) per i pannelli React. */
export function symbolDataUrl(type: UnitType, side: Side, size = 30): string {
  const svg = new ms.Symbol(sidcForSide(type, side), { ...OPTIONS, size }).asSVG();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

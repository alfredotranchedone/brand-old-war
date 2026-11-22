/**
 * Simboli militari APP-6 generati al volo con milsymbol (MIT) e messi in cache:
 * un raster per tipo di unità, fazione e risoluzione (livello di zoom × devicePixelRatio).
 */
import ms from 'milsymbol';
import { type Side, type UnitType, sidcForSide } from '../core/units';

ms.setStandard('APP6');

/** Costante di dimensione standard per i simboli tattici APP-6. */
export const SYMBOL_SIZE = 28;

export interface SymbolRaster {
  readonly canvas: HTMLCanvasElement;
  /** Centro del raster da allineare col centro dell'esagono. */
  readonly anchorX: number;
  readonly anchorY: number;
  /** Pixel per unità mondo (scala di questo raster). */
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

const optionsFor = (type: UnitType) => (type.symbolText ? { ...OPTIONS, specialHeadquarters: type.symbolText } : OPTIONS);

const cache = new Map<string, SymbolRaster>();

/** Genere il raster del simbolo per la scala richiesta (zoom × DPI), con caching per riuso. */
export function getSymbolRaster(type: UnitType, side: Side, pixelsPerUnit: number): SymbolRaster {
  // Quantizza la scala a step di 0,25 per massimizzare il riuso.
  const scale = Math.max(0.25, Math.round(pixelsPerUnit * 4) / 4);
  const key = `${type.id}|${side}|${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const symbol = new ms.Symbol(sidcForSide(type, side), { ...optionsFor(type), size: SYMBOL_SIZE * scale });
  const canvas = symbol.asCanvas();
  const anchor = symbol.getOctagonAnchor();
  const raster: SymbolRaster = { canvas, anchorX: anchor.x, anchorY: anchor.y, pixelsPerUnit: scale };
  cache.set(key, raster);
  return raster;
}

/** Ritorna il data URL SVG del simbolo per l'uso nei pannelli React. */
export function symbolDataUrl(type: UnitType, side: Side, size = 30): string {
  const svg = new ms.Symbol(sidcForSide(type, side), { ...optionsFor(type), size }).asSVG();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

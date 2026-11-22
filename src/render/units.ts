import { type Point, hexToPixel } from '../core/hex';
import type { Unit, UnitType } from '../core/units';
import { HEX_SIZE } from './camera';
import { getSymbolRaster } from './symbols';
import { MAP_THEME } from './theme';

/** Unità aerea sopra una terrestre: scala e spostamento (in raggi d'esagono) verso l'alto a destra. */
const AIR_SCALE = 0.7;
const AIR_SHIFT = 0.32;

/** Pedina: simbolo, forza in basso a destra, avviso di rifornimento in basso a sinistra. */
export function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  type: UnitType,
  pixelsPerUnit: number,
  dimmed: boolean,
  at?: Point | null,
  layer: { readonly airborne: boolean; readonly stacked: boolean } = { airborne: false, stacked: false },
): void {
  const base = at ?? hexToPixel(unit.pos, HEX_SIZE);
  const shift = layer.stacked ? HEX_SIZE * AIR_SHIFT : 0;
  const c = { x: base.x + shift, y: base.y - shift };
  const size = layer.stacked ? AIR_SCALE : 1;
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.45;
  // Le unità aeree proiettano un'ombra: sono sopra la mappa.
  if (layer.airborne) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 4;
  }

  const raster = getSymbolRaster(type, unit.side, pixelsPerUnit * size);
  const k = size / raster.pixelsPerUnit;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    raster.canvas,
    c.x - raster.anchorX * k,
    c.y - raster.anchorY * k + 2,
    raster.canvas.width * k,
    raster.canvas.height * k,
  );

  ctx.shadowColor = 'transparent';
  drawStrength(ctx, unit.strength, c.x + HEX_SIZE * 0.3 * size, c.y + HEX_SIZE * 0.38 * size);
  if (unit.outOfSupplyTurns > 0) drawSupplyWarning(ctx, c.x - HEX_SIZE * 0.5, c.y + HEX_SIZE * 0.38);
  ctx.restore();
}

function drawStrength(ctx: CanvasRenderingContext2D, strength: number, x: number, y: number): void {
  const w = 13;
  const h = 11;
  const band = MAP_THEME.strengthBands.find((b) => strength <= b.max) ?? MAP_THEME.strengthBands[0]!;
  ctx.fillStyle = band.fill;
  ctx.strokeStyle = MAP_THEME.strengthBox.stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = band.text;
  ctx.font = `bold 9px ${MAP_THEME.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(strength), x + w / 2, y + h / 2 + 0.5);
}

function drawSupplyWarning(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x + 6.5, y);
  ctx.lineTo(x + 13, y + 11);
  ctx.lineTo(x, y + 11);
  ctx.closePath();
  ctx.fillStyle = MAP_THEME.warning.fill;
  ctx.fill();
  ctx.strokeStyle = MAP_THEME.warning.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = MAP_THEME.warning.text;
  ctx.font = `bold 8px ${MAP_THEME.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', x + 6.5, y + 7);
}

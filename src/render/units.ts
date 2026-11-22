import { hexToPixel } from '../core/hex';
import type { Unit, UnitType } from '../core/units';
import { HEX_SIZE } from './camera';
import { getSymbolRaster } from './symbols';
import { MAP_THEME } from './theme';

/** Pedina: simbolo, forza in basso a destra, avviso di rifornimento in basso a sinistra. */
export function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  type: UnitType,
  pixelsPerUnit: number,
  dimmed: boolean,
): void {
  const c = hexToPixel(unit.pos, HEX_SIZE);
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.45;

  const raster = getSymbolRaster(type, unit.side, pixelsPerUnit);
  const k = 1 / raster.pixelsPerUnit;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    raster.canvas,
    c.x - raster.anchorX * k,
    c.y - raster.anchorY * k + 2,
    raster.canvas.width * k,
    raster.canvas.height * k,
  );

  drawStrength(ctx, unit.strength, c.x + HEX_SIZE * 0.3, c.y + HEX_SIZE * 0.38);
  if (unit.outOfSupplyTurns > 0) drawSupplyWarning(ctx, c.x - HEX_SIZE * 0.5, c.y + HEX_SIZE * 0.38);
  ctx.restore();
}

function drawStrength(ctx: CanvasRenderingContext2D, strength: number, x: number, y: number): void {
  const w = 13;
  const h = 11;
  ctx.fillStyle = MAP_THEME.strengthBox.fill;
  ctx.strokeStyle = MAP_THEME.strengthBox.stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = MAP_THEME.strengthBox.text;
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

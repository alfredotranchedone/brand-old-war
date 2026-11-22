import { type Axial, axialToOffset, hexKey, hexToPixel } from '../core/hex';
import { type MapData, mapHexes } from '../core/map';
import type { Side } from '../core/units';
import { HEX_SIZE } from './camera';
import { hexPath } from './geometry';
import { MAP_THEME } from './theme';

export function drawObjectives(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  control: Readonly<Record<string, Side>>,
): void {
  for (const o of map.objectives) {
    const owner = control[o.id];
    const colors = owner ? MAP_THEME.side[owner] : null;
    const inner = hexPath(o.pos, 0.86);
    ctx.fillStyle = colors?.tint ?? 'rgba(0,0,0,0.06)';
    ctx.fill(inner);
    ctx.strokeStyle = colors?.solid ?? '#555';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke(inner);
    ctx.setLineDash([]);
  }
}

/** Nomi di località sopra l'esagono; per gli obiettivi anche il valore in stelle. */
export function drawLabels(ctx: CanvasRenderingContext2D, map: MapData): void {
  const names = new Map<string, { h: Axial; text: string; bold: boolean }>();
  for (const h of mapHexes(map)) {
    const label = map.hexes[hexKey(h)]?.label;
    if (label) names.set(hexKey(h), { h, text: label, bold: false });
  }
  for (const o of map.objectives) {
    names.set(hexKey(o.pos), { h: o.pos, text: `${o.name} ${'★'.repeat(o.points)}`, bold: true });
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  for (const { h, text, bold } of names.values()) {
    const c = hexToPixel(h, HEX_SIZE);
    const y = c.y - HEX_SIZE * 0.87 + 1;
    ctx.font = `${bold ? '600 ' : ''}10px ${MAP_THEME.font}`;
    ctx.strokeStyle = MAP_THEME.labelHalo;
    ctx.lineWidth = 3;
    ctx.strokeText(text, c.x, y);
    ctx.fillStyle = MAP_THEME.labelText;
    ctx.fillText(text, c.x, y);
  }
}

export function drawCoords(ctx: CanvasRenderingContext2D, map: MapData): void {
  ctx.fillStyle = MAP_THEME.coordText;
  ctx.font = `8px ${MAP_THEME.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const h of mapHexes(map)) {
    const c = hexToPixel(h, HEX_SIZE);
    const { col, row } = axialToOffset(h);
    ctx.fillText(`${String(col).padStart(2, '0')}${String(row).padStart(2, '0')}`, c.x, c.y + HEX_SIZE * 0.84);
  }
}

import { type Axial, type HexKey, hexCorners, hexKey, hexNeighbor, hexToPixel, parseHexKey } from '../core/hex';
import { HEX_SIZE } from './camera';
import { traceHex } from './geometry';
import { MAP_THEME } from './theme';

export function drawReachable(ctx: CanvasRenderingContext2D, hexes: readonly Axial[]): void {
  if (hexes.length === 0) return;
  const p = new Path2D();
  for (const h of hexes) traceHex(p, h);
  ctx.fillStyle = MAP_THEME.reachFill;
  ctx.fill(p);
}

/** Contorno tratteggiato dell'area coperta dalla ZOC (solo i lati verso l'esterno). */
export function drawZocBorder(ctx: CanvasRenderingContext2D, zoc: ReadonlySet<HexKey>, color: string, scale: number): void {
  if (zoc.size === 0) return;
  const p = new Path2D();
  for (const key of zoc) {
    const h = parseHexKey(key);
    const corners = hexCorners(h, HEX_SIZE);
    for (let d = 0; d < 6; d++) {
      if (zoc.has(hexKey(hexNeighbor(h, d)))) continue;
      // Il lato verso la direzione d unisce i vertici d e d+1.
      const a = corners[d]!;
      const b = corners[(d + 1) % 6]!;
      p.moveTo(a.x, a.y);
      p.lineTo(b.x, b.y);
    }
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 2 / scale);
  ctx.setLineDash([5, 4]);
  ctx.lineCap = 'round';
  ctx.stroke(p);
  ctx.restore();
}

export function drawPath(ctx: CanvasRenderingContext2D, path: readonly Axial[], cost: number | null): void {
  if (path.length < 2) return;
  const pts = path.map((h) => hexToPixel(h, HEX_SIZE));
  ctx.save();
  ctx.strokeStyle = MAP_THEME.path;
  ctx.fillStyle = MAP_THEME.path;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  for (const p of pts.slice(1, -1)) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const end = pts[pts.length - 1]!;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
  ctx.fill();
  if (cost !== null) {
    ctx.font = `bold 10px ${MAP_THEME.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = MAP_THEME.labelHalo;
    const label = `${Number.isInteger(cost) ? cost : cost.toFixed(1)} PM`;
    ctx.strokeText(label, end.x, end.y + 8);
    ctx.fillText(label, end.x, end.y + 8);
  }
  ctx.restore();
}

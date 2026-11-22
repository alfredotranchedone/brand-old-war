import { type Axial, type HexKey, hexCorners, hexKey, hexNeighbor, hexToPixel, parseHexKey } from '../core/hex';
import { HEX_SIZE } from './camera';
import { hexPath, traceHex } from './geometry';
import { MAP_THEME } from './theme';

export function drawReachable(ctx: CanvasRenderingContext2D, hexes: readonly Axial[]): void {
  if (hexes.length === 0) return;
  const p = new Path2D();
  for (const h of hexes) traceHex(p, h);
  ctx.fillStyle = MAP_THEME.reachFill;
  ctx.fill(p);
}

/** Lati verso l'esterno di un'area di esagoni. */
function areaBorder(area: ReadonlySet<HexKey>): Path2D {
  const p = new Path2D();
  for (const key of area) {
    const h = parseHexKey(key);
    const corners = hexCorners(h, HEX_SIZE);
    for (let d = 0; d < 6; d++) {
      if (area.has(hexKey(hexNeighbor(h, d)))) continue;
      // Il lato verso la direzione d unisce i vertici d e d+1.
      const a = corners[d]!;
      const b = corners[(d + 1) % 6]!;
      p.moveTo(a.x, a.y);
      p.lineTo(b.x, b.y);
    }
  }
  return p;
}

/** Contorno tratteggiato dell'area coperta dalla ZOC. */
export function drawZocBorder(ctx: CanvasRenderingContext2D, zoc: ReadonlySet<HexKey>, color: string, scale: number): void {
  if (zoc.size === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 2 / scale);
  ctx.setLineDash([5, 4]);
  ctx.lineCap = 'round';
  ctx.stroke(areaBorder(zoc));
  ctx.restore();
}

/** Rete di rifornimento: area velata e bordo continuo nel colore della fazione. */
export function drawSupplyNetwork(
  ctx: CanvasRenderingContext2D,
  hexes: ReadonlySet<HexKey>,
  colors: { readonly solid: string; readonly tint: string },
  scale: number,
): void {
  if (hexes.size === 0) return;
  const fill = new Path2D();
  for (const key of hexes) traceHex(fill, parseHexKey(key));
  ctx.save();
  ctx.fillStyle = colors.tint;
  ctx.fill(fill);
  ctx.strokeStyle = colors.solid;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, 1.5 / scale);
  ctx.stroke(areaBorder(hexes));
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

export function drawTargets(ctx: CanvasRenderingContext2D, targets: readonly Axial[], chosen: Axial | null): void {
  for (const h of targets) {
    const p = hexPath(h, 0.92);
    ctx.fillStyle = MAP_THEME.targetFill;
    ctx.fill(p);
    const isChosen = chosen !== null && chosen.q === h.q && chosen.r === h.r;
    ctx.strokeStyle = MAP_THEME.targetStroke;
    ctx.lineWidth = isChosen ? 4 : 2;
    ctx.stroke(p);
  }
}

/** Contorno tratteggiato sulle unità che danno supporto. */
export function drawSupport(ctx: CanvasRenderingContext2D, hexes: readonly Axial[], color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 4]);
  for (const h of hexes) ctx.stroke(hexPath(h, 0.9));
  ctx.restore();
}

export function drawAdvance(ctx: CanvasRenderingContext2D, h: Axial): void {
  const p = hexPath(h, 0.88);
  ctx.save();
  ctx.fillStyle = 'rgba(31, 122, 58, 0.15)';
  ctx.fill(p);
  ctx.strokeStyle = MAP_THEME.advanceStroke;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.stroke(p);
  ctx.restore();
}

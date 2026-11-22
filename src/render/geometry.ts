import { type Axial, hexCorners, hexToPixel } from '../core/hex';
import { HEX_SIZE } from './camera';

export function traceHex(ctx: CanvasRenderingContext2D | Path2D, h: Axial, inset = 1): void {
  const c = hexToPixel(h, HEX_SIZE);
  hexCorners(h, HEX_SIZE).forEach((v, i) => {
    const x = c.x + (v.x - c.x) * inset;
    const y = c.y + (v.y - c.y) * inset;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

export function hexPath(h: Axial, inset = 1): Path2D {
  const p = new Path2D();
  traceHex(p, h, inset);
  return p;
}

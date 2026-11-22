/**
 * Disegno imperativo della mappa su Canvas 2D. Nessuna dipendenza da React:
 * il componente MapCanvas passa lo stato con `update()` e il renderer ridisegna
 * al prossimo animation frame, solo se qualcosa è cambiato.
 */
import { type Axial, axialToOffset, hexCorners, hexKey, hexToPixel } from '../core/hex';
import { type MapData, mapHexes } from '../core/map';
import { type Bounds, Camera, HEX_SIZE, type Viewport } from './camera';
import { MAP_THEME } from './theme';

export interface RenderInput {
  readonly map: MapData;
  readonly hovered: Axial | null;
  readonly showCoords: boolean;
}

function tracePolygon(ctx: CanvasRenderingContext2D | Path2D, h: Axial): void {
  const corners = hexCorners(h, HEX_SIZE);
  const first = corners[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < corners.length; i++) {
    const c = corners[i];
    if (c) ctx.lineTo(c.x, c.y);
  }
  ctx.closePath();
}

export function mapBounds(map: MapData): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const h of mapHexes(map)) {
    for (const c of hexCorners(h, HEX_SIZE)) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

export class MapRenderer {
  readonly camera = new Camera();
  private readonly ctx: CanvasRenderingContext2D;
  private viewport: Viewport = { width: 0, height: 0 };
  private dpr = 1;
  private input: RenderInput | null = null;
  private frame = 0;

  // Geometria in cache, ricalcolata solo quando cambia la mappa.
  private cachedMap: MapData | null = null;
  private terrainPaths = new Map<string, Path2D>();
  private gridPath = new Path2D();
  private outlinePath = new Path2D();
  private bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponibile');
    this.ctx = ctx;
  }

  get currentViewport(): Viewport {
    return this.viewport;
  }

  get mapBounds(): Bounds {
    return this.bounds;
  }

  /** Adatta il buffer del canvas alle dimensioni CSS e al devicePixelRatio. */
  resize(width: number, height: number, dpr: number): void {
    this.viewport = { width, height };
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    if (this.cachedMap) this.camera.clampTo(this.bounds, this.viewport);
    this.requestDraw();
  }

  update(input: RenderInput): void {
    const mapChanged = input.map !== this.cachedMap;
    this.input = input;
    if (mapChanged) this.rebuildGeometry(input.map);
    this.requestDraw();
  }

  /** Inquadra l'intera mappa. */
  fitMap(): void {
    if (!this.cachedMap) return;
    this.camera.fit(this.bounds, this.viewport);
    this.requestDraw();
  }

  pan(dx: number, dy: number): void {
    this.camera.panBy(dx, dy);
    this.camera.clampTo(this.bounds, this.viewport);
    this.requestDraw();
  }

  zoom(step: number, anchor: { x: number; y: number }): void {
    if (this.camera.zoomStep(step, anchor, this.viewport)) {
      this.camera.clampTo(this.bounds, this.viewport);
      this.requestDraw();
    }
  }

  requestDraw(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  dispose(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private rebuildGeometry(map: MapData): void {
    this.cachedMap = map;
    this.terrainPaths = new Map();
    this.gridPath = new Path2D();
    this.outlinePath = new Path2D();
    for (const h of mapHexes(map)) {
      const terrain = map.hexes[hexKey(h)]?.terrain ?? 'clear';
      let path = this.terrainPaths.get(terrain);
      if (!path) {
        path = new Path2D();
        this.terrainPaths.set(terrain, path);
      }
      tracePolygon(path, h);
      tracePolygon(this.gridPath, h);
      tracePolygon(this.outlinePath, h);
    }
    this.bounds = mapBounds(map);
  }

  private draw(): void {
    const { ctx, viewport, dpr, camera } = this;
    const input = this.input;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = MAP_THEME.background;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (!input) return;

    // Trasformazione mondo -> schermo (pixel fisici).
    const s = camera.scale;
    ctx.setTransform(
      dpr * s,
      0,
      0,
      dpr * s,
      dpr * (viewport.width / 2 - camera.center.x * s),
      dpr * (viewport.height / 2 - camera.center.y * s),
    );

    // Bordo esterno della mappa: tratto spesso sotto i riempimenti.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = MAP_THEME.mapBorder;
    ctx.lineWidth = 4 / s;
    ctx.stroke(this.outlinePath);

    for (const [terrain, path] of this.terrainPaths) {
      ctx.fillStyle = MAP_THEME.terrain[terrain] ?? MAP_THEME.terrainFallback;
      ctx.fill(path);
    }

    ctx.strokeStyle = MAP_THEME.gridLine;
    ctx.lineWidth = 1 / s;
    ctx.stroke(this.gridPath);

    if (input.showCoords) this.drawCoords(input.map);

    if (input.hovered && input.map.hexes[hexKey(input.hovered)]) {
      const p = new Path2D();
      tracePolygon(p, input.hovered);
      ctx.fillStyle = MAP_THEME.hoverFill;
      ctx.fill(p);
      ctx.strokeStyle = MAP_THEME.hoverStroke;
      ctx.lineWidth = 2.5 / s;
      ctx.stroke(p);
    }
  }

  private drawCoords(map: MapData): void {
    const { ctx } = this;
    ctx.fillStyle = MAP_THEME.coordText;
    ctx.font = `9px ${MAP_THEME.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const h of mapHexes(map)) {
      const c = hexToPixel(h, HEX_SIZE);
      const { col, row } = axialToOffset(h);
      ctx.fillText(
        `${String(col).padStart(2, '0')}${String(row).padStart(2, '0')}`,
        c.x,
        c.y - HEX_SIZE * 0.78,
      );
    }
  }
}


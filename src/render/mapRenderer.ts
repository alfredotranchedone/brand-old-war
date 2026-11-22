import { type Axial, type HexKey, hexCorners, hexKey } from '../core/hex';
import { type MapData, mapHexes } from '../core/map';
import { type Side, type Unit, type UnitTypeTable, isAlive } from '../core/units';
import { type Bounds, Camera, HEX_SIZE, type Viewport } from './camera';
import { hexPath, traceHex } from './geometry';
import { drawCoords, drawLabels, drawObjectives } from './mapLayers';
import { drawPath, drawReachable, drawZocBorder } from './overlays';
import { MAP_THEME } from './theme';
import { drawUnit } from './units';

export interface ZocOverlay {
  readonly side: Side;
  readonly hexes: ReadonlySet<HexKey>;
}

export interface RenderInput {
  readonly map: MapData;
  readonly unitTypes: UnitTypeTable;
  readonly units: readonly Unit[];
  readonly objectives: Readonly<Record<string, Side>>;
  readonly hovered: Axial | null;
  readonly selectedUnitId: string | null;
  readonly reachable: readonly Axial[];
  readonly path: { readonly hexes: readonly Axial[]; readonly cost: number } | null;
  readonly zoc: readonly ZocOverlay[];
  readonly showCoords: boolean;
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

  private cachedMap: MapData | null = null;
  private terrainPaths = new Map<string, Path2D>();
  private gridPath = new Path2D();
  private bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponibile');
    this.ctx = ctx;
  }

  get currentViewport(): Viewport {
    return this.viewport;
  }

  resize(width: number, height: number, dpr: number): void {
    this.viewport = { width, height };
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    if (this.cachedMap) this.camera.clampTo(this.bounds, this.viewport);
    this.requestDraw();
  }

  update(input: RenderInput): void {
    if (input.map !== this.cachedMap) this.rebuildGeometry(input.map);
    this.input = input;
    this.requestDraw();
  }

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
    for (const h of mapHexes(map)) {
      const terrain = map.hexes[hexKey(h)]?.terrain ?? 'clear';
      let path = this.terrainPaths.get(terrain);
      if (!path) {
        path = new Path2D();
        this.terrainPaths.set(terrain, path);
      }
      traceHex(path, h);
      traceHex(this.gridPath, h);
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

    const s = camera.scale;
    ctx.setTransform(
      dpr * s,
      0,
      0,
      dpr * s,
      dpr * (viewport.width / 2 - camera.center.x * s),
      dpr * (viewport.height / 2 - camera.center.y * s),
    );

    this.drawTerrain(s);
    drawObjectives(ctx, input.map, input.objectives);
    drawReachable(ctx, input.reachable);
    for (const z of input.zoc) drawZocBorder(ctx, z.hexes, MAP_THEME.side[z.side].solid, s);
    if (input.showCoords) drawCoords(ctx, input.map);
    this.drawHover(input, s);
    this.drawSelection(input);
    drawLabels(ctx, input.map);

    for (const u of input.units) {
      const type = input.unitTypes[u.typeId];
      if (type && isAlive(u)) drawUnit(ctx, u, type, s * dpr);
    }
    if (input.path) drawPath(ctx, input.path.hexes, input.path.cost);
  }

  private drawTerrain(scale: number): void {
    const { ctx } = this;
    // Il tratto spesso sotto i riempimenti resta visibile solo sul bordo esterno.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = MAP_THEME.mapBorder;
    ctx.lineWidth = 4 / scale;
    ctx.stroke(this.gridPath);
    for (const [terrain, path] of this.terrainPaths) {
      ctx.fillStyle = MAP_THEME.terrain[terrain] ?? MAP_THEME.terrainFallback;
      ctx.fill(path);
    }
    ctx.strokeStyle = MAP_THEME.gridLine;
    ctx.lineWidth = 1 / scale;
    ctx.stroke(this.gridPath);
  }

  private drawHover(input: RenderInput, scale: number): void {
    if (!input.hovered || !input.map.hexes[hexKey(input.hovered)]) return;
    const p = hexPath(input.hovered);
    this.ctx.fillStyle = MAP_THEME.hoverFill;
    this.ctx.fill(p);
    this.ctx.strokeStyle = MAP_THEME.hoverStroke;
    this.ctx.lineWidth = 2 / scale;
    this.ctx.stroke(p);
  }

  private drawSelection(input: RenderInput): void {
    const selected = input.units.find((u) => u.id === input.selectedUnitId && isAlive(u));
    if (!selected) return;
    this.ctx.strokeStyle = MAP_THEME.selectedStroke;
    this.ctx.lineWidth = 3.5;
    this.ctx.stroke(hexPath(selected.pos, 0.9));
  }
}

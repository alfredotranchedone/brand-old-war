import type { GameEvent } from '../core/events';
import { type Axial, type HexKey, hexCorners, hexKey, hexToPixel } from '../core/hex';
import { type MapData, type TerrainTable, mapHexes } from '../core/map';
import { type Side, type Unit, type UnitTypeTable, isAirType, isAlive } from '../core/units';
import { type Bounds, Camera, HEX_SIZE, type Viewport } from './camera';
import { hexPath, traceHex } from './geometry';
import { Animations } from './animations';
import { drawCoords, drawDepots, drawLabels, drawObjectives } from './mapLayers';
import { type RouteGeometry, buildRouteGeometry, drawRoutes } from './routes';
import { areaBorder, drawAdvance, drawBubble, drawPath, drawSupport, drawReachable, drawSupplyNetwork, drawTargets, drawZocBorder } from './overlays';
import { MAP_THEME } from './theme';
import { TileImages } from './tiles';
import { drawUnit } from './units';

export interface ZocOverlay {
  readonly side: Side;
  readonly hexes: ReadonlySet<HexKey>;
}

export interface SupplyOverlay {
  readonly side: Side;
  readonly hexes: ReadonlySet<HexKey>;
}

export interface RenderInput {
  readonly map: MapData;
  readonly unitTypes: UnitTypeTable;
  readonly terrain: TerrainTable;
  readonly units: readonly Unit[];
  readonly objectives: Readonly<Record<string, Side>>;
  readonly depots: Readonly<Record<string, Side>>;
  readonly hovered: Axial | null;
  /** Area del pennello sotto il cursore (usata nell'editor). */
  readonly hoverArea?: readonly Axial[];
  readonly selectedUnitId: string | null;
  readonly reachable: readonly Axial[];
  readonly path: { readonly hexes: readonly Axial[]; readonly cost: number } | null;
  readonly zoc: readonly ZocOverlay[];
  readonly supply: readonly SupplyOverlay[];
  readonly targets: readonly Axial[];
  readonly chosenTarget: Axial | null;
  /** Esagoni delle unità che forniscono supporto in combattimento. */
  readonly supportHexes: { readonly attacker: readonly Axial[]; readonly defender: readonly Axial[] };
  readonly advanceHex: Axial | null;
  /** Esagoni delle unità che non hanno più azioni disponibili questo turno. */
  readonly spent: ReadonlySet<string>;
  readonly showCoords: boolean;
  /** Bolle di contraerea e guerra elettronica da disegnare. */
  readonly bubbles?: readonly { readonly kind: 'aa' | 'ew'; readonly hexes: ReadonlySet<HexKey> }[];
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
  private readonly animations = new Animations();
  private readonly tiles = new TileImages(() => this.requestDraw());

  private cachedMap: MapData | null = null;
  private terrainPaths = new Map<string, Path2D>();
  private terrainHexes = new Map<string, Axial[]>();
  private gridPath = new Path2D();
  private routes: RouteGeometry | null = null;
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
    if (input.map !== this.cachedMap) {
      const prev = this.cachedMap;
      this.rebuildGeometry(input.map, input.terrain);
      // Mappa di dimensioni diverse (nuovo scenario): si rimette tutta in vista.
      if (prev && (prev.width !== input.map.width || prev.height !== input.map.height)) this.camera.fit(this.bounds, this.viewport);
    }
    this.input = input;
    this.requestDraw();
  }

  /** Accoda gli eventi per l'animazione (movimenti e perdite). */
  animate(events: readonly GameEvent[], moveMs: number): void {
    const units = this.input?.units ?? [];
    this.animations.add(events, (id) => units.find((u) => u.id === id)?.pos, moveMs, performance.now());
    this.requestDraw();
  }

  stopAnimations(): void {
    this.animations.clear();
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

  private rebuildGeometry(map: MapData, terrain: TerrainTable): void {
    this.cachedMap = map;
    this.routes = buildRouteGeometry(map, terrain);
    this.terrainPaths = new Map();
    this.terrainHexes = new Map();
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
      const list = this.terrainHexes.get(terrain) ?? [];
      list.push(h);
      this.terrainHexes.set(terrain, list);
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
    const now = performance.now();
    ctx.setTransform(
      dpr * s,
      0,
      0,
      dpr * s,
      dpr * (viewport.width / 2 - camera.center.x * s),
      dpr * (viewport.height / 2 - camera.center.y * s),
    );

    this.drawTerrain(input.terrain, s);
    if (this.routes) drawRoutes(ctx, this.routes);
    for (const n of input.supply) drawSupplyNetwork(ctx, n.hexes, MAP_THEME.side[n.side], s);
    drawObjectives(ctx, input.map, input.objectives);
    drawDepots(ctx, input.map, input.depots);
    drawReachable(ctx, input.reachable);
    for (const z of input.zoc) drawZocBorder(ctx, z.hexes, MAP_THEME.side[z.side].solid, s);
    for (const b of input.bubbles ?? []) drawBubble(ctx, b.hexes, MAP_THEME.bubble[b.kind], s);
    if (input.showCoords) drawCoords(ctx, input.map);
    this.drawHover(input, s);
    drawTargets(ctx, input.targets, input.chosenTarget);
    drawSupport(ctx, input.supportHexes.attacker, MAP_THEME.supportFriendly);
    drawSupport(ctx, input.supportHexes.defender, MAP_THEME.supportEnemy);
    if (input.advanceHex) drawAdvance(ctx, input.advanceHex);
    this.drawSelection(input);
    drawLabels(ctx, input.map);

    this.drawUnits(input, s * dpr, now);
    this.animations.drawTracers(ctx, now);
    this.animations.drawLosses(ctx, now);
    if (this.animations.isActive(now)) this.requestDraw();
    if (input.path) drawPath(ctx, input.path.hexes, input.path.cost);
  }

  private drawTerrain(table: TerrainTable, scale: number): void {
    const { ctx } = this;
    // Il tratto spesso sotto i riempimenti resta visibile solo sul bordo esterno.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = MAP_THEME.mapBorder;
    ctx.lineWidth = 4 / scale;
    ctx.stroke(this.gridPath);
    for (const [terrain, path] of this.terrainPaths) {
      ctx.fillStyle = MAP_THEME.terrain[terrain] ?? MAP_THEME.terrainFallback;
      ctx.fill(path);
      const t = table[terrain];
      const hexes = this.terrainHexes.get(terrain) ?? [];
      for (const name of [t?.tile, t?.overlay]) {
        const img = name ? this.tiles.get(name) : undefined;
        if (img) drawTiles(ctx, img, hexes);
      }
    }
    ctx.strokeStyle = MAP_THEME.gridLine;
    ctx.lineWidth = 1 / scale;
    ctx.stroke(this.gridPath);
  }

  private drawHover(input: RenderInput, scale: number): void {
    if (!input.hovered || !input.map.hexes[hexKey(input.hovered)]) return;
    const area = input.hoverArea && input.hoverArea.length > 1 ? input.hoverArea : null;
    const fill = new Path2D();
    for (const h of area ?? [input.hovered]) traceHex(fill, h);
    this.ctx.fillStyle = MAP_THEME.hoverFill;
    this.ctx.fill(fill);
    this.ctx.strokeStyle = MAP_THEME.hoverStroke;
    this.ctx.lineWidth = 2 / scale;
    this.ctx.lineJoin = 'round';
    this.ctx.stroke(area ? areaBorder(new Set(area.map(hexKey))) : fill);
  }

  /** Prima le terrestri, poi le aeree; un'aerea sopra una terrestre è rimpicciolita e spostata in alto a destra. */
  private drawUnits(input: RenderInput, pixelsPerUnit: number, now: number): void {
    const live = input.units.filter((u) => isAlive(u) && input.unitTypes[u.typeId]);
    const isAir = (u: Unit) => isAirType(input.unitTypes[u.typeId]!);
    const groundHexes = new Set(live.filter((u) => !isAir(u)).map((u) => hexKey(u.pos)));
    for (const air of [false, true]) {
      for (const u of live) {
        if (isAir(u) !== air) continue;
        const stacked = air && groundHexes.has(hexKey(u.pos));
        drawUnit(this.ctx, u, input.unitTypes[u.typeId]!, pixelsPerUnit, input.spent.has(u.id), this.animations.unitPoint(u.id, now), {
          airborne: air,
          stacked,
        });
      }
    }
  }

  private drawSelection(input: RenderInput): void {
    const selected = input.units.find((u) => u.id === input.selectedUnitId && isAlive(u));
    if (!selected) return;
    this.ctx.strokeStyle = MAP_THEME.selectedStroke;
    this.ctx.lineWidth = 3.5;
    this.ctx.stroke(hexPath(selected.pos, 0.9));
  }
}

/** Tile pixel art ingrandite senza smussatura e adattate al riquadro dell'esagono. */
function drawTiles(ctx: CanvasRenderingContext2D, img: HTMLImageElement, hexes: readonly Axial[]): void {
  const w = HEX_SIZE * 2;
  const h = HEX_SIZE * Math.sqrt(3);
  ctx.imageSmoothingEnabled = false;
  for (const hex of hexes) {
    const c = hexToPixel(hex, HEX_SIZE);
    ctx.drawImage(img, c.x - w / 2, c.y - h / 2, w, h);
  }
  ctx.imageSmoothingEnabled = true;
}

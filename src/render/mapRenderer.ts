/**
 * Disegno imperativo della mappa su Canvas 2D. Nessuna dipendenza da React:
 * il componente MapCanvas passa lo stato con `update()` e il renderer ridisegna
 * al prossimo animation frame, solo se qualcosa è cambiato.
 */
import { type Axial, axialToOffset, hexCorners, hexKey, hexToPixel } from '../core/hex';
import { type MapData, mapHexes } from '../core/map';
import { type Side, type Unit, type UnitTypeTable, hasActed, isAlive } from '../core/units';
import { type Bounds, Camera, HEX_SIZE, type Viewport } from './camera';
import { getSymbolRaster } from './symbols';
import { MAP_THEME } from './theme';

export interface RenderInput {
  readonly map: MapData;
  readonly unitTypes: UnitTypeTable;
  readonly units: readonly Unit[];
  /** Controllo attuale degli obiettivi, per id. */
  readonly objectives: Readonly<Record<string, Side>>;
  readonly hovered: Axial | null;
  readonly selectedUnitId: string | null;
  readonly showCoords: boolean;
}

function tracePolygon(ctx: CanvasRenderingContext2D | Path2D, h: Axial, size = HEX_SIZE): void {
  const corners = hexCorners(h, size);
  const first = corners[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < corners.length; i++) {
    const c = corners[i];
    if (c) ctx.lineTo(c.x, c.y);
  }
  ctx.closePath();
}

/** Esagono rimpicciolito attorno al proprio centro (per bordi interni). */
function insetHexPath(h: Axial, inset: number): Path2D {
  const c = hexToPixel(h, HEX_SIZE);
  const p = new Path2D();
  const corners = hexCorners(h, HEX_SIZE);
  corners.forEach((v, i) => {
    const x = c.x + (v.x - c.x) * inset;
    const y = c.y + (v.y - c.y) * inset;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  });
  p.closePath();
  return p;
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
  private bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponibile');
    this.ctx = ctx;
  }

  get currentViewport(): Viewport {
    return this.viewport;
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
    if (input.map !== this.cachedMap) this.rebuildGeometry(input.map);
    this.input = input;
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
    for (const h of mapHexes(map)) {
      const terrain = map.hexes[hexKey(h)]?.terrain ?? 'clear';
      let path = this.terrainPaths.get(terrain);
      if (!path) {
        path = new Path2D();
        this.terrainPaths.set(terrain, path);
      }
      tracePolygon(path, h);
      tracePolygon(this.gridPath, h);
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

    // Bordo esterno: tratto spesso sotto i riempimenti, ne resta visibile solo la metà esterna.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = MAP_THEME.mapBorder;
    ctx.lineWidth = 4 / s;
    ctx.stroke(this.gridPath);

    for (const [terrain, path] of this.terrainPaths) {
      ctx.fillStyle = MAP_THEME.terrain[terrain] ?? MAP_THEME.terrainFallback;
      ctx.fill(path);
    }

    ctx.strokeStyle = MAP_THEME.gridLine;
    ctx.lineWidth = 1 / s;
    ctx.stroke(this.gridPath);

    this.drawObjectives(input);
    if (input.showCoords) this.drawCoords(input.map);

    if (input.hovered && input.map.hexes[hexKey(input.hovered)]) {
      const p = new Path2D();
      tracePolygon(p, input.hovered);
      ctx.fillStyle = MAP_THEME.hoverFill;
      ctx.fill(p);
      ctx.strokeStyle = MAP_THEME.hoverStroke;
      ctx.lineWidth = 2 / s;
      ctx.stroke(p);
    }

    const selected = input.units.find((u) => u.id === input.selectedUnitId && isAlive(u));
    if (selected) {
      ctx.strokeStyle = MAP_THEME.selectedStroke;
      ctx.lineWidth = 3.5;
      ctx.stroke(insetHexPath(selected.pos, 0.9));
    }

    // Etichette sotto le pedine: le unità devono restare sempre leggibili.
    this.drawLabels(input.map);
    for (const u of input.units) if (isAlive(u)) this.drawUnit(input, u);
  }

  /** Obiettivi: tinta e bordo interno del colore di chi li controlla, valore in punti. */
  private drawObjectives(input: RenderInput): void {
    const { ctx } = this;
    for (const o of input.map.objectives) {
      const owner = input.objectives[o.id];
      const colors = owner ? MAP_THEME.side[owner] : null;
      const inner = insetHexPath(o.pos, 0.86);
      ctx.fillStyle = colors?.tint ?? 'rgba(0,0,0,0.06)';
      ctx.fill(inner);
      ctx.strokeStyle = colors?.solid ?? '#555';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke(inner);
      ctx.setLineDash([]);
    }
  }

  /** Nomi di località (obiettivi ed etichette), sopra l'esagono con un alone chiaro. */
  private drawLabels(map: MapData): void {
    const { ctx } = this;
    const names = new Map<string, { h: Axial; text: string; bold: boolean }>();
    for (const h of mapHexes(map)) {
      const label = map.hexes[hexKey(h)]?.label;
      if (label) names.set(hexKey(h), { h, text: label, bold: false });
    }
    // Obiettivi: nome e valore in punti come stelle.
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

  private drawUnit(input: RenderInput, u: Unit): void {
    const type = input.unitTypes[u.typeId];
    if (!type) return;
    const { ctx, dpr, camera } = this;
    const c = hexToPixel(u.pos, HEX_SIZE);

    ctx.save();
    if (hasActed(u)) ctx.globalAlpha = 0.45;

    const raster = getSymbolRaster(type, u.side, camera.scale * dpr);
    const k = 1 / raster.pixelsPerUnit;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      raster.canvas,
      c.x - raster.anchorX * k,
      c.y - raster.anchorY * k + 2,
      raster.canvas.width * k,
      raster.canvas.height * k,
    );

    // Forza attuale: riquadro in basso a destra.
    const bx = c.x + HEX_SIZE * 0.3;
    const by = c.y + HEX_SIZE * 0.38;
    const bw = 13;
    const bh = 11;
    ctx.fillStyle = MAP_THEME.strengthBox.fill;
    ctx.strokeStyle = MAP_THEME.strengthBox.stroke;
    ctx.lineWidth = 1;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = MAP_THEME.strengthBox.text;
    ctx.font = `bold 9px ${MAP_THEME.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(u.strength), bx + bw / 2, by + bh / 2 + 0.5);

    // Fuori rifornimento: triangolo di avviso in basso a sinistra.
    if (u.outOfSupplyTurns > 0) {
      const wx = c.x - HEX_SIZE * 0.5;
      const wy = c.y + HEX_SIZE * 0.38;
      ctx.beginPath();
      ctx.moveTo(wx + 6.5, wy);
      ctx.lineTo(wx + 13, wy + 11);
      ctx.lineTo(wx, wy + 11);
      ctx.closePath();
      ctx.fillStyle = MAP_THEME.warning.fill;
      ctx.fill();
      ctx.strokeStyle = MAP_THEME.warning.stroke;
      ctx.stroke();
      ctx.fillStyle = MAP_THEME.warning.text;
      ctx.font = `bold 8px ${MAP_THEME.font}`;
      ctx.fillText('!', wx + 6.5, wy + 7);
    }
    ctx.restore();
  }

  private drawCoords(map: MapData): void {
    const { ctx } = this;
    ctx.fillStyle = MAP_THEME.coordText;
    ctx.font = `8px ${MAP_THEME.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const h of mapHexes(map)) {
      const c = hexToPixel(h, HEX_SIZE);
      const { col, row } = axialToOffset(h);
      ctx.fillText(
        `${String(col).padStart(2, '0')}${String(row).padStart(2, '0')}`,
        c.x,
        c.y + HEX_SIZE * 0.84,
      );
    }
  }
}

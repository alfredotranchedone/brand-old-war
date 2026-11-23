import { type Axial, hexToPixel } from '../core/hex';
import { type MapData, ROUTE_KINDS, type Route, type RouteKind, type TerrainTable, terrainAt } from '../core/map';
import { HEX_SIZE } from './camera';
import { MAP_THEME } from './theme';

export interface RouteGeometry {
  readonly lines: Readonly<Record<RouteKind, Path2D>>;
  /** Tratti di strada o ferrovia sopra esagoni invalicabili. */
  readonly bridges: Path2D;
}

type Point = { x: number; y: number };

const center = (h: Axial) => hexToPixel(h, HEX_SIZE);
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Punti di giunzione: i punti medi dei lati condivisi, così le vie lungo una riga restano dritte
 * nonostante le colonne sfalsate. Gli estremi prolungano il primo e l'ultimo tratto di mezzo esagono.
 * Il tratto dentro l'esagono i va dal punto i al punto i+1.
 */
function routePoints(route: Route): Point[] {
  const mids = route.slice(1).map((h, i) => lerp(center(route[i]!), center(h), 0.5));
  if (mids.length < 2) return [center(route[0]!), ...mids, center(route.at(-1)!)];
  return [lerp(mids[0]!, mids[1]!, -0.5), ...mids, lerp(mids.at(-1)!, mids.at(-2)!, -0.5)];
}

export function buildRouteGeometry(map: MapData, terrain: TerrainTable): RouteGeometry {
  const bridges = new Path2D();
  const lines = {} as Record<RouteKind, Path2D>;
  for (const kind of ROUTE_KINDS) {
    const path = new Path2D();
    for (const route of map.routes[kind]) {
      const pts = routePoints(route);
      pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
      route.forEach((h, i) => {
        if (!terrainAt(map, terrain, h).impassable) return;
        bridges.moveTo(pts[i]!.x, pts[i]!.y);
        bridges.lineTo(pts[i + 1]!.x, pts[i + 1]!.y);
      });
    }
    lines[kind] = path;
  }
  return { lines, bridges };
}

function stroke(ctx: CanvasRenderingContext2D, path: Path2D, color: string, width: number, dash: readonly number[] = []): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke(path);
}

export function drawRoutes(ctx: CanvasRenderingContext2D, g: RouteGeometry): void {
  const t = MAP_THEME.routes;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  stroke(ctx, g.bridges, t.bridge.edge, 13);
  stroke(ctx, g.bridges, t.bridge.deck, 10);
  stroke(ctx, g.lines.road, t.road.edge, 5);
  stroke(ctx, g.lines.road, t.road.fill, 3);
  stroke(ctx, g.lines.rail, t.rail.edge, 4);
  stroke(ctx, g.lines.rail, t.rail.fill, 2, [6, 6]);
  ctx.setLineDash([]);
}

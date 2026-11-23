import { type Axial, type HexKey, hexKey } from './hex';
import { type MapData, ROUTE_KINDS, type RouteKind, type TerrainTable, isOnMap, isPassable } from './map';

export interface RouteLink {
  readonly to: Axial;
  readonly kind: RouteKind;
}

export type RouteLinks = ReadonlyMap<HexKey, readonly RouteLink[]>;

const cache = new WeakMap<MapData, RouteLinks>();

/** Collegamenti di strade e ferrovie tra esagoni adiacenti, in entrambi i versi (calcolati una volta per mappa). */
export function routeLinks(map: MapData): RouteLinks {
  let links = cache.get(map);
  if (links) return links;
  const out = new Map<HexKey, RouteLink[]>();
  const add = (from: Axial, to: Axial, kind: RouteKind) => {
    const key = hexKey(from);
    const list = out.get(key);
    if (list) list.push({ to, kind });
    else out.set(key, [{ to, kind }]);
  };
  for (const kind of ROUTE_KINDS) {
    for (const route of map.routes[kind]) {
      for (let i = 1; i < route.length; i++) {
        add(route[i - 1]!, route[i]!, kind);
        add(route[i]!, route[i - 1]!, kind);
      }
    }
  }
  links = out;
  cache.set(map, links);
  return links;
}

function isLinked(map: MapData, a: Axial, b: Axial): boolean {
  return (routeLinks(map).get(hexKey(a)) ?? []).some((l) => l.to.q === b.q && l.to.r === b.r);
}

/** Esagono dove un'unità terrestre può stare: attraversabile, o invalicabile ma con una via (ponte). */
export function canStand(map: MapData, terrain: TerrainTable, h: Axial): boolean {
  return isPassable(map, terrain, h) || (isOnMap(map, h) && routeLinks(map).has(hexKey(h)));
}

/** Passo terrestre tra esagoni adiacenti: sui ponti si entra e si esce solo lungo la via. */
export function canStep(map: MapData, terrain: TerrainTable, from: Axial, to: Axial): boolean {
  if (isPassable(map, terrain, from) && isPassable(map, terrain, to)) return true;
  return isOnMap(map, to) && isLinked(map, from, to);
}

/** Modifica di strade e ferrovie nel documento dell'editor. */
import { axialToOffset, hexLine, offsetToAxial } from '../core/hex';
import type { RouteKind } from '../core/map';
import type { Placed, ScenarioJson } from './model';

const FIELD = { road: 'roads', rail: 'rails' } as const satisfies Record<RouteKind, keyof ScenarioJson['map']>;

/** Via in disegno: `index` nell'elenco del tipo, oppure solo l'esagono di partenza finché non ne arriva un secondo. */
export type RouteDrawing = { kind: RouteKind; index: number } | { kind: RouteKind; start: Placed };

const same = (a: Placed, b: Placed) => a.col === b.col && a.row === b.row;

function withRoutes(doc: ScenarioJson, kind: RouteKind, routes: Placed[][]): ScenarioJson {
  return { ...doc, map: { ...doc.map, [FIELD[kind]]: routes } };
}

/** Esagoni in linea retta da `a` a `b`, esclusa la partenza. */
function stepsTo(a: Placed, b: Placed): Placed[] {
  return hexLine(offsetToAxial(a), offsetToAxial(b)).slice(1).map(axialToOffset);
}

/**
 * Inizia a disegnare: se l'esagono è l'estremo di una sola via del tipo, la prolunga
 * (girandola perché finisca lì), altrimenti parte un segmento nuovo.
 */
export function startRoute(doc: ScenarioJson, kind: RouteKind, at: Placed): { doc: ScenarioJson; drawing: RouteDrawing } {
  const routes = doc.map[FIELD[kind]];
  const ends = routes.flatMap((r, i) => [same(r[0]!, at) ? { i, reverse: true } : [], same(r.at(-1)!, at) ? { i, reverse: false } : []].flat());
  if (ends.length !== 1) return { doc, drawing: { kind, start: at } };
  const { i, reverse } = ends[0]!;
  if (!reverse) return { doc, drawing: { kind, index: i } };
  const next = routes.map((r, j) => (j === i ? [...r].reverse() : r));
  return { doc: withRoutes(doc, kind, next), drawing: { kind, index: i } };
}

/** Prolunga la via in disegno fino all'esagono; tornare sull'esagono precedente toglie l'ultimo. */
export function extendRoute(doc: ScenarioJson, d: RouteDrawing, to: Placed): { doc: ScenarioJson; drawing: RouteDrawing } {
  const routes = doc.map[FIELD[d.kind]];
  if ('start' in d) {
    if (same(d.start, to)) return { doc, drawing: d };
    const route = [d.start, ...stepsTo(d.start, to)];
    return { doc: withRoutes(doc, d.kind, [...routes, route]), drawing: { kind: d.kind, index: routes.length } };
  }
  const route = routes[d.index]!;
  const end = route.at(-1)!;
  if (same(end, to)) return { doc, drawing: d };
  const prev = route.at(-2);
  const next = prev && same(prev, to) ? route.slice(0, -1) : [...route, ...stepsTo(end, to)];
  if (next.length < 2) return { doc: withRoutes(doc, d.kind, routes.filter((_, j) => j !== d.index)), drawing: { kind: d.kind, start: next[0]! } };
  return { doc: withRoutes(doc, d.kind, routes.map((r, j) => (j === d.index ? next : r))), drawing: d };
}

/** Spezza le vie dove `keep` è falso, tenendo i tratti di almeno due esagoni. */
export function clipRoutes(routes: Placed[][], keep: (o: Placed) => boolean): Placed[][] {
  return routes.flatMap((r) => {
    const parts: Placed[][] = [[]];
    for (const h of r) {
      if (keep(h)) parts.at(-1)!.push(h);
      else if (parts.at(-1)!.length > 0) parts.push([]);
    }
    return parts.filter((p) => p.length >= 2);
  });
}

/** Toglie l'esagono dalle vie del tipo, spezzandole. */
export function eraseRouteAt(doc: ScenarioJson, kind: RouteKind, at: Placed): ScenarioJson {
  const routes = doc.map[FIELD[kind]];
  if (!routes.some((r) => r.some((h) => same(h, at)))) return doc;
  return withRoutes(doc, kind, clipRoutes(routes, (h) => !same(h, at)));
}

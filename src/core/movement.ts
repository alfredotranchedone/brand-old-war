import { type GameData, getUnitType } from './data';
import type { GameEvent } from './events';
import { aaFire } from './air';
import { type GameState, airUnitAt, currentConditions, getUnit, groundUnitAt } from './game';
import { type Axial, type HexKey, hexKey, hexNeighbors } from './hex';
import { isOnMap, terrainAt } from './map';
import { canStep } from './routes';
import { type Unit, type UnitType, hasTag, isAirType, isAlive } from './units';
import { enemyZocOf } from './zoc';

const EPS = 1e-9;

export interface ReachNode {
  readonly pos: Axial;
  readonly cost: number;
  readonly prev: HexKey | null;
  /** True se qui l'unità può terminare il movimento (esagono libero). */
  readonly canStop: boolean;
}

export interface Reach {
  readonly unitId: string;
  readonly origin: Axial;
  readonly nodes: ReadonlyMap<HexKey, ReachNode>;
}

export function enterCost(state: GameState, data: GameData, type: UnitType, h: Axial): number {
  if (type.mobility === 'air') return 1;
  const terrain = terrainAt(state.map, data.terrain, h);
  const weather = data.weather[currentConditions(state).weather];
  return terrain.moveCost[type.mobility] * (weather?.moveCostMod[type.mobility] ?? 1);
}

export function ignoresZoc(type: UnitType): boolean {
  return isAirType(type) || hasTag(type, 'recon') || hasTag(type, 'infiltrator');
}

export type MoveCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export function canUnitMove(state: GameState, unit: Unit | undefined): MoveCheck {
  if (!unit || !isAlive(unit)) return { ok: false, reason: 'Unità inesistente' };
  if (state.result) return { ok: false, reason: 'Partita conclusa' };
  if (unit.side !== state.activeSide) return { ok: false, reason: 'Non è il turno di questa fazione' };
  if (unit.hasAttacked) return { ok: false, reason: "L'unità ha già attaccato" };
  if (unit.movesLeft <= EPS) return { ok: false, reason: 'Punti movimento esauriti' };
  return { ok: true };
}

/** Calcola gli esagoni raggiungibili usando l'algoritmo di Dijkstra, rispettando ZOC e ostacoli. */
export function computeReach(state: GameState, data: GameData, unitId: string): Reach | null {
  const unit = getUnit(state, unitId);
  if (!unit || !canUnitMove(state, unit).ok) return null;
  const type = getUnitType(data, unit.typeId);
  const zoc = ignoresZoc(type) ? new Set<HexKey>() : enemyZocOf(state, data, unit.side);
  const air = isAirType(type);
  const originKey = hexKey(unit.pos);
  const startsInZoc = zoc.has(originKey);

  const nodes = new Map<HexKey, ReachNode>();
  nodes.set(originKey, { pos: unit.pos, cost: 0, prev: null, canStop: false });
  const open: HexKey[] = [originKey];
  const done = new Set<HexKey>();

  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (nodes.get(open[i]!)!.cost < nodes.get(open[bestIdx]!)!.cost - EPS) bestIdx = i;
    }
    const key = open.splice(bestIdx, 1)[0]!;
    if (done.has(key)) continue;
    done.add(key);
    const node = nodes.get(key)!;
    const isOrigin = key === originKey;
    if (!isOrigin && zoc.has(key)) continue;

    for (const n of hexNeighbors(node.pos)) {
      if (air ? !isOnMap(state.map, n) : !canStep(state.map, data.terrain, node.pos, n)) continue;
      const nKey = hexKey(n);
      if (done.has(nKey)) continue;
      const ground = groundUnitAt(state, data, n);
      const above = airUnitAt(state, data, n);
      if (above && above.side !== unit.side) continue;
      // Elicotteri solo sopra amici; i droni possono sorvolare il nemico.
      if (ground && ground.side !== unit.side && !(air && hasTag(type, 'uav'))) continue;
      const occupant = air ? above : ground;
      if (isOrigin && startsInZoc && zoc.has(nKey)) continue;
      if (occupant && zoc.has(nKey)) continue;
      const cost = node.cost + enterCost(state, data, type, n);
      if (cost > unit.movesLeft + EPS) continue;
      const prev = nodes.get(nKey);
      if (prev && prev.cost <= cost + EPS) continue;
      nodes.set(nKey, { pos: n, cost, prev: key, canStop: !occupant });
      open.push(nKey);
    }
  }
  return { unitId, origin: unit.pos, nodes };
}

export function reachableHexes(reach: Reach): Axial[] {
  return [...reach.nodes.values()].filter((n) => n.canStop).map((n) => n.pos);
}

export function isReachable(reach: Reach, to: Axial): boolean {
  return reach.nodes.get(hexKey(to))?.canStop === true;
}

/** Percorso dall'origine a `to`, estremi inclusi. */
export function pathTo(reach: Reach, to: Axial): Axial[] | null {
  if (!isReachable(reach, to)) return null;
  const path: Axial[] = [];
  let key: HexKey | null = hexKey(to);
  while (key) {
    const node: ReachNode | undefined = reach.nodes.get(key);
    if (!node) return null;
    path.unshift(node.pos);
    key = node.prev;
  }
  return path;
}

export interface MoveOutcome {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function applyMove(state: GameState, data: GameData, unitId: string, to: Axial): MoveOutcome | string {
  const unit = getUnit(state, unitId);
  const check = canUnitMove(state, unit);
  if (!check.ok) return check.reason;
  const reach = computeReach(state, data, unitId);
  const path = reach && pathTo(reach, to);
  if (!unit || !reach || !path) return 'Esagono non raggiungibile';

  const type = getUnitType(data, unit.typeId);
  const cost = reach.nodes.get(hexKey(to))!.cost;
  const endsInZoc = !ignoresZoc(type) && enemyZocOf(state, data, unit.side).has(hexKey(to));
  const moved: Unit = {
    ...unit,
    pos: to,
    movesLeft: endsInZoc ? 0 : Math.max(0, unit.movesLeft - cost),
    hasMoved: true,
    entrenched: false,
  };
  const event: GameEvent = { kind: 'move', unitId, path, cost };
  const after: GameState = { ...state, units: state.units.map((u) => (u.id === unitId ? moved : u)), log: [...state.log, event] };
  // Un'unità aerea che si ferma in una bolla AA nemica subisce il fuoco preventivo.
  const fire = isAirType(type) ? aaFire(after, data, unitId) : null;
  return fire ? { state: fire.state, events: [event, fire.event] } : { state: after, events: [event] };
}

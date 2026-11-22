import type { GameData } from './data';
import { type GameState, currentConditions, groundUnitAt } from './game';
import { type Axial, type HexKey, hexKey, hexNeighbors, parseHexKey } from './hex';
import { isPassable, terrainAt } from './map';
import type { Side, Unit } from './units';
import { enemyZocOf } from './zoc';

const EPS = 1e-9;
const SUPPLY_MOBILITY = 'wheeled';

export interface SupplyNetwork {
  readonly side: Side;
  /** Costo minimo dalla sorgente più vicina, per esagono raggiunto. */
  readonly cost: ReadonlyMap<HexKey, number>;
}

function supplyCost(state: GameState, data: GameData, h: Axial): number {
  const weather = data.weather[currentConditions(state).weather];
  return terrainAt(state.map, data.terrain, h).moveCost[SUPPLY_MOBILITY] * (weather?.moveCostMod[SUPPLY_MOBILITY] ?? 1);
}

/** Esagoni collegati a una sorgente amica senza passare per unità nemiche o ZOC nemica non presidiata. */
export function supplyNetwork(state: GameState, data: GameData, side: Side): SupplyNetwork {
  const weather = data.weather[currentConditions(state).weather];
  const maxCost = data.rules.supply.maxPathCost * (weather?.supplyRangeMod ?? 1);
  const zoc = enemyZocOf(state, data, side);
  const passable = (h: Axial) => {
    if (!isPassable(state.map, data.terrain, h)) return false;
    const occupant = groundUnitAt(state, data, h);
    if (occupant) return occupant.side === side;
    return !zoc.has(hexKey(h));
  };

  const cost = new Map<HexKey, number>();
  const open: { pos: Axial; cost: number }[] = [];
  for (const key of state.map.supplySources[side]) {
    const pos = parseHexKey(key);
    if (!passable(pos)) continue;
    cost.set(key, 0);
    open.push({ pos, cost: 0 });
  }

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i]!.cost < open[best]!.cost) best = i;
    const node = open.splice(best, 1)[0]!;
    if (node.cost > (cost.get(hexKey(node.pos)) ?? Infinity) + EPS) continue;
    for (const n of hexNeighbors(node.pos)) {
      if (!passable(n)) continue;
      const c = node.cost + supplyCost(state, data, n);
      const key = hexKey(n);
      if (c > maxCost + EPS || c >= (cost.get(key) ?? Infinity) - EPS) continue;
      cost.set(key, c);
      open.push({ pos: n, cost: c });
    }
  }
  return { side, cost };
}

export function isInSupply(network: SupplyNetwork, unit: Unit): boolean {
  return network.cost.has(hexKey(unit.pos));
}

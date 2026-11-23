import { cheapestCosts, type Steps } from './cheapest';
import { depotsOf } from './control';
import { type GameData, getUnitType } from './data';
import { type GameState, currentConditions, groundUnitAt } from './game';
import { type Axial, type HexKey, hexKey, hexNeighbors, parseHexKey } from './hex';
import { terrainAt } from './map';
import { canStep, routeLinks } from './routes';
import { type Side, type Unit, isAirType, isAlive } from './units';
import { enemyZocOf } from './zoc';

const SUPPLY_MOBILITY = 'wheeled';

export interface SupplyNetwork {
  readonly side: Side;
  /** Esagoni riforniti: dorsale, ultimo miglio e raggio degli HQ collegati. */
  readonly hexes: ReadonlySet<HexKey>;
  /** Esagoni di strada o ferrovia collegati a un deposito. */
  readonly trunk: ReadonlySet<HexKey>;
}

/** Esagono attraversabile dai rifornimenti: niente nemici e niente ZOC nemica, salvo presidio amico. */
function openTo(state: GameState, data: GameData, side: Side): (h: Axial) => boolean {
  const zoc = enemyZocOf(state, data, side);
  return (h) => {
    const occupant = groundUnitAt(state, data, h);
    return occupant ? occupant.side === side : !zoc.has(hexKey(h));
  };
}

/**
 * Esagoni riforniti della fazione:
 * 1. dorsale: dai depositi lungo strade (portata limitata) e ferrovie (illimitate);
 * 2. ultimo miglio: dalla dorsale, a costo di movimento su ruote;
 * 3. HQ riforniti: dal proprio esagono, a costo di movimento (non si concatenano).
 */
export function supplyNetwork(state: GameState, data: GameData, side: Side): SupplyNetwork {
  const rules = data.rules.supply;
  const weather = data.weather[currentConditions(state).weather];
  const rangeMod = weather?.supplyRangeMod ?? 1;
  const costMod = weather?.moveCostMod[SUPPLY_MOBILITY] ?? 1;
  const open = openTo(state, data, side);
  const links = routeLinks(state.map);

  const alongRoutes: Steps = function* (from) {
    for (const l of links.get(hexKey(from)) ?? []) {
      if (open(l.to)) yield [l.to, l.kind === 'rail' ? 0 : 1];
    }
  };
  const offRoad: Steps = function* (from) {
    for (const n of hexNeighbors(from)) {
      if (!canStep(state.map, data.terrain, from, n) || !open(n)) continue;
      yield [n, terrainAt(state.map, data.terrain, n).moveCost[SUPPLY_MOBILITY] * costMod];
    }
  };

  const depots = depotsOf(state, side).map((d) => d.pos).filter(open);
  const trunk = cheapestCosts(depots, rules.roadRange * rangeMod, alongRoutes);
  const base = cheapestCosts([...trunk.keys()].map(parseHexKey), rules.offRoadRange * rangeMod, offRoad);
  const hexes = new Set(base.keys());

  for (const u of supplyHeads(state, data, side)) {
    if (!base.has(hexKey(u.pos))) continue;
    const range = getUnitType(data, u.typeId).supplyRange * rangeMod;
    for (const k of cheapestCosts([u.pos], range, offRoad).keys()) hexes.add(k);
  }
  return { side, hexes, trunk: new Set(trunk.keys()) };
}

function supplyHeads(state: GameState, data: GameData, side: Side): Unit[] {
  return state.units.filter((u) => {
    if (u.side !== side || !isAlive(u)) return false;
    const type = getUnitType(data, u.typeId);
    return type.supplyRange > 0 && !isAirType(type);
  });
}

export function isInSupply(network: SupplyNetwork, unit: Unit): boolean {
  return network.hexes.has(hexKey(unit.pos));
}

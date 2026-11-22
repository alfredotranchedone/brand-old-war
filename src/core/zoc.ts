import type { GameData } from './data';
import { getUnitType } from './data';
import type { GameState } from './game';
import { type HexKey, hexKey, hexNeighbors } from './hex';
import { isOnMap } from './map';
import { type Side, type Unit, hasTag, isAlive, otherSide } from './units';

export function exertsZoc(data: GameData, unit: Unit): boolean {
  if (!isAlive(unit) || unit.strength < data.rules.zoc.minStrength) return false;
  const type = getUnitType(data, unit.typeId);
  if (data.rules.zoc.artilleryZocOnlyIfNotFired && hasTag(type, 'artillery') && unit.hasAttacked) return false;
  return true;
}

/** Esagoni sotto la ZOC esercitata dalle unità di `side`. */
export function zocOf(state: GameState, data: GameData, side: Side): Set<HexKey> {
  const out = new Set<HexKey>();
  for (const u of state.units) {
    if (u.side !== side || !exertsZoc(data, u)) continue;
    for (const n of hexNeighbors(u.pos)) if (isOnMap(state.map, n)) out.add(hexKey(n));
  }
  return out;
}

export function enemyZocOf(state: GameState, data: GameData, side: Side): Set<HexKey> {
  return zocOf(state, data, otherSide(side));
}

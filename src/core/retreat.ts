import { depotsOf } from './control';
import type { GameData } from './data';
import { type GameState, airUnitAt, groundUnitAt } from './game';
import { type Axial, hexDistance, hexKey, hexNeighbors } from './hex';
import { canStep } from './routes';
import type { Unit } from './units';
import { enemyZocOf } from './zoc';

function distanceToSupply(state: GameState, unit: Unit, h: Axial): number {
  let best = Infinity;
  for (const d of depotsOf(state, unit.side)) best = Math.min(best, hexDistance(h, d.pos));
  return best;
}

/**
 * Esagono di ritirata: adiacente, libero, fuori dalla ZOC nemica e più lontano dall'attaccante.
 * A parità, il più vicino a un deposito amico, poi il più lontano dall'attaccante.
 */
export function findRetreatHex(state: GameState, data: GameData, defender: Unit, attacker: Unit): Axial | null {
  const zoc = enemyZocOf(state, data, defender.side);
  const current = hexDistance(defender.pos, attacker.pos);
  const candidates = hexNeighbors(defender.pos).filter(
    (h) =>
      canStep(state.map, data.terrain, defender.pos, h) &&
      !groundUnitAt(state, data, h) &&
      airUnitAt(state, data, h)?.side !== attacker.side &&
      !zoc.has(hexKey(h)) &&
      hexDistance(h, attacker.pos) > current,
  );
  let best: Axial | null = null;
  let bestScore: [number, number] = [Infinity, -Infinity];
  for (const h of candidates) {
    const score: [number, number] = [distanceToSupply(state, defender, h), hexDistance(h, attacker.pos)];
    if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) {
      best = h;
      bestScore = score;
    }
  }
  return best;
}

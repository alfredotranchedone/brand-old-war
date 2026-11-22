import type { Action } from '../core/actions';
import type { GameData } from '../core/data';
import { type GameState, getUnit, liveUnits } from '../core/game';
import { type Axial, hexEquals } from '../core/hex';
import { objectiveAt } from '../core/map';
import { canUnitMove, computeReach, reachableHexes } from '../core/movement';
import type { Side } from '../core/units';
import { positionScore, scoreContext } from './positionScore';

const EPS = 1e-6;

/** Muove la prima unità disponibile verso una posizione migliore (in ordine di id). */
export function chooseMove(state: GameState, data: GameData, side: Side): Action | null {
  const units = liveUnits(state, side)
    .filter((u) => !u.hasMoved && !u.hasAttacked && canUnitMove(state, u).ok)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const u of units) {
    const reach = computeReach(state, data, u.id);
    if (!reach) continue;
    const ctx = scoreContext(state, data, u);
    let bestHex: Axial = u.pos;
    let bestScore = positionScore(ctx, u.pos);
    for (const h of reachableHexes(reach)) {
      const s = positionScore(ctx, h);
      if (s > bestScore + EPS) {
        bestScore = s;
        bestHex = h;
      }
    }
    if (!hexEquals(bestHex, u.pos)) return { kind: 'move', unitId: u.id, to: bestHex };
  }
  return null;
}

/** Dopo un combattimento, avanza sempre su un obiettivo, altrimenti solo se migliora la posizione. */
export function chooseAdvance(state: GameState, data: GameData, side: Side): Action | null {
  const p = state.pendingAdvance;
  const u = p && getUnit(state, p.unitId);
  if (!p || !u || u.side !== side) return null;
  const advance: Action = { kind: 'advance', unitId: u.id, to: p.to };
  if (objectiveAt(state.map, p.to)) return advance;
  const ctx = scoreContext(state, data, u);
  return positionScore(ctx, p.to) > positionScore(ctx, u.pos) + EPS ? advance : null;
}

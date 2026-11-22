import { attackableTargets } from './combat';
import type { GameData } from './data';
import { type GameState, liveUnits } from './game';
import { computeReach, reachableHexes } from './movement';

export function hasActionsLeft(state: GameState, data: GameData, unitId: string): boolean {
  const reach = computeReach(state, data, unitId);
  if (reach && reachableHexes(reach).length > 0) return true;
  return attackableTargets(state, data, unitId).length > 0;
}

/** Ritorna le unità della fazione attiva che non hanno più azioni disponibili. */
export function spentUnits(state: GameState, data: GameData): Set<string> {
  const out = new Set<string>();
  for (const u of liveUnits(state, state.activeSide)) if (!hasActionsLeft(state, data, u.id)) out.add(u.id);
  return out;
}

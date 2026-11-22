import type { GameData } from './data';
import { type GameState, groundUnitAt } from './game';
import type { Side } from './units';

/** Un obiettivo passa alla fazione dell'unità terrestre che lo occupa. */
export function claimObjectives(state: GameState, data: GameData): GameState {
  let objectives: Record<string, Side> | null = null;
  for (const o of state.map.objectives) {
    const side = groundUnitAt(state, data, o.pos)?.side;
    if (!side || state.objectives[o.id] === side) continue;
    objectives ??= { ...state.objectives };
    objectives[o.id] = side;
  }
  return objectives ? { ...state, objectives } : state;
}

export function objectivesHeld(state: GameState, side: Side): string[] {
  return state.map.objectives.filter((o) => state.objectives[o.id] === side).map((o) => o.id);
}

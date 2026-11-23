import type { GameState } from './game';
import type { Side } from './units';

export function objectivesHeld(state: GameState, side: Side): string[] {
  return state.map.objectives.filter((o) => state.objectives[o.id] === side).map((o) => o.id);
}

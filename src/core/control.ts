import type { GameData } from './data';
import { type GameState, groundUnitAt } from './game';
import type { Axial } from './hex';
import type { Depot } from './map';
import type { Side } from './units';

type Owners = Readonly<Record<string, Side>>;

/** Nuovi proprietari dei punti occupati da unità terrestri; null se nulla cambia. */
function claim(state: GameState, data: GameData, points: readonly { id: string; pos: Axial }[], owners: Owners): Owners | null {
  let next: Record<string, Side> | null = null;
  for (const p of points) {
    const side = groundUnitAt(state, data, p.pos)?.side;
    if (!side || owners[p.id] === side) continue;
    next ??= { ...owners };
    next[p.id] = side;
  }
  return next;
}

/** Obiettivi e depositi passano alla fazione dell'unità terrestre che li occupa. */
export function claimControl(state: GameState, data: GameData): GameState {
  const objectives = claim(state, data, state.map.objectives, state.objectives);
  const depots = claim(state, data, state.map.depots, state.depots);
  if (!objectives && !depots) return state;
  return { ...state, objectives: objectives ?? state.objectives, depots: depots ?? state.depots };
}

export function depotsOf(state: GameState, side: Side): Depot[] {
  return state.map.depots.filter((d) => state.depots[d.id] === side);
}

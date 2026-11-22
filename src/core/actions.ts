import type { GameData } from './data';
import type { GameEvent } from './events';
import type { GameState } from './game';
import type { Axial } from './hex';
import { applyMove } from './movement';

export type Action =
  | { readonly kind: 'move'; readonly unitId: string; readonly to: Axial }
  | { readonly kind: 'attack'; readonly unitId: string; readonly targetId: string }
  | { readonly kind: 'advance'; readonly unitId: string; readonly to: Axial }
  | { readonly kind: 'endTurn' };

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: string };

export function applyAction(state: GameState, data: GameData, action: Action): ActionResult {
  switch (action.kind) {
    case 'move': {
      const r = applyMove(state, data, action.unitId, action.to);
      return typeof r === 'string' ? { ok: false, error: r } : { ok: true, ...r };
    }
    case 'attack':
    case 'advance':
    case 'endTurn':
      return { ok: false, error: `Azione "${action.kind}" non ancora disponibile` };
  }
}

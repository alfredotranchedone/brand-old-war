import { resolveAdvance, resolveAttack } from './combat';
import type { GameData } from './data';
import type { GameEvent } from './events';
import type { GameState } from './game';
import type { Axial } from './hex';
import { applyMove } from './movement';
import { claimControl } from './control';
import { endTurn } from './turn';

export type Action =
  | { readonly kind: 'move'; readonly unitId: string; readonly to: Axial }
  | { readonly kind: 'attack'; readonly unitId: string; readonly targetId: string }
  | { readonly kind: 'advance'; readonly unitId: string; readonly to: Axial }
  | { readonly kind: 'endTurn' };

export type ActionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly error: string };

type Outcome = { readonly state: GameState; readonly events: readonly GameEvent[] } | string;

function toResult(r: Outcome): ActionResult {
  return typeof r === 'string' ? { ok: false, error: r } : { ok: true, ...r };
}

export function applyAction(state: GameState, data: GameData, action: Action): ActionResult {
  const result = dispatchAction(state, data, action);
  return result.ok ? { ...result, state: claimControl(result.state, data) } : result;
}

function dispatchAction(state: GameState, data: GameData, action: Action): ActionResult {
  if (action.kind === 'advance') return toResult(resolveAdvance(state, action.unitId, action.to));
  // Qualsiasi altra azione rinuncia all'avanzata in sospeso.
  const base: GameState = state.pendingAdvance ? { ...state, pendingAdvance: undefined } : state;
  switch (action.kind) {
    case 'move':
      return toResult(applyMove(base, data, action.unitId, action.to));
    case 'attack':
      return toResult(resolveAttack(base, data, action.unitId, action.targetId));
    case 'endTurn':
      return toResult(endTurn(base, data));
  }
}

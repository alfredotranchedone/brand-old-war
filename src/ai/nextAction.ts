import { type Action, applyAction } from '../core/actions';
import type { GameData } from '../core/data';
import type { GameState } from '../core/game';
import { chooseArtilleryFire, chooseAttack } from './attacks';
import { chooseAdvance, chooseMove } from './moves';

const MAX_ACTIONS = 200;

/** Prossima azione dell'IA per la fazione attiva; `endTurn` quando non resta nulla da fare. */
export function nextAiAction(state: GameState, data: GameData): Action {
  const side = state.activeSide;
  return (
    chooseAdvance(state, data, side) ??
    chooseArtilleryFire(state, data, side) ??
    chooseAttack(state, data, side) ??
    chooseMove(state, data, side) ?? { kind: 'endTurn' }
  );
}

/** Gioca l'intero turno dell'IA senza animazioni (per simulazioni). */
export function runAiTurn(state: GameState, data: GameData): GameState {
  let s = state;
  for (let i = 0; i < MAX_ACTIONS; i++) {
    const action = nextAiAction(s, data);
    const r = applyAction(s, data, action);
    if (!r.ok) throw new Error(`Azione IA non valida: ${r.error}`);
    s = r.state;
    if (action.kind === 'endTurn') return s;
  }
  throw new Error('Turno IA troppo lungo');
}

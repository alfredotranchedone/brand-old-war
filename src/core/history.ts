import type { Action } from './actions';
import type { GameState } from './game';

/**
 * Pila di annullamento: solo i movimenti si annullano.
 * Un combattimento o la fine del turno svuotano la pila.
 * La pila di ripetizione raccoglie gli stati annullati e si svuota a ogni nuova azione.
 */
export type UndoStack = readonly GameState[];

export function recordAction(stack: UndoStack, before: GameState, action: Action): UndoStack {
  return action.kind === 'move' ? [...stack, before] : [];
}

export function canUndo(stack: UndoStack): boolean {
  return stack.length > 0;
}

export function popState(stack: UndoStack): { state: GameState; stack: UndoStack } | null {
  const state = stack[stack.length - 1];
  return state ? { state, stack: stack.slice(0, -1) } : null;
}

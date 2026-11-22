import { useEffect } from 'react';
import { nextAiAction } from '../ai/nextAction';
import type { GameState } from '../core/game';
import { useUiStore } from './store';

const isAiTurn = (g: GameState) => !g.result && g.activeSide === g.setup.aiSide;

/** Esegue il turno dell'IA un'azione per volta, con una pausa tra le azioni per le animazioni. */
export function useAiTurn(): void {
  useEffect(() => {
    let timer: number | undefined;

    const step = () => {
      timer = undefined;
      const s = useUiStore.getState();
      if (!isAiTurn(s.game)) return;
      if (!s.dispatch(nextAiAction(s.game, s.data))) s.dispatch({ kind: 'endTurn' });
    };

    const schedule = () => {
      const s = useUiStore.getState();
      if (timer === undefined && isAiTurn(s.game)) timer = window.setTimeout(step, s.data.rules.ai.animationMs);
    };

    schedule();
    const unsubscribe = useUiStore.subscribe(schedule);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
}

import { useEffect } from 'react';
import { answerConfirm, useConfirm } from './confirm';
import { requestEndTurn } from './requestEndTurn';
import { useUiStore } from './store';

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (useConfirm.getState().message) {
        if (e.key === 'Escape') answerConfirm(false);
        return;
      }
      const s = useUiStore.getState();
      if (e.key === 'Escape') {
        if (s.preview) s.cancelTarget();
        else s.deselect();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        s.undo();
      } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        s.selectNextUnit();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        requestEndTurn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

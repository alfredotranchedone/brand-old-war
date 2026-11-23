import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { canUndo } from '../core/history';
import { NewGameDialog } from './NewGameDialog';
import { isPlayerTurn, useUiStore } from './store';
import { useDropdown } from './useDropdown';
import styles from './GameMenu.module.css';

export function GameMenu() {
  const { open, setOpen, ref } = useDropdown();
  const [newGame, setNewGame] = useState(false);
  const s = useUiStore(
    useShallow((st) => ({
      undoable: canUndo(st.undoStack) && isPlayerTurn(st.game),
      undo: st.undo,
      redoable: st.redoStack.length > 0 && isPlayerTurn(st.game),
      redo: st.redo,
    })),
  );

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} aria-label="Menu" title="Menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Menu size={18} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button type="button" role="menuitem" className={styles.item} onClick={run(s.undo)} disabled={!s.undoable}>
            Annulla <kbd>Ctrl+Z</kbd>
          </button>
          <button type="button" role="menuitem" className={styles.item} onClick={run(s.redo)} disabled={!s.redoable}>
            Ripeti <kbd>Ctrl+Y</kbd>
          </button>
          <hr />
          <button type="button" role="menuitem" className={styles.item} onClick={run(() => setNewGame(true))}>
            Nuova partita…
          </button>
        </div>
      )}
      {newGame && <NewGameDialog onClose={() => setNewGame(false)} />}
    </div>
  );
}

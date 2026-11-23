import { Redo2, Undo2 } from 'lucide-react';
import { canUndo } from '../core/history';
import { isPlayerTurn, useUiStore } from './store';
import styles from './GameMenu.module.css';

/** Annulla e ripeti l'ultima mossa, come le voci del menu. */
export function UndoButtons() {
  const undoable = useUiStore((s) => canUndo(s.undoStack) && isPlayerTurn(s.game));
  const redoable = useUiStore((s) => s.redoStack.length > 0 && isPlayerTurn(s.game));
  const undo = useUiStore((s) => s.undo);
  const redo = useUiStore((s) => s.redo);
  return (
    <>
      <button type="button" className={styles.trigger} onClick={undo} disabled={!undoable} aria-label="Annulla" title="Annulla (Ctrl+Z)">
        <Undo2 size={18} />
      </button>
      <button type="button" className={styles.trigger} onClick={redo} disabled={!redoable} aria-label="Ripeti" title="Ripeti (Ctrl+Y)">
        <Redo2 size={18} />
      </button>
    </>
  );
}

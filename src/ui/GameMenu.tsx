import { Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { canUndo } from '../core/history';
import { NewGameDialog } from './NewGameDialog';
import { isPlayerTurn, useUiStore } from './store';
import styles from './GameMenu.module.css';

export function GameMenu() {
  const [open, setOpen] = useState(false);
  const [newGame, setNewGame] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = useUiStore(
    useShallow((st) => ({
      undoable: canUndo(st.undoStack) && isPlayerTurn(st.game),
      undo: st.undo,
      showAnimations: st.showAnimations,
      toggleAnimations: st.toggleAnimations,
      showSupply: st.showSupply,
      toggleSupply: st.toggleSupply,
      showZoc: st.showZoc,
      toggleZoc: st.toggleZoc,
      showCoords: st.showCoords,
      toggleCoords: st.toggleCoords,
    })),
  );

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const toggles = [
    ['Animazioni', s.showAnimations, s.toggleAnimations],
    ['Rifornimenti', s.showSupply, s.toggleSupply],
    ['ZOC', s.showZoc, s.toggleZoc],
    ['Coordinate', s.showCoords, s.toggleCoords],
  ] as const;

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
          <hr />
          {toggles.map(([label, on, toggle]) => (
            <label key={label} className={styles.item}>
              <input type="checkbox" checked={on} onChange={toggle} />
              {label}
            </label>
          ))}
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

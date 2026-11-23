import { Eye } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useUiStore } from './store';
import { useDropdown } from './useDropdown';
import styles from './GameMenu.module.css';

/** Menu di visualizzazione: animazioni e sovrapposizioni della mappa. */
export function ViewMenu() {
  const { open, setOpen, ref } = useDropdown();
  const s = useUiStore(
    useShallow((st) => ({
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
  const toggles = [
    ['Animazioni', s.showAnimations, s.toggleAnimations],
    ['Rifornimenti', s.showSupply, s.toggleSupply],
    ['ZOC', s.showZoc, s.toggleZoc],
    ['Coordinate', s.showCoords, s.toggleCoords],
  ] as const;

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.trigger} aria-label="Visualizza" title="Visualizza" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Eye size={18} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          {toggles.map(([label, on, toggle]) => (
            <label key={label} className={styles.item}>
              <input type="checkbox" checked={on} onChange={toggle} />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

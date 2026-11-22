import { useUiStore } from './store';
import styles from './App.module.css';

export function AdvanceHint() {
  const pending = useUiStore((s) => s.game.pendingAdvance);
  const selected = useUiStore((s) => s.selectedUnitId);
  if (!pending || pending.unitId !== selected) return null;
  return (
    <section className={`${styles.card} ${styles.notice}`}>
      Esagono liberato: clic sull'esagono verde per avanzare, qualsiasi altra azione per rinunciare.
    </section>
  );
}

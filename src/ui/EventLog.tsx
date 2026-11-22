import { eventText } from './eventText';
import { useUiStore } from './store';
import styles from './App.module.css';

export function EventLog() {
  const game = useUiStore((s) => s.game);
  const data = useUiStore((s) => s.data);
  const entries = [...game.log].reverse();

  return (
    <section className={`${styles.card} ${styles.log}`}>
      <h2 className={styles.cardTitle}>Registro</h2>
      <ol className={styles.logList}>
        {entries.map((e, i) => (
          <li key={entries.length - i} className={e.kind === 'combat' || e.kind === 'aaFire' ? styles.logCombat : e.kind === 'turnStart' || e.kind === 'turnSummary' ? styles.logTurn : undefined}>
            {eventText(e, game, data)}
          </li>
        ))}
      </ol>
    </section>
  );
}

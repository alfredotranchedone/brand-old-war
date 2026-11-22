import { useState } from 'react';
import { useUiStore } from './store';
import app from './App.module.css';
import dialog from './EndScreen.module.css';
import styles from './NewGameDialog.module.css';

/** Scelta dello scenario per una nuova partita. */
export function NewGameDialog({ onClose }: { onClose: () => void }) {
  const scenarios = useUiStore((s) => s.scenarios);
  const current = useUiStore((s) => s.game.scenarioId);
  const restart = useUiStore((s) => s.restart);
  const [chosen, setChosen] = useState(current);
  const start = () => {
    restart(chosen);
    onClose();
  };

  return (
    <div className={dialog.backdrop} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <section className={`${dialog.dialog} ${styles.dialog}`} role="dialog" aria-modal="true" aria-label="Nuova partita">
        <h2 className={dialog.outcome}>Nuova partita</h2>
        <p className={app.hint}>La partita in corso andrà persa.</p>
        <div className={styles.list} role="radiogroup">
          {scenarios.map((s) => (
            <label key={s.id} className={`${styles.option} ${s.error ? styles.invalid : ''}`}>
              <input type="radio" name="scenario" value={s.id} checked={chosen === s.id} disabled={!!s.error} onChange={() => setChosen(s.id)} />
              <span>
                <strong>{s.name}</strong>
                <span className={styles.desc}>{s.error ?? s.description}</span>
              </span>
            </label>
          ))}
        </div>
        <div className={app.actions}>
          <button type="button" className={`${app.button} ${app.primary}`} onClick={start} autoFocus>
            Inizia
          </button>
          <button type="button" className={app.button} onClick={onClose}>
            Annulla
          </button>
        </div>
      </section>
    </div>
  );
}

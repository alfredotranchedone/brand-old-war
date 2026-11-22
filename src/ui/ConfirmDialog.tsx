import { answerConfirm, useConfirm } from './confirm';
import app from './App.module.css';
import styles from './EndScreen.module.css';

export function ConfirmDialog() {
  const message = useConfirm((s) => s.message);
  if (!message) return null;

  return (
    <div className={styles.backdrop}>
      <section className={styles.dialog} role="alertdialog" aria-label="Conferma">
        <p>{message}</p>
        <div className={app.actions}>
          <button type="button" className={`${app.button} ${app.primary}`} onClick={() => answerConfirm(true)} autoFocus>
            Conferma
          </button>
          <button type="button" className={app.button} onClick={() => answerConfirm(false)}>
            Annulla
          </button>
        </div>
      </section>
    </div>
  );
}

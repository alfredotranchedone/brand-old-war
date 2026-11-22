import { BookOpen } from 'lucide-react';
import styles from './GameMenu.module.css';

const MANUAL_URL = 'https://github.com/alfredotranchedone/brand-old-war/blob/main/docs/manual.md';

/** Apre il manuale del giocatore su GitHub in una nuova scheda. */
export function ManualLink() {
  return (
    <a className={styles.trigger} href={MANUAL_URL} target="_blank" rel="noreferrer" aria-label="Manuale" title="Manuale">
      <BookOpen size={18} />
    </a>
  );
}

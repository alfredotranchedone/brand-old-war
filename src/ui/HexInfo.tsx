import { axialToOffset } from '../core/hex';
import { getHex } from '../core/map';
import { useUiStore } from './store';
import styles from './App.module.css';

/** Informazioni sull'esagono sotto il cursore. */
export function HexInfo() {
  const hovered = useUiStore((s) => s.hovered);
  const map = useUiStore((s) => s.map);

  if (!hovered) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Esagono</h2>
        <p className={styles.muted}>Passa il mouse sulla mappa.</p>
      </section>
    );
  }

  const { col, row } = axialToOffset(hovered);
  const data = getHex(map, hovered);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Esagono</h2>
      <dl className={styles.facts}>
        <dt>Colonna, riga</dt>
        <dd>
          {col}, {row}
        </dd>
        <dt>Assiale (q, r)</dt>
        <dd>
          {hovered.q}, {hovered.r}
        </dd>
        <dt>Terreno</dt>
        <dd>{data?.terrain === 'clear' ? 'Aperto' : (data?.terrain ?? '—')}</dd>
      </dl>
    </section>
  );
}

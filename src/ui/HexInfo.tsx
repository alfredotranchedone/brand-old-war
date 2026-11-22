import { unitAt } from '../core/game';
import { objectiveAt } from '../core/map';
import { SIDE_LABEL } from './labels';
import { useUiStore } from './store';
import styles from './App.module.css';

/** Informazioni sull'esagono sotto il cursore. */
export function HexInfo() {
  const hovered = useUiStore((s) => s.hovered);
  const game = useUiStore((s) => s.game);
  const data = useUiStore((s) => s.data);

  if (!hovered) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Esagono</h2>
        <p className={styles.muted}>Passa il mouse sulla mappa.</p>
      </section>
    );
  }

  const objective = objectiveAt(game.map, hovered);
  const unit = unitAt(game, hovered);
  const unitType = unit ? data.unitTypes[unit.typeId] : undefined;

  if (!objective && !unit) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Esagono</h2>
        <p className={styles.muted}>Nessun obiettivo o unità.</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Esagono</h2>
      <dl className={styles.facts}>
        {objective && (
          <>
            <dt>Obiettivo</dt>
            <dd>
              {objective.name} · {objective.points} {objective.points === 1 ? 'punto' : 'punti'}
            </dd>
            <dt>Controllo</dt>
            <dd>{SIDE_LABEL[game.objectives[objective.id] ?? game.setup.defender]}</dd>
          </>
        )}
        {unit && unitType && (
          <>
            <dt>Unità</dt>
            <dd>
              {unitType.name} ({SIDE_LABEL[unit.side]}), forza {unit.strength}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}

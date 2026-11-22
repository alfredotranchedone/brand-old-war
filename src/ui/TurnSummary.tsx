import { SIDES, otherSide } from '../core/units';
import { isPlayerTurn, lastSummary, useUiStore } from './store';
import app from './App.module.css';
import styles from './EndScreen.module.css';

/** Riepilogo a fine turno completo: perdite del turno e obiettivi in mano. */
export function TurnSummary() {
  const game = useUiStore((s) => s.game);
  const seen = useUiStore((s) => s.summarySeen);
  const close = useUiStore((s) => s.closeSummary);
  const summary = lastSummary(game);
  if (!summary || summary.turn <= seen || !isPlayerTurn(game)) return null;

  const names = (ids: readonly string[]) =>
    ids.map((id) => game.map.objectives.find((o) => o.id === id)?.name ?? id).join(', ') || '—';

  return (
    <div className={styles.backdrop}>
      <section className={styles.dialog} role="dialog" aria-label="Riepilogo del turno">
        <h2 className={styles.outcome}>Fine turno {summary.turn}</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              {SIDES.map((side) => (
                <th key={side}>{game.setup.sideNames[side]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Perdite inflitte</th>
              {SIDES.map((side) => (
                <td key={side}>{summary.losses[otherSide(side)]}</td>
              ))}
            </tr>
            <tr>
              <th>Perdite subite</th>
              {SIDES.map((side) => (
                <td key={side}>{summary.losses[side]}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <dl className={app.facts}>
          {SIDES.map((side) => (
            <div key={side} className={styles.objectiveRow}>
              <dt>Obiettivi {game.setup.sideNames[side]}</dt>
              <dd>{names(summary.objectives[side])}</dd>
            </div>
          ))}
        </dl>
        <div className={app.actions}>
          <button type="button" className={`${app.button} ${app.primary}`} onClick={close} autoFocus>
            Continua
          </button>
        </div>
      </section>
    </div>
  );
}

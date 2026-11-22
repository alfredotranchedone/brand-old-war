import { objectivesHeld } from '../core/objectives';
import { SIDES, otherSide } from '../core/units';
import { victoryPoints } from '../core/victory';
import { useUiStore } from './store';
import app from './App.module.css';
import styles from './EndScreen.module.css';

const OUTCOME = { decisive: 'Vittoria decisiva', marginal: 'Vittoria marginale', defeat: 'Sconfitta' } as const;

export function EndScreen() {
  const game = useUiStore((s) => s.game);
  const data = useUiStore((s) => s.data);
  const restart = useUiStore((s) => s.restart);
  const result = game.result;
  if (!result) return null;

  return (
    <div className={styles.backdrop}>
      <section className={styles.dialog} role="dialog" aria-label="Fine partita">
        <h2 className={styles.outcome}>{OUTCOME[result.outcome]}</h2>
        <p className={app.muted}>
          Esito per {game.setup.sideNames[game.setup.player]} · {game.setup.scenarioName}
        </p>
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
              <th>Punti</th>
              {SIDES.map((side) => (
                <td key={side}>{victoryPoints(game, data, side)}</td>
              ))}
            </tr>
            <tr>
              <th>Obiettivi</th>
              {SIDES.map((side) => (
                <td key={side}>{objectivesHeld(game, side).length}</td>
              ))}
            </tr>
            <tr>
              <th>Step persi</th>
              {SIDES.map((side) => (
                <td key={side}>{game.stepsLost[side]}</td>
              ))}
            </tr>
            <tr>
              <th>Step inflitti</th>
              {SIDES.map((side) => (
                <td key={side}>{game.stepsLost[otherSide(side)]}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className={app.actions}>
          <button type="button" className={`${app.button} ${app.primary}`} onClick={() => restart()}>
            Rigioca
          </button>
        </div>
      </section>
    </div>
  );
}

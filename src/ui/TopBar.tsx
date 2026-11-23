import { SIDES } from '../core/units';
import { victoryPoints } from '../core/victory';
import { GameMenu } from './GameMenu';
import { ManualLink } from './ManualLink';
import { UndoButtons } from './UndoButtons';
import { ViewMenu } from './ViewMenu';
import { useUiStore } from './store';
import styles from './App.module.css';

export function TopBar() {
  const turn = useUiStore((s) => s.game.turn);
  const maxTurns = useUiStore((s) => s.game.maxTurns);
  const activeSide = useUiStore((s) => s.game.activeSide);
  const sideNames = useUiStore((s) => s.game.setup.sideNames);
  const scenarioName = useUiStore((s) => s.game.setup.scenarioName);
  const points = useUiStore((s) => SIDES.map((side) => `${s.game.setup.sideNames[side]} ${victoryPoints(s.game, s.data, side)}`).join(' · '));
  const aiThinking = useUiStore((s) => !s.game.result && s.game.activeSide === s.game.setup.aiSide);

  return (
    <header className={styles.topBar}>
      <span className={styles.title}>{scenarioName}</span>
      <span className={styles.turn}>
        Turno {turn} / {maxTurns}
      </span>
      <span className={`${styles.sideBadge} ${activeSide === 'blue' ? styles.blue : styles.red}`}>
        {sideNames[activeSide]}
      </span>
      <span className={styles.muted} title="Punti vittoria: obiettivi + 1 ogni 5 step nemici distrutti">
        Punti: {points}
      </span>
      {aiThinking && <span className={styles.muted}>Turno dell'IA…</span>}
      <span className={styles.spacer} />
      <UndoButtons />
      <ViewMenu />
      <ManualLink />
      <GameMenu />
    </header>
  );
}

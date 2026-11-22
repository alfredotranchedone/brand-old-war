import { canUndo } from '../core/history';
import { SIDE_LABEL } from './labels';
import { useUiStore } from './store';
import { requestEndTurn } from './requestEndTurn';
import styles from './App.module.css';

export function TopBar() {
  const turn = useUiStore((s) => s.game.turn);
  const maxTurns = useUiStore((s) => s.game.maxTurns);
  const activeSide = useUiStore((s) => s.game.activeSide);
  const scenarioName = useUiStore((s) => s.game.setup.scenarioName);
  const undoable = useUiStore((s) => canUndo(s.undoStack));
  const undo = useUiStore((s) => s.undo);
  const showCoords = useUiStore((s) => s.showCoords);
  const toggleCoords = useUiStore((s) => s.toggleCoords);
  const showZoc = useUiStore((s) => s.showZoc);
  const toggleZoc = useUiStore((s) => s.toggleZoc);
  const showSupply = useUiStore((s) => s.showSupply);
  const toggleSupply = useUiStore((s) => s.toggleSupply);
  const restart = useUiStore((s) => s.restart);
  const newGame = () => {
    if (window.confirm('Ricominciare da capo? La partita in corso andrà persa.')) restart();
  };

  return (
    <header className={styles.topBar}>
      <span className={styles.title}>{scenarioName}</span>
      <span className={styles.turn}>
        Turno {turn} / {maxTurns}
      </span>
      <span className={`${styles.sideBadge} ${activeSide === 'blue' ? styles.blue : styles.red}`}>
        {SIDE_LABEL[activeSide]}
      </span>
      <span className={styles.spacer} />
      <label className={styles.toggle}>
        <input type="checkbox" checked={showSupply} onChange={toggleSupply} />
        Rifornimenti
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={showZoc} onChange={toggleZoc} />
        ZOC
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={showCoords} onChange={toggleCoords} />
        Coordinate
      </label>
      <button type="button" className={styles.button} onClick={newGame}>
        Nuova partita
      </button>
      <button type="button" className={styles.button} onClick={undo} disabled={!undoable} title="Annulla (Ctrl+Z)">
        Annulla
      </button>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={requestEndTurn} title="Fine turno (Invio)">
        Fine turno
      </button>
    </header>
  );
}

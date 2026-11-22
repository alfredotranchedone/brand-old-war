import { useEffect } from 'react';
import { MapCanvas } from './MapCanvas';
import { HexInfo } from './HexInfo';
import { UnitCard } from './UnitCard';
import { SIDE_LABEL } from './labels';
import { useUiStore } from './store';
import styles from './App.module.css';

export function App() {
  const showCoords = useUiStore((s) => s.showCoords);
  const toggleCoords = useUiStore((s) => s.toggleCoords);
  const turn = useUiStore((s) => s.game.turn);
  const maxTurns = useUiStore((s) => s.game.maxTurns);
  const activeSide = useUiStore((s) => s.game.activeSide);
  const scenarioName = useUiStore((s) => s.game.setup.scenarioName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useUiStore.getState().deselect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.app}>
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
          <input type="checkbox" checked={showCoords} onChange={toggleCoords} />
          Coordinate
        </label>
      </header>
      <main className={styles.map}>
        <MapCanvas />
      </main>
      <aside className={styles.side}>
        <UnitCard />
        <HexInfo />
      </aside>
    </div>
  );
}

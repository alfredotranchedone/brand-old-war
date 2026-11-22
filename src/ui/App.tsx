import { MapCanvas } from './MapCanvas';
import { HexInfo } from './HexInfo';
import { useUiStore } from './store';
import styles from './App.module.css';

export function App() {
  const showCoords = useUiStore((s) => s.showCoords);
  const toggleCoords = useUiStore((s) => s.toggleCoords);

  return (
    <div className={styles.app}>
      <header className={styles.topBar}>
        <span className={styles.title}>Hex Wargame</span>
        <span className={styles.muted}>Demo · Fase 1</span>
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
        <HexInfo />
      </aside>
    </div>
  );
}

import { HexInfo } from './HexInfo';
import { MapCanvas } from './MapCanvas';
import { TopBar } from './TopBar';
import { UnitCard } from './UnitCard';
import { useShortcuts } from './useShortcuts';
import styles from './App.module.css';

export function App() {
  useShortcuts();
  return (
    <div className={styles.app}>
      <TopBar />
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

import { AdvanceHint } from './AdvanceHint';
import { BottomBar } from './BottomBar';
import { CombatPanel } from './CombatPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { HexInfo } from './HexInfo';
import { MapCanvas } from './MapCanvas';
import { TopBar } from './TopBar';
import { TurnSummary } from './TurnSummary';
import { UnitCard } from './UnitCard';
import { useAiTurn } from './useAiTurn';
import { useShortcuts } from './useShortcuts';
import styles from './App.module.css';

export function App() {
  useShortcuts();
  useAiTurn();
  return (
    <div className={styles.app}>
      <TopBar />
      <main className={styles.map}>
        <MapCanvas />
      </main>
      <aside className={styles.side}>
        <UnitCard />
        <AdvanceHint />
        <CombatPanel />
        <HexInfo />
        <EventLog />
      </aside>
      <BottomBar />
      <TurnSummary />
      <EndScreen />
      <ConfirmDialog />
    </div>
  );
}

import { AdvanceHint } from './AdvanceHint';
import { AttackWindow } from './AttackWindow';
import { BottomBar } from './BottomBar';
import { ConfirmDialog } from './ConfirmDialog';
import { EndScreen } from './EndScreen';
import { EventLog } from './EventLog';
import { MapCanvas } from './MapCanvas';
import { TopBar } from './TopBar';
import { TurnSummary } from './TurnSummary';
import { UnitCard } from './UnitCard';
import { UnitInspector } from './UnitInspector';
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
        <AttackWindow />
      </main>
      <aside className={styles.side}>
        <UnitInspector />
        <UnitCard />
        <AdvanceHint />
        <EventLog />
      </aside>
      <BottomBar />
      <TurnSummary />
      <EndScreen />
      <ConfirmDialog />
    </div>
  );
}

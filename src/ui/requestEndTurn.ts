import { spentUnits } from '../core/availability';
import { liveUnits } from '../core/game';
import { useUiStore } from './store';

/** Fine turno, con conferma se restano unità che possono ancora agire. */
export function requestEndTurn(): void {
  const s = useUiStore.getState();
  const spent = spentUnits(s.game, s.data);
  const idle = liveUnits(s.game, s.game.activeSide).filter((u) => !spent.has(u.id)).length;
  if (idle > 0 && !window.confirm(`${idle} unità possono ancora agire. Terminare il turno?`)) return;
  s.endTurn();
}

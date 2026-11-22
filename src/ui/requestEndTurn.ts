import { spentUnits } from '../core/availability';
import { liveUnits } from '../core/game';
import { askConfirm } from './confirm';
import { isPlayerTurn, useUiStore } from './store';

/** Fine turno, con conferma se restano unità che possono ancora agire. */
export function requestEndTurn(): void {
  const s = useUiStore.getState();
  if (!isPlayerTurn(s.game)) return;
  const spent = spentUnits(s.game, s.data);
  const idle = liveUnits(s.game, s.game.activeSide).filter((u) => !spent.has(u.id)).length;
  if (idle > 0) askConfirm(`${idle} unità possono ancora agire. Terminare il turno?`, s.endTurn);
  else s.endTurn();
}

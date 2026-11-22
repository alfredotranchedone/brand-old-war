import type { GameData } from '../core/data';
import type { GameEvent } from '../core/events';
import { type GameState, getUnit } from '../core/game';
import { type Axial, axialToOffset } from '../core/hex';
import { SIDE_LABEL } from './labels';

function unitName(state: GameState, data: GameData, id: string): string {
  const u = getUnit(state, id);
  if (!u) return id;
  return `${data.unitTypes[u.typeId]?.name ?? u.typeId} (${SIDE_LABEL[u.side]})`;
}

const at = (h: Axial) => {
  const { col, row } = axialToOffset(h);
  return `${col},${row}`;
};

export function eventText(e: GameEvent, state: GameState, data: GameData): string {
  switch (e.kind) {
    case 'gameStart':
      return `Inizio partita: ${state.setup.scenarioName}`;
    case 'gameEnd': {
      const r = e.result;
      const what = r.outcome === 'decisive' ? 'vittoria decisiva' : r.outcome === 'marginal' ? 'vittoria marginale' : 'sconfitta';
      return `Fine partita: ${what} del ${SIDE_LABEL[state.setup.player]}`;
    }
    case 'turnSummary':
      return `Fine turno ${e.turn}: perdite ${SIDE_LABEL.blue} ${e.losses.blue}, ${SIDE_LABEL.red} ${e.losses.red} · obiettivi ${SIDE_LABEL.blue} ${e.objectives.blue.length}, ${SIDE_LABEL.red} ${e.objectives.red.length}`;
    case 'turnStart':
      return `Turno ${e.turn} · ${SIDE_LABEL[e.side]}`;
    case 'move':
      return `${unitName(state, data, e.unitId)} muove in ${at(e.path[e.path.length - 1]!)} (${e.cost} PM)`;
    case 'combat': {
      const parts = [
        `${unitName(state, data, e.attackerId)} attacca ${unitName(state, data, e.targetId)}`,
        `R ${Number.isFinite(e.ratio) ? e.ratio.toFixed(2) : '∞'}`,
        `perdite ${e.attackerLosses} / ${e.defenderLosses} step`,
      ];
      if (e.defenderDestroyed) parts.push('difensore distrutto');
      else if (e.retreatTo) parts.push(`ritirata in ${at(e.retreatTo)}`);
      else if (e.extraLoss > 0) parts.push('ritirata impossibile');
      if (e.attackerDestroyed) parts.push('attaccante distrutto');
      return parts.join(' · ');
    }
    case 'advance':
      return `${unitName(state, data, e.unitId)} avanza in ${at(e.to)}`;
    case 'supply': {
      const names = (ids: readonly string[]) => ids.map((id) => unitName(state, data, id)).join(', ');
      const text = `Fuori rifornimento: ${names(e.outOfSupply)}`;
      return e.attrition.length > 0 ? `${text} · logoramento: ${names(e.attrition)}` : text;
    }
  }
}

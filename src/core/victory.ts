import type { GameData } from './data';
import type { GameResult, GameState } from './game';
import { type Side, otherSide } from './units';

export function victoryPoints(state: GameState, data: GameData, side: Side): number {
  const objectives = state.map.objectives
    .filter((o) => state.objectives[o.id] === side)
    .reduce((sum, o) => sum + o.points, 0);
  return objectives + Math.floor(state.stepsLost[otherSide(side)] / data.rules.victory.enemyStepsPerPoint);
}

/** Esito dal punto di vista del giocatore. */
export function computeResult(state: GameState, data: GameData): GameResult {
  const player = state.setup.player;
  const enemy = otherSide(player);
  const holdsAll = state.map.objectives.every((o) => state.objectives[o.id] === player);
  if (holdsAll) return { winner: player, outcome: 'decisive' };
  if (victoryPoints(state, data, player) > victoryPoints(state, data, enemy)) return { winner: player, outcome: 'marginal' };
  return { winner: enemy, outcome: 'defeat' };
}

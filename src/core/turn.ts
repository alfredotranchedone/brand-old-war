import type { GameData } from './data';
import type { GameEvent } from './events';
import { type GameState, createGame } from './game';
import { objectivesHeld } from './objectives';
import type { Scenario } from './scenario';
import { startOfTurnSupply } from './supply';
import { SIDES, type Side, isAlive, otherSide } from './units';
import { computeResult } from './victory';

/** Inizio del turno della fazione attiva: azzera i flag e applica il rifornimento. */
export function startTurn(state: GameState, data: GameData): GameState {
  const side = state.activeSide;
  const units = state.units.map((u) => (u.side === side ? { ...u, hasMoved: false, hasAttacked: false } : u));
  const event: GameEvent = { kind: 'turnStart', turn: state.turn, side };
  const roundStartLosses = side === state.setup.firstSide ? state.stepsLost : state.roundStartLosses;
  return startOfTurnSupply({ ...state, units, roundStartLosses, log: [...state.log, event] }, data, side);
}

export function startGame(scenario: Scenario, data: GameData, seed?: number): GameState {
  return startTurn(createGame(scenario, data, seed), data);
}

/** Perdite del turno appena concluso e obiettivi in mano a ciascuna fazione. */
function turnSummary(state: GameState): GameEvent {
  const losses = { blue: 0, red: 0 } as Record<Side, number>;
  const objectives = { blue: [], red: [] } as Record<Side, string[]>;
  for (const side of SIDES) {
    losses[side] = state.stepsLost[side] - state.roundStartLosses[side];
    objectives[side] = objectivesHeld(state, side);
  }
  return { kind: 'turnSummary', turn: state.turn, losses, objectives };
}

/** Chiude il turno della fazione attiva e passa la mano. */
export function endTurn(state: GameState, data: GameData): { state: GameState; events: readonly GameEvent[] } | string {
  if (state.result) return 'Partita conclusa';
  const side = state.activeSide;
  const units = state.units.map((u) => (u.side === side && isAlive(u) ? { ...u, entrenched: !u.hasMoved } : u));
  const closed: GameState = { ...state, units };
  if (side === state.setup.firstSide) {
    const next = startTurn({ ...closed, activeSide: otherSide(side) }, data);
    return { state: next, events: next.log.slice(state.log.length) };
  }

  const summary = turnSummary(closed);
  if (state.turn >= state.maxTurns) {
    const result = computeResult(closed, data);
    const events: GameEvent[] = [summary, { kind: 'gameEnd', result }];
    return { state: { ...closed, result, log: [...state.log, ...events] }, events };
  }
  const next = startTurn({ ...closed, turn: state.turn + 1, activeSide: otherSide(side), log: [...state.log, summary] }, data);
  return { state: next, events: next.log.slice(state.log.length) };
}

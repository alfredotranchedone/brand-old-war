import type { GameData } from './data';
import type { GameEvent } from './events';
import { type GameState, createGame } from './game';
import type { Scenario } from './scenario';
import { startOfTurnSupply } from './supply';
import { isAlive, otherSide } from './units';
import { computeResult } from './victory';

/** Inizio del turno della fazione attiva: azzera i flag e applica il rifornimento. */
export function startTurn(state: GameState, data: GameData): GameState {
  const side = state.activeSide;
  const units = state.units.map((u) => (u.side === side ? { ...u, hasMoved: false, hasAttacked: false } : u));
  const event: GameEvent = { kind: 'turnStart', turn: state.turn, side };
  return startOfTurnSupply({ ...state, units, log: [...state.log, event] }, data, side);
}

export function startGame(scenario: Scenario, data: GameData, seed?: number): GameState {
  return startTurn(createGame(scenario, data, seed), data);
}

/** Chiude il turno della fazione attiva e passa la mano. */
export function endTurn(state: GameState, data: GameData): { state: GameState; events: readonly GameEvent[] } | string {
  if (state.result) return 'Partita conclusa';
  const side = state.activeSide;
  const units = state.units.map((u) => (u.side === side && isAlive(u) ? { ...u, entrenched: !u.hasMoved } : u));
  const turn = side === state.setup.firstSide ? state.turn : state.turn + 1;
  if (turn > state.maxTurns) {
    const result = computeResult({ ...state, units }, data);
    const event: GameEvent = { kind: 'gameEnd', result };
    return { state: { ...state, units, result, log: [...state.log, event] }, events: [event] };
  }

  const next = startTurn({ ...state, units, turn, activeSide: otherSide(side) }, data);
  return { state: next, events: next.log.slice(state.log.length) };
}

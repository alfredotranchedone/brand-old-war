import type { GameData } from './data';
import { type GameState, createGame } from './game';
import type { Scenario } from './scenario';
import { startOfTurnSupply } from './supply';

/** Fasi di inizio turno della fazione attiva. */
export function startTurn(state: GameState, data: GameData): GameState {
  return startOfTurnSupply(state, data, state.activeSide);
}

export function startGame(scenario: Scenario, data: GameData, seed?: number): GameState {
  return startTurn(createGame(scenario, data, seed), data);
}

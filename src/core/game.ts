/** Lo stato della partita: unità, turno, controllo degli obiettivi, risultati casuali, eventi. I dati statici (GameData) sono gestiti separatamente. */
import { type GameData, getUnitType } from './data';
import type { GameEvent } from './events';
import { type Axial, hexEquals } from './hex';
import type { MapData } from './map';
import { seedRng } from './rng';
import type { AiPosture, Scenario, VictoryRules } from './scenario';
import { type Side, type Unit, isAirType, isAlive } from './units';
import type { TurnConditions } from './weather';

export interface GameResult {
  readonly winner: Side | null;
  readonly outcome: 'decisive' | 'marginal' | 'defeat';
}

/** Configurazione dello scenario che è disponibile durante la partita e non cambia. */
export interface GameSetup {
  readonly scenarioName: string;
  readonly sideNames: Readonly<Record<Side, string>>;
  readonly player: Side;
  readonly aiSide: Side;
  readonly aiPosture: AiPosture;
  readonly defender: Side;
  readonly firstSide: Side;
  readonly conditions: readonly TurnConditions[];
  readonly victory: VictoryRules;
}

export interface GameState {
  readonly scenarioId: string;
  readonly setup: GameSetup;
  /** Numero del turno di gioco (da 1 a maxTurns). */
  readonly turn: number;
  readonly maxTurns: number;
  readonly activeSide: Side;
  readonly map: MapData;
  readonly units: readonly Unit[];
  /** Quale fazione controlla ogni obiettivo. */
  readonly objectives: Readonly<Record<string, Side>>;
  /** Perdite totali in punti forza per ogni fazione. */
  readonly stepsLost: Readonly<Record<Side, number>>;
  /** Perdite all'inizio del turno (usate nel riepilogo). */
  readonly roundStartLosses: Readonly<Record<Side, number>>;
  readonly rngState: number;
  readonly log: readonly GameEvent[];
  /** Avanzata in sospeso dopo un combattimento: l'attaccante può occupare questo esagono. */
  readonly pendingAdvance?: { readonly unitId: string; readonly to: Axial };
  readonly result?: GameResult;
}

export function createGame(scenario: Scenario, data: GameData, seed: number = scenario.seed): GameState {
  const units: Unit[] = scenario.units.map((u) => ({
    id: u.id,
    typeId: u.typeId,
    side: u.side,
    pos: u.pos,
    strength: u.strength,
    movesLeft: getUnitType(data, u.typeId).move,
    hasMoved: false,
    hasAttacked: false,
    hasReacted: false,
    entrenched: u.entrenched,
    outOfSupplyTurns: 0,
  }));

  const objectives: Record<string, Side> = {};
  for (const o of scenario.map.objectives) objectives[o.id] = scenario.defender;

  return {
    scenarioId: scenario.id,
    setup: {
      scenarioName: scenario.name,
      sideNames: scenario.sideNames,
      player: scenario.player,
      aiSide: scenario.ai.side,
      aiPosture: scenario.ai.posture,
      defender: scenario.defender,
      firstSide: scenario.turns.firstSide,
      conditions: scenario.turns.conditions,
      victory: scenario.victory,
    },
    turn: 1,
    maxTurns: scenario.turns.max,
    activeSide: scenario.turns.firstSide,
    map: scenario.map,
    units,
    objectives,
    stepsLost: { blue: 0, red: 0 },
    roundStartLosses: { blue: 0, red: 0 },
    rngState: seedRng(seed),
    log: [{ kind: 'gameStart', turn: 1, scenarioId: scenario.id }],
  };
}

export function getUnit(state: GameState, id: string): Unit | undefined {
  return state.units.find((u) => u.id === id);
}

export function isAirUnit(data: GameData, unit: Unit): boolean {
  return isAirType(getUnitType(data, unit.typeId));
}

/** Ritorna tutte le unità vive in questo esagono: al massimo una terrestre e una aerea. */
export function unitsAt(state: GameState, data: GameData, h: Axial): Unit[] {
  return state.units
    .filter((u) => isAlive(u) && hexEquals(u.pos, h))
    .sort((a, b) => Number(isAirUnit(data, a)) - Number(isAirUnit(data, b)));
}

export function groundUnitAt(state: GameState, data: GameData, h: Axial): Unit | undefined {
  return state.units.find((u) => isAlive(u) && hexEquals(u.pos, h) && !isAirUnit(data, u));
}

export function airUnitAt(state: GameState, data: GameData, h: Axial): Unit | undefined {
  return state.units.find((u) => isAlive(u) && hexEquals(u.pos, h) && isAirUnit(data, u));
}

export function liveUnits(state: GameState, side?: Side): Unit[] {
  return state.units.filter((u) => isAlive(u) && (side === undefined || u.side === side));
}

export function addLosses(state: GameState, side: Side, steps: number): GameState {
  if (steps <= 0) return state;
  return { ...state, stepsLost: { ...state.stepsLost, [side]: state.stepsLost[side] + steps } };
}

export function currentConditions(state: GameState): TurnConditions {
  const c = state.setup.conditions[state.turn - 1];
  if (!c) throw new Error(`Condizioni mancanti per il turno ${state.turn}`);
  return c;
}

import { type GameData, getUnitType } from './data';
import { type GameState, addLosses } from './game';
import type { Rules } from './rules';
import { isInSupply, supplyNetwork } from './supplyNetwork';
import { type Side, type Unit, isAlive } from './units';

export interface SupplyEffects {
  readonly attack: number;
  readonly defense: number;
}

/** Effetti sul combattimento dello stato di rifornimento. */
export function supplyEffects(rules: Rules, unit: Unit): SupplyEffects {
  if (unit.outOfSupplyTurns >= 2) {
    return { attack: rules.supply.outOfSupply2.attackMultiplier, defense: rules.supply.outOfSupply2.defenseMultiplier };
  }
  if (unit.outOfSupplyTurns === 1) return { attack: rules.supply.outOfSupply1.attackMultiplier, defense: 1 };
  return { attack: 1, defense: 1 };
}

/** PM a inizio turno in base ai turni consecutivi fuori rifornimento. */
export function supplyMoves(rules: Rules, baseMove: number, outOfSupplyTurns: number): number {
  if (outOfSupplyTurns >= 2) return Math.ceil(baseMove * rules.supply.outOfSupply2.moveMultiplier);
  if (outOfSupplyTurns === 1) return Math.max(0, baseMove + rules.supply.outOfSupply1.moveDelta);
  return baseMove;
}

/** Fase di rifornimento di inizio turno: aggiorna contatori, PM e logoramento della fazione. */
export function startOfTurnSupply(state: GameState, data: GameData, side: Side): GameState {
  const network = supplyNetwork(state, data, side);
  const outOfSupply: string[] = [];
  const attrition: string[] = [];
  let lost = 0;
  const loss = data.rules.supply.outOfSupply2.strengthLossPerTurn;

  const units = state.units.map((u) => {
    if (u.side !== side || !isAlive(u)) return u;
    const turns = isInSupply(network, u) ? 0 : u.outOfSupplyTurns + 1;
    let strength = u.strength;
    if (turns > 0) outOfSupply.push(u.id);
    if (turns >= 2 && strength > 1 && loss > 0) {
      strength = Math.max(1, strength - loss);
      lost += u.strength - strength;
      attrition.push(u.id);
    }
    const movesLeft = supplyMoves(data.rules, getUnitType(data, u.typeId).move, turns);
    return { ...u, outOfSupplyTurns: turns, strength, movesLeft };
  });

  const log = outOfSupply.length > 0 ? [...state.log, { kind: 'supply', side, outOfSupply, attrition } as const] : state.log;
  return addLosses({ ...state, units, log }, side, lost);
}

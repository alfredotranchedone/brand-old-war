import { type GameData, getUnitType } from './data';
import { type GameState, addLosses } from './game';
import type { Rules } from './rules';
import { isInSupply, supplyNetwork } from './supplyNetwork';
import { type Side, type Unit, type UnitType, isAirType, isAlive } from './units';
import { isWeak } from './weakness';

export interface SupplyEffects {
  readonly attack: number;
  readonly defense: number;
}

/**
 * Stadio dei malus di rifornimento: 0 nessuno, 1 primo turno, 2 dal secondo (con logoramento).
 * Le unità con `supplyEndurance` N ci arrivano N volte più tardi.
 */
export function supplyStage(data: GameData, unit: Unit): number {
  return supplyStageFor(getUnitType(data, unit.typeId), unit.outOfSupplyTurns);
}

function supplyStageFor(type: UnitType, outOfSupplyTurns: number): number {
  return Math.floor(outOfSupplyTurns / type.supplyEndurance);
}

/** Effetti del rifornimento sul combattimento. */
export function supplyEffects(data: GameData, unit: Unit): SupplyEffects {
  const rules = data.rules;
  const stage = supplyStage(data, unit);
  if (stage >= 2) {
    return { attack: rules.supply.outOfSupply2.attackMultiplier, defense: rules.supply.outOfSupply2.defenseMultiplier };
  }
  if (stage === 1) return { attack: rules.supply.outOfSupply1.attackMultiplier, defense: 1 };
  return { attack: 1, defense: 1 };
}

/** PM a inizio turno: tiene conto del rifornimento, della debolezza e dello status debilitato. I dimezzamenti non si sommano. */
export function startingMoves(rules: Rules, baseMove: number, stage: number, strength: number): number {
  let mult = 1;
  if (stage >= 2) mult = Math.min(mult, rules.supply.outOfSupply2.moveMultiplier);
  if (isWeak(rules, { strength })) mult = Math.min(mult, rules.weakUnit.moveMultiplier);
  const moves = mult < 1 ? Math.ceil(baseMove * mult) : baseMove;
  return stage === 1 ? Math.max(0, moves + rules.supply.outOfSupply1.moveDelta) : moves;
}

/** Aggiorna il rifornimento e il logoramento di tutte le unità della fazione all'inizio del turno. */
export function startOfTurnSupply(state: GameState, data: GameData, side: Side): GameState {
  const network = supplyNetwork(state, data, side);
  const outOfSupply: string[] = [];
  const attrition: string[] = [];
  let lost = 0;
  const loss = data.rules.supply.outOfSupply2.strengthLossPerTurn;

  const units = state.units.map((u) => {
    if (u.side !== side || !isAlive(u)) return u;
    // Per ora le unità aeree non soffrono di carenza di rifornimento (gli aeroporti arriveranno dopo).
    const type = getUnitType(data, u.typeId);
    const turns = isAirType(type) || isInSupply(network, u) ? 0 : u.outOfSupplyTurns + 1;
    let strength = u.strength;
    if (turns > 0) outOfSupply.push(u.id);
    const stage = supplyStageFor(type, turns);
    if (stage >= 2 && strength > 1 && loss > 0) {
      strength = Math.max(1, strength - loss);
      lost += u.strength - strength;
      attrition.push(u.id);
    }
    const movesLeft = startingMoves(data.rules, type.move, stage, strength);
    return { ...u, outOfSupplyTurns: turns, strength, movesLeft };
  });

  const log = outOfSupply.length > 0 ? [...state.log, { kind: 'supply', side, outOfSupply, attrition } as const] : state.log;
  return addLosses({ ...state, units, log }, side, lost);
}

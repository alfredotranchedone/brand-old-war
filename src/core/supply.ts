import type { Rules } from './rules';
import type { Unit } from './units';

export interface SupplyEffects {
  readonly attack: number;
  readonly defense: number;
}

/** Effetti sul combattimento dello stato di rifornimento (la rete arriva nella Fase 5). */
export function supplyEffects(rules: Rules, unit: Unit): SupplyEffects {
  if (unit.outOfSupplyTurns >= 2) {
    return { attack: rules.supply.outOfSupply2.attackMultiplier, defense: rules.supply.outOfSupply2.defenseMultiplier };
  }
  if (unit.outOfSupplyTurns === 1) return { attack: rules.supply.outOfSupply1.attackMultiplier, defense: 1 };
  return { attack: 1, defense: 1 };
}

import type { Rules } from '../core/rules';
import type { Unit } from '../core/units';

const mult = (n: number) => `×${String(n).replace('.', ',')}`;

/** Descrive lo stato di rifornimento dell'unità e i malus attuali. */
export function supplyText(rules: Rules, unit: Unit): string {
  const t = unit.outOfSupplyTurns;
  if (t === 0) return 'Rifornita';
  const head = `Fuori rifornimento (${t}° turno)`;
  if (t === 1) {
    const s = rules.supply.outOfSupply1;
    return `${head} · attacco ${mult(s.attackMultiplier)}, PM ${s.moveDelta}`;
  }
  const s = rules.supply.outOfSupply2;
  return `${head} · attacco ${mult(s.attackMultiplier)}, difesa ${mult(s.defenseMultiplier)}, PM ${mult(s.moveMultiplier)}, −${s.strengthLossPerTurn} forza a turno`;
}

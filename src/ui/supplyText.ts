import type { GameData } from '../core/data';
import { supplyStage } from '../core/supply';
import type { Unit } from '../core/units';

const mult = (n: number) => `×${String(n).replace('.', ',')}`;

/** Descrive lo stato di rifornimento dell'unità e i malus attuali. */
export function supplyText(data: GameData, unit: Unit): string {
  const t = unit.outOfSupplyTurns;
  if (t === 0) return 'Rifornita';
  const rules = data.rules;
  const head = `Fuori rifornimento (${t}° turno)`;
  const stage = supplyStage(data, unit);
  if (stage === 0) return `${head} · nessun malus`;
  if (stage === 1) {
    const s = rules.supply.outOfSupply1;
    return `${head} · attacco ${mult(s.attackMultiplier)}, PM ${s.moveDelta}`;
  }
  const s = rules.supply.outOfSupply2;
  return `${head} · attacco ${mult(s.attackMultiplier)}, difesa ${mult(s.defenseMultiplier)}, PM ${mult(s.moveMultiplier)}, −${s.strengthLossPerTurn} forza a turno`;
}

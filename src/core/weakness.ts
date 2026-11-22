import type { Rules } from './rules';
import type { Unit } from './units';

/** Unità debilitata (forza bassa): non può attaccare e muove più lentamente. */
export function isWeak(rules: Rules, unit: Pick<Unit, 'strength'>): boolean {
  return unit.strength <= rules.weakUnit.maxStrength;
}

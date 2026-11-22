import type { Rules } from './rules';
import type { Unit } from './units';

/** Unità logorata: non può attaccare e muove con PM ridotti. */
export function isWeak(rules: Rules, unit: Pick<Unit, 'strength'>): boolean {
  return unit.strength <= rules.weakUnit.maxStrength;
}

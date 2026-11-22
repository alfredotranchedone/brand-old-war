/**
 * Fuoco di supporto: scelta automatica delle unità che intervengono in un combattimento.
 */
import { type AirAttackMods, airAttackMods } from './air';
import { attackPower, defensePower, terrainDefenseMod } from './combatPower';
import { type GameData, getUnitType } from './data';
import { type GameState, liveUnits } from './game';
import { hexDistance } from './hex';
import { type Unit, hasTag } from './units';
import { isWeak } from './weakness';

export interface SupportSet {
  /** Unità amiche dell'attaccante adiacenti al bersaglio. */
  readonly offensive: readonly Unit[];
  /** Artiglieria dell'attaccante che copre il bersaglio. */
  readonly artilleryCover: readonly Unit[];
  /** Unità amiche del difensore adiacenti a lui. */
  readonly defensive: readonly Unit[];
  /** Artiglieria del difensore che spara sull'attaccante. */
  readonly barrage: readonly Unit[];
}

/** Rifornita e non logorata. */
function canSupport(data: GameData, u: Unit): boolean {
  return u.outOfSupplyTurns === 0 && !isWeak(data.rules, u);
}

const isArtillery = (data: GameData, u: Unit) => hasTag(getUnitType(data, u.typeId), 'artillery');
const inRange = (data: GameData, u: Unit, target: Unit) => {
  const d = hexDistance(u.pos, target.pos);
  return d >= 1 && d <= getUnitType(data, u.typeId).range;
};

/** Le migliori `max` unità per potenza, a parità per id (ordine stabile). */
function best(units: Unit[], power: (u: Unit) => number, max: number): Unit[] {
  return units
    .map((u) => ({ u, p: power(u) }))
    .sort((a, b) => b.p - a.p || a.u.id.localeCompare(b.u.id))
    .slice(0, max)
    .map((x) => x.u);
}

export function findSupport(state: GameState, data: GameData, attacker: Unit, defender: Unit): SupportSet {
  const cfg = data.rules.support;
  const others = (side: Unit['side']) =>
    liveUnits(state, side).filter((u) => u.id !== attacker.id && u.id !== defender.id && canSupport(data, u));
  const attackers = others(attacker.side).filter((u) => !u.hasAttacked);
  const defenders = others(defender.side).filter((u) => !u.hasReacted);
  const adjacentToTarget = (u: Unit) => hexDistance(u.pos, defender.pos) === 1;
  const attack = (u: Unit) => attackPower(state, data, u, defender);
  const defense = (u: Unit) => defensePower(state, data, u);

  return {
    offensive: best(
      attackers.filter((u) => !isArtillery(data, u) && adjacentToTarget(u)),
      attack,
      cfg.maxOffensiveAdjacent,
    ),
    artilleryCover: best(
      attackers.filter((u) => isArtillery(data, u) && !u.hasMoved && inRange(data, u, defender)),
      attack,
      cfg.maxArtilleryOffensive,
    ),
    defensive: best(
      defenders.filter((u) => !isArtillery(data, u) && adjacentToTarget(u)),
      defense,
      cfg.maxDefensiveAdjacent,
    ),
    barrage: best(
      defenders.filter((u) => isArtillery(data, u) && (inRange(data, u, attacker) || inRange(data, u, defender))),
      (u) => attackPower(state, data, u, attacker),
      cfg.maxArtilleryDefensive,
    ),
  };
}

export interface SupportedPowers {
  readonly attack: number;
  readonly defense: number;
  /** Bonus offensivo dei fianchi (0,30 = +30%). */
  readonly offensiveBonus: number;
  readonly defensiveBonus: number;
  /** Moltiplicatore del terreno prima e dopo la copertura d'artiglieria. */
  readonly terrainMod: { readonly before: number; readonly after: number };
  /** Moltiplicatore dello sbarramento sull'attacco (1 = nessuno). */
  readonly barrageMod: number;
  /** Drone osservatore, guerra elettronica, elicotteri al coperto. */
  readonly air: AirAttackMods;
}

/** Potenze di attacco e difesa con i supporti applicati. */
export function supportedPowers(state: GameState, data: GameData, attacker: Unit, defender: Unit, set: SupportSet): SupportedPowers {
  const cfg = data.rules.support;
  const offensiveBonus = set.offensive.length * cfg.offensiveAdjacentBonus;
  const defensiveBonus = set.defensive.length * cfg.defensiveAdjacentBonus;
  const barrageMod = set.barrage.length > 0 ? 1 - cfg.artilleryBarrageAttackPenalty : 1;
  const before = terrainDefenseMod(state, data, defender);
  const after = set.artilleryCover.length > 0 && before > 1 ? 1 + (before - 1) * (1 - cfg.artilleryDefenseReduction) : before;
  const air = airAttackMods(state, data, attacker, defender);
  return {
    attack: attackPower(state, data, attacker, defender) * (1 + offensiveBonus) * barrageMod * (1 + air.spotter) * air.ew * air.cover,
    defense: defensePower(state, data, defender, after) * (1 + defensiveBonus),
    offensiveBonus,
    defensiveBonus,
    terrainMod: { before, after },
    barrageMod,
    air,
  };
}

/** Id delle unità di supporto, per eventi e anteprima. */
export function supportIds(set: SupportSet): Record<keyof SupportSet, string[]> {
  const ids = (l: readonly Unit[]) => l.map((u) => u.id);
  return { offensive: ids(set.offensive), artilleryCover: ids(set.artilleryCover), defensive: ids(set.defensive), barrage: ids(set.barrage) };
}

/**
 * Dominio aereo: bolle di contraerea (AA) e guerra elettronica (EW), droni osservatori,
 * fuoco preventivo dell'AA sulle unità aeree che agiscono nella sua bolla.
 */
import { type GameData, getUnitType } from './data';
import type { GameEvent } from './events';
import { type GameState, addLosses, airUnitAt, liveUnits } from './game';
import { type Axial, hexDistance } from './hex';
import { terrainAt } from './map';
import { nextFloat } from './rng';
import { type Side, type Unit, type UnitType, hasTag, isAirType, otherSide } from './units';

const typeOf = (data: GameData, u: Unit) => getUnitType(data, u.typeId);

/** Unità di `side` la cui bolla (AA o EW) copre l'esagono. */
export function bubbleUnits(state: GameState, data: GameData, side: Side, h: Axial, kind: 'aa' | 'ew'): Unit[] {
  return liveUnits(state, side).filter((u) => {
    const t = typeOf(data, u);
    const r = kind === 'aa' ? t.aaRadius : t.ewRadius;
    return r > 0 && hexDistance(u.pos, h) <= r;
  });
}

/** Drone disturbato: dentro una bolla EW nemica. */
export function isJammed(state: GameState, data: GameData, u: Unit): boolean {
  return hasTag(typeOf(data, u), 'uav') && bubbleUnits(state, data, otherSide(u.side), u.pos, 'ew').length > 0;
}

/** Drone amico dell'attaccante sopra il bersaglio, non disturbato. */
export function spotter(state: GameState, data: GameData, attacker: Unit, defender: Unit): Unit | undefined {
  const uav = airUnitAt(state, data, defender.pos);
  if (!uav || uav.side !== attacker.side || uav.id === attacker.id) return undefined;
  return hasTag(typeOf(data, uav), 'uav') && !isJammed(state, data, uav) ? uav : undefined;
}

export interface AirAttackMods {
  /** Bonus del drone osservatore (0,15 = +15%). */
  readonly spotter: number;
  /** Moltiplicatore EW: drone disturbato o artiglieria su bersaglio coperto da EW nemica. */
  readonly ew: number;
  /** Moltiplicatore dell'elicottero contro bersagli al coperto. */
  readonly cover: number;
}

export function airAttackMods(state: GameState, data: GameData, attacker: Unit, defender: Unit): AirAttackMods {
  const cfg = data.rules.air;
  const t = typeOf(data, attacker);
  let ew = 1;
  if (hasTag(t, 'uav') && isJammed(state, data, attacker)) ew = cfg.jammedUavAttackMultiplier;
  else if (hasTag(t, 'artillery') && bubbleUnits(state, data, defender.side, defender.pos, 'ew').length > 0) ew = 1 - cfg.ewArtilleryPenalty;
  const defenderTerrain = terrainAt(state.map, data.terrain, defender.pos).id;
  const covered = hasTag(t, 'helicopter') && !isAirType(typeOf(data, defender)) && cfg.helicopterCoverTerrains.includes(defenderTerrain);
  return {
    spotter: spotter(state, data, attacker, defender) ? cfg.uavSpotterBonus : 0,
    ew,
    cover: covered ? cfg.helicopterCoverMultiplier : 1,
  };
}

export interface AaThreat {
  readonly aaId: string;
  /** Probabilità di colpire per tiro. */
  readonly hitChance: number;
  readonly shots: number;
}

function hitChance(data: GameData, aa: Unit, type: UnitType): number {
  const cfg = data.rules.air;
  return Math.min(cfg.aaMaxHitChance, cfg.aaHitPerAttack * type.attack.air * (aa.strength / data.rules.maxStrength));
}

/** La contraerea nemica più pericolosa che copre l'unità aerea, se c'è. */
export function aaThreat(state: GameState, data: GameData, unit: Unit): AaThreat | null {
  if (!isAirType(typeOf(data, unit))) return null;
  let best: AaThreat | null = null;
  for (const aa of bubbleUnits(state, data, otherSide(unit.side), unit.pos, 'aa')) {
    const p = hitChance(data, aa, typeOf(data, aa));
    if (p > 0 && (!best || p > best.hitChance)) best = { aaId: aa.id, hitChance: p, shots: data.rules.air.aaShots };
  }
  return best;
}

/** Fuoco preventivo dell'AA sull'unità aerea: null se nessuna AA la copre. */
export function aaFire(state: GameState, data: GameData, unitId: string): { state: GameState; event: GameEvent } | null {
  const unit = state.units.find((u) => u.id === unitId);
  const threat = unit && aaThreat(state, data, unit);
  if (!unit || !threat) return null;
  let rng = state.rngState;
  let hits = 0;
  for (let i = 0; i < threat.shots; i++) {
    const r = nextFloat(rng);
    rng = r.state;
    if (r.value < threat.hitChance) hits++;
  }
  const losses = Math.min(hits, unit.strength);
  const event: GameEvent = { kind: 'aaFire', aaId: threat.aaId, targetId: unit.id, losses, destroyed: losses === unit.strength };
  const units = state.units.map((u) => (u.id === unit.id ? { ...u, strength: u.strength - losses } : u));
  const next = addLosses({ ...state, units, rngState: rng, log: [...state.log, event] }, unit.side, losses);
  return { state: next, event };
}

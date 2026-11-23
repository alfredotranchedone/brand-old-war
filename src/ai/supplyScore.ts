import { getUnitType, type GameData } from '../core/data';
import { type GameState, groundUnitAt, liveUnits } from '../core/game';
import { type Axial, type HexKey, hexDistance, hexEquals, hexKey, hexNeighbors } from '../core/hex';
import type { AiWeights } from '../core/rules';
import { type SupplyNetwork, isInSupply, supplyNetwork } from '../core/supplyNetwork';
import { type Unit, isAirType, otherSide } from '../core/units';
import { exertsZoc } from '../core/zoc';

export interface SupplyView {
  readonly own: SupplyNetwork;
  /** Dorsale nemica calcolata senza l'unità, così restare su un taglio conta come tenerlo. */
  readonly enemyTrunk: ReadonlySet<HexKey>;
  /** Alleati che resterebbero isolati se l'unità lasciasse l'esagono. */
  readonly gapLoss: number;
}

const suppliedAllies = (state: GameState, data: GameData, net: SupplyNetwork, unit: Unit) =>
  liveUnits(state, unit.side).filter((u) => u.id !== unit.id && !isAirType(getUnitType(data, u.typeId)) && isInSupply(net, u)).length;

export function supplyView(state: GameState, data: GameData, unit: Unit): SupplyView {
  const own = supplyNetwork(state, data, unit.side);
  if (isAirType(getUnitType(data, unit.typeId))) return { own, enemyTrunk: new Set(), gapLoss: 0 };
  const without = { ...state, units: state.units.filter((u) => u.id !== unit.id) };
  const gapLoss = suppliedAllies(state, data, own, unit) - suppliedAllies(state, data, supplyNetwork(without, data, unit.side), unit);
  return { own, enemyTrunk: supplyNetwork(without, data, otherSide(unit.side)).trunk, gapLoss };
}

function threatened(state: GameState, data: GameData, side: Unit['side'], h: Axial): boolean {
  return liveUnits(state, otherSide(side)).some((e) => {
    const t = getUnitType(data, e.typeId);
    return !isAirType(t) && hexDistance(e.pos, h) <= t.move + 1;
  });
}

/** Punteggio legato ai rifornimenti: restare riforniti, presidiare la dorsale, tagliare quella nemica, non aprire buchi. */
export function supplyScore(state: GameState, data: GameData, unit: Unit, w: AiWeights, s: SupplyView, h: Axial): number {
  const k = hexKey(h);
  let score = s.own.hexes.has(k) ? 0 : -w.outOfSupplyPenalty;
  if (isAirType(getUnitType(data, unit.typeId))) return score;
  if (!hexEquals(h, unit.pos)) score -= w.leaveGapPenalty * s.gapLoss;
  if (s.own.trunk.has(k) && threatened(state, data, unit.side, h)) score += w.guardTrunkBonus;
  const cuts = exertsZoc(data, unit) ? [h, ...hexNeighbors(h)] : [h];
  const enemySide = otherSide(unit.side);
  for (const c of cuts) {
    if (s.enemyTrunk.has(hexKey(c)) && groundUnitAt(state, data, c)?.side !== enemySide) score += w.cutTrunkBonus;
  }
  return score;
}

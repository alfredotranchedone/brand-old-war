import { attackPower, isEntrenchedEffective } from '../core/combatPower';
import { type GameData, getUnitType } from '../core/data';
import { type GameState, liveUnits } from '../core/game';
import { type Axial, hexDistance, hexEquals, hexKey } from '../core/hex';
import { objectiveAt } from '../core/map';
import type { AiWeights } from '../core/rules';
import { type SupplyNetwork, supplyNetwork } from '../core/supplyNetwork';
import { type Unit, otherSide } from '../core/units';

export interface ScoreContext {
  readonly state: GameState;
  readonly data: GameData;
  readonly unit: Unit;
  readonly weights: AiWeights;
  readonly supply: SupplyNetwork;
}

export function aiWeights(state: GameState, data: GameData): AiWeights {
  const w = data.rules.ai.postures[state.setup.aiPosture];
  if (!w) throw new Error(`Postura IA sconosciuta: ${state.setup.aiPosture}`);
  return w;
}

export function scoreContext(state: GameState, data: GameData, unit: Unit): ScoreContext {
  return { state, data, unit, weights: aiWeights(state, data), supply: supplyNetwork(state, data, unit.side) };
}

/** Potenza nemica che potrebbe colpire l'unità in `h` nel prossimo turno (stima per distanza). */
function exposure(ctx: ScoreContext, h: Axial): number {
  const { state, data, unit } = ctx;
  const placed = { ...unit, pos: h };
  let sum = 0;
  for (const e of liveUnits(state, otherSide(unit.side))) {
    const t = getUnitType(data, e.typeId);
    if (hexDistance(e.pos, h) <= t.move + t.range) sum += attackPower(state, data, e, placed);
  }
  return sum;
}

/** Punteggio di posizione dell'unità del contesto se si trovasse in `h`. */
export function positionScore(ctx: ScoreContext, h: Axial): number {
  const { state, unit, weights: w } = ctx;
  let score = 0;
  for (const o of state.map.objectives) score += (w.objectiveProximity * o.points) / (1 + hexDistance(h, o.pos));
  const friends = liveUnits(state, unit.side).filter((u) => u.id !== unit.id && hexDistance(u.pos, h) === 1);
  score += w.friendlyAdjacent * friends.length;
  if (!ctx.supply.cost.has(hexKey(h))) score -= w.outOfSupplyPenalty;
  score -= w.exposurePenalty * exposure(ctx, h);
  if (hexEquals(h, unit.pos)) {
    if (unit.entrenched && objectiveAt(state.map, h)) score += w.holdObjectiveBonus;
    if (isEntrenchedEffective(ctx.data, unit)) score += w.holdEntrenchedBonus;
  }
  return score;
}

import { attackPower, isEntrenchedEffective } from '../core/combatPower';
import { type GameData, getUnitType } from '../core/data';
import { type GameState, liveUnits } from '../core/game';
import { type Axial, hexDistance, hexEquals } from '../core/hex';
import { objectiveAt } from '../core/map';
import type { AiWeights } from '../core/rules';
import { type Unit, otherSide } from '../core/units';
import { type SupplyView, supplyScore, supplyView } from './supplyScore';

export interface ScoreContext {
  readonly state: GameState;
  readonly data: GameData;
  readonly unit: Unit;
  readonly weights: AiWeights;
  readonly supply: SupplyView;
}

export function aiWeights(state: GameState, data: GameData): AiWeights {
  const w = data.rules.ai.postures[state.setup.aiPosture];
  if (!w) throw new Error(`Postura IA sconosciuta: ${state.setup.aiPosture}`);
  return w;
}

export function scoreContext(state: GameState, data: GameData, unit: Unit): ScoreContext {
  return { state, data, unit, weights: aiWeights(state, data), supply: supplyView(state, data, unit) };
}

/** Stima della potenza nemica che potrebbe colpire qui, basata su distanza. */
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

/** Calcola il punteggio di una posizione per l'IA: vicinanza agli obiettivi, supporto di alleati, rifornimenti, esposizione al fuoco nemico. */
export function positionScore(ctx: ScoreContext, h: Axial): number {
  const { state, unit, weights: w } = ctx;
  let score = 0;
  for (const o of state.map.objectives) score += (w.objectiveProximity * o.points) / (1 + hexDistance(h, o.pos));
  const friends = liveUnits(state, unit.side).filter((u) => u.id !== unit.id && hexDistance(u.pos, h) === 1);
  score += w.friendlyAdjacent * friends.length;
  score += supplyScore(state, ctx.data, unit, w, ctx.supply, h);
  score -= w.exposurePenalty * exposure(ctx, h);
  if (hexEquals(h, unit.pos)) {
    if (unit.entrenched && objectiveAt(state.map, h)) score += w.holdObjectiveBonus;
    if (isEntrenchedEffective(ctx.data, unit)) score += w.holdEntrenchedBonus;
  }
  return score;
}

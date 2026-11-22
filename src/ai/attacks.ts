import type { Action } from '../core/actions';
import { attackableTargets, previewCombat } from '../core/combat';
import { type GameData, getUnitType } from '../core/data';
import { type GameState, liveUnits } from '../core/game';
import { hexDistance } from '../core/hex';
import { objectiveAt } from '../core/map';
import { type Side, type Unit, hasTag } from '../core/units';

const THREAT_RANGE = 2;
const THREAT_BONUS = 1.5;

interface Candidate {
  readonly action: Action;
  readonly score: number;
}

function best(list: Candidate[]): Action | null {
  let top: Candidate | null = null;
  for (const c of list) if (!top || c.score > top.score) top = c;
  return top?.action ?? null;
}

function isArtillery(data: GameData, u: Unit): boolean {
  return hasTag(getUnitType(data, u.typeId), 'artillery');
}

function threatensObjective(state: GameState, target: Unit): boolean {
  return state.map.objectives.some((o) => hexDistance(o.pos, target.pos) <= THREAT_RANGE);
}

/** Artiglieria: bersaglio con più perdite attese, preferendo chi minaccia un obiettivo. */
export function chooseArtilleryFire(state: GameState, data: GameData, side: Side): Action | null {
  const list: Candidate[] = [];
  for (const u of liveUnits(state, side)) {
    if (!isArtillery(data, u) || u.hasAttacked) continue;
    for (const t of attackableTargets(state, data, u.id)) {
      const p = previewCombat(state, data, u.id, t.id);
      if (!p) continue;
      const taken = p.defenderResponds ? p.attackerLosses.expected : 0;
      const score = p.defenderLosses.expected * (threatensObjective(state, t) ? THREAT_BONUS : 1) - taken;
      if (score > 0) list.push({ action: { kind: 'attack', unitId: u.id, targetId: t.id }, score });
    }
  }
  return best(list);
}

/** Unità di manovra: attacchi favorevoli o che riconquistano un obiettivo. */
export function chooseAttack(state: GameState, data: GameData, side: Side): Action | null {
  const ratio = data.rules.ai.favorableAttackRatio;
  const list: Candidate[] = [];
  for (const u of liveUnits(state, side)) {
    if (isArtillery(data, u) || u.hasAttacked) continue;
    for (const t of attackableTargets(state, data, u.id)) {
      const p = previewCombat(state, data, u.id, t.id);
      if (!p) continue;
      const inflicted = p.defenderLosses.expected;
      const aaLoss = p.aaThreat ? p.aaThreat.shots * p.aaThreat.hitChance : 0;
      const taken = (p.defenderResponds ? p.attackerLosses.expected : 0) + aaLoss;
      const objective = objectiveAt(state.map, t.pos);
      const retakes = !!objective && state.objectives[objective.id] !== side;
      if (inflicted < ratio * taken && !retakes) continue;
      list.push({ action: { kind: 'attack', unitId: u.id, targetId: t.id }, score: inflicted - taken + (retakes ? objective.points : 0) });
    }
  }
  return best(list);
}

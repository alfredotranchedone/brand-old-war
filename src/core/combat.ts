import { attackPower, defenderResponds, defensePower } from './combatPower';
import { type GameData, getUnitType } from './data';
import type { GameEvent } from './events';
import { type GameState, getUnit, liveUnits } from './game';
import { type Axial, hexDistance } from './hex';
import { type LossRange, lossRange, probAtLeast, rollLosses } from './losses';
import { findRetreatHex } from './retreat';
import { type Unit, hasTag, isAlive } from './units';

export type Check = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export function canAttack(state: GameState, data: GameData, attackerId: string, targetId: string): Check {
  const a = getUnit(state, attackerId);
  const d = getUnit(state, targetId);
  if (!a || !isAlive(a) || !d || !isAlive(d)) return { ok: false, reason: 'Unità inesistente' };
  if (state.result) return { ok: false, reason: 'Partita conclusa' };
  if (a.side !== state.activeSide) return { ok: false, reason: 'Non è il turno di questa fazione' };
  if (d.side === a.side) return { ok: false, reason: 'Bersaglio amico' };
  if (a.hasAttacked) return { ok: false, reason: "L'unità ha già attaccato" };
  const type = getUnitType(data, a.typeId);
  if (hasTag(type, 'artillery') && a.hasMoved) return { ok: false, reason: "L'artiglieria ha già mosso" };
  const dist = hexDistance(a.pos, d.pos);
  if (dist < 1 || dist > type.range) return { ok: false, reason: 'Bersaglio fuori portata' };
  return { ok: true };
}

export function attackableTargets(state: GameState, data: GameData, attackerId: string): Unit[] {
  const a = getUnit(state, attackerId);
  if (!a) return [];
  return liveUnits(state)
    .filter((u) => u.side !== a.side)
    .filter((u) => canAttack(state, data, attackerId, u.id).ok);
}

export interface CombatPreview {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackPower: number;
  readonly defensePower: number;
  readonly ratio: number;
  readonly attackerLosses: LossRange;
  readonly defenderLosses: LossRange;
  readonly defenderResponds: boolean;
  /** Probabilità che scatti la ritirata (o la perdita extra se non può ritirarsi). */
  readonly retreatChance: number;
  readonly retreatHex: Axial | null;
}

interface CombatSetup {
  readonly attacker: Unit;
  readonly defender: Unit;
  readonly attackPower: number;
  readonly defensePower: number;
  readonly ratio: number;
  readonly baseAtt: number;
  readonly baseDef: number;
  readonly responds: boolean;
  readonly retreatHex: Axial | null;
}

function setupCombat(state: GameState, data: GameData, attackerId: string, targetId: string): CombatSetup | null {
  if (!canAttack(state, data, attackerId, targetId).ok) return null;
  const attacker = getUnit(state, attackerId)!;
  const defender = getUnit(state, targetId)!;
  const pa = attackPower(state, data, attacker, defender);
  const pd = defensePower(state, data, defender);
  const ratio = pd > 0 ? pa / pd : Infinity;
  const k = data.rules.combat.maxLossesK;
  const responds = defenderResponds(attacker, defender);
  return {
    attacker,
    defender,
    attackPower: pa,
    defensePower: pd,
    ratio,
    baseDef: Number.isFinite(ratio) ? (k * ratio) / (1 + ratio) : k,
    baseAtt: responds && Number.isFinite(ratio) ? k / (1 + ratio) : 0,
    responds,
    retreatHex: findRetreatHex(state, data, defender, attacker),
  };
}

function clampRange(r: LossRange, cap: number): LossRange {
  return { min: Math.min(r.min, cap), expected: Math.min(r.expected, cap), max: Math.min(r.max, cap) };
}

export function previewCombat(state: GameState, data: GameData, attackerId: string, targetId: string): CombatPreview | null {
  const s = setupCombat(state, data, attackerId, targetId);
  if (!s) return null;
  const c = data.rules.combat;
  const att = lossRange(s.baseAtt, c.variationMin, c.variationMax);
  let def = lossRange(s.baseDef, c.variationMin, c.variationMax);

  const retreatChance =
    s.ratio >= c.retreatMinRatio ? probAtLeast(s.baseDef, c.variationMin, c.variationMax, c.retreatMinLosses) : 0;
  if (!s.retreatHex && retreatChance > 0) {
    const extra = c.noRetreatExtraLoss;
    def = {
      min: def.min + (def.min >= c.retreatMinLosses && s.ratio >= c.retreatMinRatio ? extra : 0),
      expected: def.expected + retreatChance * extra,
      max: def.max + extra,
    };
  }

  return {
    attackerId,
    targetId,
    attackPower: s.attackPower,
    defensePower: s.defensePower,
    ratio: s.ratio,
    attackerLosses: clampRange(att, s.attacker.strength),
    defenderLosses: clampRange(def, s.defender.strength),
    defenderResponds: s.responds,
    retreatChance,
    retreatHex: s.retreatHex,
  };
}

export interface CombatOutcome {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function resolveAttack(state: GameState, data: GameData, attackerId: string, targetId: string): CombatOutcome | string {
  const check = canAttack(state, data, attackerId, targetId);
  if (!check.ok) return check.reason;
  const s = setupCombat(state, data, attackerId, targetId)!;
  const c = data.rules.combat;

  const d = rollLosses(state.rngState, s.baseDef, c.variationMin, c.variationMax);
  const a = rollLosses(d.rng, s.baseAtt, c.variationMin, c.variationMax);

  let defLoss = Math.min(d.losses, s.defender.strength);
  const attLoss = Math.min(a.losses, s.attacker.strength);
  const defSurvives = defLoss < s.defender.strength;
  const retreatTriggered = defSurvives && s.ratio >= c.retreatMinRatio && defLoss >= c.retreatMinLosses;
  let retreatTo: Axial | null = null;
  let extraLoss = 0;
  if (retreatTriggered) {
    if (s.retreatHex) retreatTo = s.retreatHex;
    else {
      extraLoss = Math.min(c.noRetreatExtraLoss, s.defender.strength - defLoss);
      defLoss += extraLoss;
    }
  }

  const defStrength = s.defender.strength - defLoss;
  const attStrength = s.attacker.strength - attLoss;
  const attackerType = getUnitType(data, s.attacker.typeId);
  const vacated = defStrength === 0 || retreatTo !== null;
  const canAdvance =
    vacated && attStrength > 0 && s.responds && !hasTag(attackerType, 'artillery');

  const units = state.units.map((u) => {
    if (u.id === s.attacker.id) return { ...u, strength: attStrength, hasAttacked: true, movesLeft: 0 };
    if (u.id === s.defender.id) {
      return { ...u, strength: defStrength, pos: retreatTo ?? u.pos, entrenched: retreatTo ? false : u.entrenched };
    }
    return u;
  });

  const event: GameEvent = {
    kind: 'combat',
    attackerId,
    targetId,
    ratio: s.ratio,
    attackerLosses: attLoss,
    defenderLosses: defLoss,
    extraLoss,
    retreatTo,
    attackerDestroyed: attStrength === 0,
    defenderDestroyed: defStrength === 0,
  };

  return {
    state: {
      ...state,
      units,
      rngState: a.rng,
      log: [...state.log, event],
      pendingAdvance: canAdvance ? { unitId: attackerId, to: s.defender.pos } : undefined,
    },
    events: [event],
  };
}

export function resolveAdvance(state: GameState, unitId: string, to: Axial): CombatOutcome | string {
  const p = state.pendingAdvance;
  if (!p || p.unitId !== unitId || p.to.q !== to.q || p.to.r !== to.r) return 'Avanzata non disponibile';
  const event: GameEvent = { kind: 'advance', unitId, to };
  return {
    state: {
      ...state,
      units: state.units.map((u) => (u.id === unitId ? { ...u, pos: to, entrenched: false } : u)),
      log: [...state.log, event],
      pendingAdvance: undefined,
    },
    events: [event],
  };
}

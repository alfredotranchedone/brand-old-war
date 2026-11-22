/**
 * Parametri di bilanciamento (rules.json). Tutti i numeri delle regole stanno qui.
 */
import { UNIT_TAGS, type UnitTag } from './units';
import { DataError, array, bool, int, num, oneOf, record } from './validate';

export interface AiWeights {
  readonly objectiveProximity: number;
  readonly friendlyAdjacent: number;
  readonly outOfSupplyPenalty: number;
  readonly exposurePenalty: number;
  readonly holdObjectiveBonus: number;
}

export interface Rules {
  readonly maxStrength: number;
  readonly entrenchment: {
    readonly defenseMultiplier: number;
    readonly appliesToTags: readonly UnitTag[];
  };
  readonly zoc: {
    readonly minStrength: number;
    readonly artilleryZocOnlyIfNotFired: boolean;
  };
  readonly combat: {
    readonly maxLossesK: number;
    readonly variationMin: number;
    readonly variationMax: number;
    readonly retreatMinRatio: number;
    readonly retreatMinLosses: number;
    readonly noRetreatExtraLoss: number;
  };
  readonly supply: {
    readonly maxPathCost: number;
    readonly outOfSupply1: { readonly attackMultiplier: number; readonly moveDelta: number };
    readonly outOfSupply2: {
      readonly attackMultiplier: number;
      readonly defenseMultiplier: number;
      readonly moveMultiplier: number;
      readonly strengthLossPerTurn: number;
    };
  };
  readonly victory: { readonly enemyStepsPerPoint: number };
  readonly ai: {
    readonly turnTimeLimitMs: number;
    readonly animationMs: number;
    readonly favorableAttackRatio: number;
    readonly postures: Readonly<Record<string, AiWeights>>;
  };
}

export function parseRules(raw: unknown): Rules {
  const p = 'rules.json';
  const o = record(raw, p);
  const ent = record(o.entrenchment, `${p}.entrenchment`);
  const zoc = record(o.zoc, `${p}.zoc`);
  const c = record(o.combat, `${p}.combat`);
  const s = record(o.supply, `${p}.supply`);
  const s1 = record(s.outOfSupply1, `${p}.supply.outOfSupply1`);
  const s2 = record(s.outOfSupply2, `${p}.supply.outOfSupply2`);
  const v = record(o.victory, `${p}.victory`);
  const ai = record(o.ai, `${p}.ai`);
  const postures = record(ai.postures, `${p}.ai.postures`);

  const variationMin = num(c.variationMin, `${p}.combat.variationMin`, 0);
  const variationMax = num(c.variationMax, `${p}.combat.variationMax`, 0);
  if (variationMax < variationMin) {
    throw new DataError(`${p}.combat`, 'variationMax deve essere ≥ variationMin');
  }

  const parsedPostures: Record<string, AiWeights> = {};
  for (const [name, w] of Object.entries(postures)) {
    const wp = `${p}.ai.postures.${name}`;
    const wo = record(w, wp);
    parsedPostures[name] = {
      objectiveProximity: num(wo.objectiveProximity, `${wp}.objectiveProximity`),
      friendlyAdjacent: num(wo.friendlyAdjacent, `${wp}.friendlyAdjacent`),
      outOfSupplyPenalty: num(wo.outOfSupplyPenalty, `${wp}.outOfSupplyPenalty`),
      exposurePenalty: num(wo.exposurePenalty, `${wp}.exposurePenalty`),
      holdObjectiveBonus: num(wo.holdObjectiveBonus, `${wp}.holdObjectiveBonus`),
    };
  }

  return {
    maxStrength: int(o.maxStrength, `${p}.maxStrength`, 1),
    entrenchment: {
      defenseMultiplier: num(ent.defenseMultiplier, `${p}.entrenchment.defenseMultiplier`, 0),
      appliesToTags: array(ent.appliesToTags, `${p}.entrenchment.appliesToTags`).map((t, i) =>
        oneOf(t, `${p}.entrenchment.appliesToTags[${i}]`, UNIT_TAGS),
      ),
    },
    zoc: {
      minStrength: int(zoc.minStrength, `${p}.zoc.minStrength`, 0),
      artilleryZocOnlyIfNotFired: bool(zoc.artilleryZocOnlyIfNotFired, `${p}.zoc.artilleryZocOnlyIfNotFired`),
    },
    combat: {
      maxLossesK: num(c.maxLossesK, `${p}.combat.maxLossesK`, 0),
      variationMin,
      variationMax,
      retreatMinRatio: num(c.retreatMinRatio, `${p}.combat.retreatMinRatio`, 0),
      retreatMinLosses: int(c.retreatMinLosses, `${p}.combat.retreatMinLosses`, 0),
      noRetreatExtraLoss: int(c.noRetreatExtraLoss, `${p}.combat.noRetreatExtraLoss`, 0),
    },
    supply: {
      maxPathCost: num(s.maxPathCost, `${p}.supply.maxPathCost`, 0),
      outOfSupply1: {
        attackMultiplier: num(s1.attackMultiplier, `${p}.supply.outOfSupply1.attackMultiplier`, 0),
        moveDelta: int(s1.moveDelta, `${p}.supply.outOfSupply1.moveDelta`),
      },
      outOfSupply2: {
        attackMultiplier: num(s2.attackMultiplier, `${p}.supply.outOfSupply2.attackMultiplier`, 0),
        defenseMultiplier: num(s2.defenseMultiplier, `${p}.supply.outOfSupply2.defenseMultiplier`, 0),
        moveMultiplier: num(s2.moveMultiplier, `${p}.supply.outOfSupply2.moveMultiplier`, 0),
        strengthLossPerTurn: int(s2.strengthLossPerTurn, `${p}.supply.outOfSupply2.strengthLossPerTurn`, 0),
      },
    },
    victory: { enemyStepsPerPoint: num(v.enemyStepsPerPoint, `${p}.victory.enemyStepsPerPoint`, 1) },
    ai: {
      turnTimeLimitMs: num(ai.turnTimeLimitMs, `${p}.ai.turnTimeLimitMs`, 0),
      animationMs: num(ai.animationMs, `${p}.ai.animationMs`, 0),
      favorableAttackRatio: num(ai.favorableAttackRatio, `${p}.ai.favorableAttackRatio`, 0),
      postures: parsedPostures,
    },
  };
}

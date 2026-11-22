import { type GameData, getUnitType } from './data';
import { type GameState, currentConditions } from './game';
import { hexDistance } from './hex';
import { terrainAt } from './map';
import { supplyEffects } from './supply';
import { type Unit, hasTag } from './units';

export function isEntrenchedEffective(data: GameData, unit: Unit): boolean {
  if (!unit.entrenched) return false;
  const type = getUnitType(data, unit.typeId);
  return data.rules.entrenchment.appliesToTags.some((t) => hasTag(type, t));
}

/** P_att = F × A(bersaglio) × M_att */
export function attackPower(state: GameState, data: GameData, attacker: Unit, defender: Unit): number {
  const aType = getUnitType(data, attacker.typeId);
  const dType = getUnitType(data, defender.typeId);
  let mod = supplyEffects(data.rules, attacker).attack;
  if (hasTag(aType, 'artillery')) mod *= data.weather[currentConditions(state).weather]?.artilleryMod ?? 1;
  return attacker.strength * aType.attack[dType.targetClass] * mod;
}

/** Moltiplicatore difensivo del terreno, trincea compresa. */
export function terrainDefenseMod(state: GameState, data: GameData, defender: Unit): number {
  const terrain = terrainAt(state.map, data.terrain, defender.pos);
  return terrain.defenseMod * (isEntrenchedEffective(data, defender) ? terrain.entrenchmentMod : 1);
}

/** P_dif = F × D × M_terreno × M_dif; `terrainMod` sostituisce quello del terreno (copertura d'artiglieria). */
export function defensePower(state: GameState, data: GameData, defender: Unit, terrainMod?: number): number {
  const type = getUnitType(data, defender.typeId);
  const mod = supplyEffects(data.rules, defender).defense;
  return defender.strength * type.defense * (terrainMod ?? terrainDefenseMod(state, data, defender)) * mod;
}

/** Il difensore risponde solo agli attacchi da esagono adiacente. */
export function defenderResponds(attacker: Unit, defender: Unit): boolean {
  return hexDistance(attacker.pos, defender.pos) <= 1;
}

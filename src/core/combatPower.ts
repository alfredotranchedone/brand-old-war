import { type GameData, getUnitType } from './data';
import { type GameState, currentConditions, groundUnitAt, isAirUnit } from './game';
import { hexDistance, hexNeighbors } from './hex';
import { terrainAt } from './map';
import { supplyEffects } from './supply';
import { type Unit, hasTag, isAlive } from './units';

export function isEntrenchedEffective(data: GameData, unit: Unit): boolean {
  if (!unit.entrenched) return false;
  const type = getUnitType(data, unit.typeId);
  return data.rules.entrenchment.appliesToTags.some((t) => hasTag(type, t));
}

/** Genieri nemici adiacenti al difensore: la sua trincea non conta. */
export function entrenchmentNegated(state: GameState, data: GameData, defender: Unit): boolean {
  return hexNeighbors(defender.pos).some((h) => {
    const u = groundUnitAt(state, data, h);
    return !!u && isAlive(u) && u.side !== defender.side && hasTag(getUnitType(data, u.typeId), 'engineer');
  });
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
  if (isAirUnit(data, defender)) return 1;
  const terrain = terrainAt(state.map, data.terrain, defender.pos);
  const entrenched = isEntrenchedEffective(data, defender) && !entrenchmentNegated(state, data, defender);
  return terrain.defenseMod * (entrenched ? terrain.entrenchmentMod : 1);
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

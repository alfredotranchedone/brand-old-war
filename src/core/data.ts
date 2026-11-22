/**
 * Dati statici di gioco: tipi di unità, terreno, meteo, regole.
 * Non fanno parte del GameState (non cambiano durante la partita) e vengono
 * passati esplicitamente alle funzioni del motore.
 */
import { type TerrainTable, parseTerrain } from './map';
import { type Rules, parseRules } from './rules';
import { type UnitType, type UnitTypeTable, parseUnitTypes } from './units';
import { type WeatherTable, parseWeather } from './weather';

export interface GameData {
  readonly unitTypes: UnitTypeTable;
  readonly terrain: TerrainTable;
  readonly weather: WeatherTable;
  readonly rules: Rules;
}

export interface RawGameData {
  readonly units: unknown;
  readonly terrain: unknown;
  readonly weather: unknown;
  readonly rules: unknown;
}

export function parseGameData(raw: RawGameData): GameData {
  return {
    unitTypes: parseUnitTypes(raw.units),
    terrain: parseTerrain(raw.terrain),
    weather: parseWeather(raw.weather),
    rules: parseRules(raw.rules),
  };
}

export function getUnitType(data: GameData, typeId: string): UnitType {
  const t = data.unitTypes[typeId];
  if (!t) throw new Error(`Tipo di unità sconosciuto: ${typeId}`);
  return t;
}

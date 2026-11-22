/**
 * Punto unico di caricamento dei dati JSON del gioco.
 * Gli errori nei file vengono segnalati all'avvio con il percorso del campo sbagliato.
 */
import { type GameData, parseGameData } from '../core/data';
import { type Scenario, parseScenario } from '../core/scenario';
import rulesJson from './rules.json';
import terrainJson from './terrain.json';
import unitsJson from './units.json';
import weatherJson from './weather.json';
import croceviaJson from './scenarios/crocevia.json';

export function loadGameData(): GameData {
  return parseGameData({ units: unitsJson, terrain: terrainJson, weather: weatherJson, rules: rulesJson });
}

export function loadScenario(data: GameData, id = 'crocevia'): Scenario {
  const scenarios: Record<string, unknown> = { crocevia: croceviaJson };
  const raw = scenarios[id];
  if (!raw) throw new Error(`Scenario sconosciuto: ${id}`);
  return parseScenario(raw, data, `scenarios/${id}.json`);
}

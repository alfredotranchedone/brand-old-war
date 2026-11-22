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

export function loadGameData(): GameData {
  return parseGameData({ units: unitsJson, terrain: terrainJson, weather: weatherJson, rules: rulesJson });
}

/** Tutti i file in src/scenarios/, per id (nome del file senza .json). Basta aggiungere un file per renderlo giocabile. */
const scenarioFiles: Record<string, unknown> = Object.fromEntries(
  Object.entries(import.meta.glob<unknown>('../scenarios/*.json', { eager: true, import: 'default' })).map(([path, json]) => [
    path.replace(/^.*\/(.+)\.json$/, '$1'),
    json,
  ]),
);

export const DEFAULT_SCENARIO = 'crocevia';

/** Impronta del file dello scenario: cambia se il file viene modificato. */
export function scenarioFingerprint(id: string): string | undefined {
  const raw = scenarioFiles[id];
  if (!raw) return undefined;
  let h = 0;
  for (const c of JSON.stringify(raw)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

export function loadScenario(data: GameData, id = DEFAULT_SCENARIO): Scenario {
  const raw = scenarioFiles[id];
  if (!raw) throw new Error(`Scenario sconosciuto: ${id}`);
  return parseScenario(raw, data, `scenarios/${id}.json`);
}

export interface ScenarioEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Errore di validazione: lo scenario non si può giocare. */
  readonly error?: string;
}

/** Elenco degli scenari per la scelta a inizio partita; quelli non validi restano in elenco con l'errore. */
export function listScenarios(data: GameData): ScenarioEntry[] {
  return Object.keys(scenarioFiles)
    .sort()
    .map((id) => {
      try {
        const s = loadScenario(data, id);
        if (s.id !== id) throw new Error(`scenarios/${id}.json: l'id "${s.id}" deve coincidere con il nome del file`);
        return { id, name: s.name, description: s.description };
      } catch (e) {
        return { id, name: id, description: '', error: e instanceof Error ? e.message : String(e) };
      }
    });
}

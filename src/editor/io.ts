/** Validazione, esportazione e importazione degli scenari dell'editor. */
import type { GameData } from '../core/data';
import { parseScenario } from '../core/scenario';
import { type ScenarioJson, blankScenario } from './model';

export interface Check {
  /** Errori che impediscono di caricare lo scenario nel gioco. */
  readonly errors: string[];
  /** Cose probabilmente sbagliate, ma ammesse. */
  readonly warnings: string[];
}

/** Il documento come va scritto nel file: la descrizione vuota si omette. */
function forFile(doc: ScenarioJson): Partial<ScenarioJson> {
  const { description, ...rest } = doc;
  return description.trim() ? doc : rest;
}

export function checkScenario(doc: ScenarioJson, data: GameData): Check {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    parseScenario(forFile(doc), data, `${doc.id}.json`);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  if (!/^[a-z0-9_-]+$/.test(doc.id)) errors.push('Id: solo lettere minuscole, cifre, "_" e "-" (diventa il nome del file)');
  if (!doc.name.trim()) errors.push('Manca il nome dello scenario');
  if (doc.objectives.length === 0) warnings.push('Nessun obiettivo');
  return { errors, warnings };
}

export function toJsonText(doc: ScenarioJson): string {
  return `${JSON.stringify(forFile(doc), null, 2)}\n`;
}

export function downloadJson(doc: ScenarioJson): void {
  const url = URL.createObjectURL(new Blob([toJsonText(doc)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Legge un file di scenario; i campi mancanti prendono i valori di uno scenario vuoto. */
export function fromJson(raw: unknown, data: GameData): ScenarioJson {
  parseScenario(raw, data, 'file importato');
  const base = blankScenario();
  const o = raw as Partial<ScenarioJson>;
  return {
    ...base,
    ...o,
    description: o.description ?? '',
    sideNames: { ...base.sideNames, ...o.sideNames },
    map: { ...base.map, ...o.map, hexes: o.map?.hexes ?? [], edges: [] },
    objectives: o.objectives ?? [],
    units: o.units ?? [],
  } as ScenarioJson;
}

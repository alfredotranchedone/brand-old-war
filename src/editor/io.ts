/** Validazione, esportazione e importazione degli scenari dell'editor. */
import type { GameData } from '../core/data';
import { parseScenario } from '../core/scenario';
import { formatJson, fromFile, toFile } from './fileFormat';
import type { ScenarioJson } from './model';

export interface Check {
  /** Errori che impediscono di caricare lo scenario nel gioco. */
  readonly errors: string[];
  /** Cose probabilmente sbagliate, ma ammesse. */
  readonly warnings: string[];
}

export function checkScenario(doc: ScenarioJson, data: GameData): Check {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    parseScenario(toFile(doc, data), data, `${doc.id}.json`);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  if (!/^[a-z0-9_-]+$/.test(doc.id)) errors.push('Id: solo lettere minuscole, cifre, "_" e "-" (diventa il nome del file)');
  if (!doc.name.trim()) errors.push('Manca il nome dello scenario');
  if (doc.objectives.length === 0) warnings.push('Nessun obiettivo');
  return { errors, warnings };
}

export function toJsonText(doc: ScenarioJson, data: GameData): string {
  return formatJson(toFile(doc, data));
}

export function downloadJson(doc: ScenarioJson, data: GameData): void {
  const url = URL.createObjectURL(new Blob([toJsonText(doc, data)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Legge e valida un file di scenario. */
export function fromJson(raw: unknown, data: GameData): ScenarioJson {
  parseScenario(raw, data, 'file importato');
  return fromFile(raw, data);
}

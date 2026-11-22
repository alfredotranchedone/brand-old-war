/** Modifiche pure allo scenario in editor: ognuna restituisce un nuovo documento. */
import type { HexJson, ScenarioJson } from './model';

export const LIMITS = { minSize: 4, maxSize: 60, minTurns: 1, maxTurns: 30 } as const;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

/** Imposta il terreno di un esagono; il terreno di default non viene scritto nel file. */
export function paintTerrain(doc: ScenarioJson, col: number, row: number, terrain: string): ScenarioJson {
  const i = doc.map.hexes.findIndex((h) => h.col === col && h.row === row);
  const prev: HexJson = i >= 0 ? doc.map.hexes[i]! : { col, row };
  if ((prev.terrain ?? doc.map.defaultTerrain) === terrain) return doc;
  const next: HexJson = { ...prev, terrain };
  if (terrain === doc.map.defaultTerrain) delete next.terrain;
  const hexes = doc.map.hexes.filter((_, j) => j !== i);
  if (next.terrain !== undefined || next.label !== undefined) hexes.push(next);
  return { ...doc, map: { ...doc.map, hexes } };
}

/** Cambia le dimensioni; quello che resta fuori mappa viene tolto. */
export function resize(doc: ScenarioJson, width: number, height: number): ScenarioJson {
  const w = clamp(width, LIMITS.minSize, LIMITS.maxSize);
  const h = clamp(height, LIMITS.minSize, LIMITS.maxSize);
  const inside = (o: { col: number; row: number }) => o.col < w && o.row < h;
  return {
    ...doc,
    map: { ...doc.map, width: w, height: h, hexes: doc.map.hexes.filter(inside) },
    objectives: doc.objectives.filter(inside),
    units: doc.units.filter(inside),
  };
}

/** Numero di turni: le condizioni dei turni nuovi copiano l'ultimo turno. */
export function setTurns(doc: ScenarioJson, turns: number): ScenarioJson {
  const max = clamp(turns, LIMITS.minTurns, LIMITS.maxTurns);
  const last = doc.turns.conditions.at(-1) ?? { weather: 'clear', daylight: 'day' };
  const conditions = Array.from({ length: max }, (_, i) => doc.turns.conditions[i] ?? { ...last });
  return { ...doc, turns: { ...doc.turns, max, conditions } };
}

type At = { col: number; row: number };
const notAt = (col: number, row: number) => (o: At) => o.col !== col || o.row !== row;

export interface UnitDraft {
  side: 'blue' | 'red';
  type: string;
  strength: number;
  entrenched: boolean;
}

/** Id libero con il prefisso dato: prefisso-1, prefisso-2, … */
function freeId(prefix: string, taken: readonly { id: string }[]): string {
  const ids = new Set(taken.map((t) => t.id));
  let n = 1;
  while (ids.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/** Mette un'unità nell'esagono, sostituendo quella dello stesso posto (terrestre o aereo). */
export function placeUnit(doc: ScenarioJson, col: number, row: number, d: UnitDraft, isAir: (type: string) => boolean): ScenarioJson {
  const elsewhere = notAt(col, row);
  const others = doc.units.filter((u) => elsewhere(u) || isAir(u.type) !== isAir(d.type));
  const id = freeId(`${d.side === 'blue' ? 'b' : 'r'}-${d.type}`, others);
  const unit = { id, type: d.type, side: d.side, col, row, strength: d.strength, ...(d.entrenched ? { entrenched: true } : {}) };
  return { ...doc, units: [...others, unit] };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'obiettivo';

/** Mette un obiettivo nell'esagono, sostituendo quello che c'era. */
export function placeObjective(doc: ScenarioJson, col: number, row: number, name: string, points: number): ScenarioJson {
  const others = doc.objectives.filter(notAt(col, row));
  const base = slug(name);
  const id = others.some((o) => o.id === base) ? freeId(base, others) : base;
  return { ...doc, objectives: [...others, { id, name, col, row, points }] };
}

/** Nome di località dell'esagono; vuoto lo toglie. */
export function setLabel(doc: ScenarioJson, col: number, row: number, label: string): ScenarioJson {
  const i = doc.map.hexes.findIndex((h) => h.col === col && h.row === row);
  const prev: HexJson = i >= 0 ? doc.map.hexes[i]! : { col, row };
  const next: HexJson = { ...prev };
  if (label.trim()) next.label = label.trim();
  else delete next.label;
  const hexes = doc.map.hexes.filter((_, j) => j !== i);
  if (next.terrain !== undefined || next.label !== undefined) hexes.push(next);
  return { ...doc, map: { ...doc.map, hexes } };
}

/** Toglie unità, obiettivo e nome di località dall'esagono (il terreno resta). */
export function eraseAt(doc: ScenarioJson, col: number, row: number): ScenarioJson {
  const at = (o: At) => o.col === col && o.row === row;
  const hasLabel = doc.map.hexes.some((h) => at(h) && h.label !== undefined);
  if (!hasLabel && !doc.units.some(at) && !doc.objectives.some(at)) return doc;
  const cleared = setLabel(doc, col, row, '');
  return { ...cleared, units: doc.units.filter(notAt(col, row)), objectives: doc.objectives.filter(notAt(col, row)) };
}

/** Esagoni coperti dal pennello: blocco di lato `size` centrato su (col, row), entro la mappa. */
export function brushArea(doc: ScenarioJson, col: number, row: number, size: number): At[] {
  const from = -Math.floor((size - 1) / 2);
  const out: At[] = [];
  for (let dc = from; dc < from + size; dc++) {
    for (let dr = from; dr < from + size; dr++) {
      const c = col + dc;
      const r = row + dr;
      if (c >= 0 && r >= 0 && c < doc.map.width && r < doc.map.height) out.push({ col: c, row: r });
    }
  }
  return out;
}

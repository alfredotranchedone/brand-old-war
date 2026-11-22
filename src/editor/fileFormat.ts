/** Conversione tra il documento dell'editor e il file JSON compatto dello scenario. */
import type { GameData } from '../core/data';
import { SIDES, type Side } from '../core/units';
import { type HexJson, type ScenarioJson, blankScenario } from './model';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Loc = [number, number];
type Placed = { col: number; row: number };

/** {col, row, …} → {…, loc: [col, row]}, con loc al posto di col. */
function toLoc<T extends Placed>(o: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(o).flatMap(([k, v]): [string, unknown][] => (k === 'col' ? [['loc', [o.col, o.row]]] : k === 'row' ? [] : [[k, v]])),
  );
}

/** {…, loc: [col, row]} → {…, col, row}. */
function fromLoc<T>(o: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(o).flatMap(([k, v]): [string, unknown][] => (k === 'loc' ? [['col', (v as Loc)[0]], ['row', (v as Loc)[1]]] : [[k, v]])),
  ) as T;
}

/** Unità nel file: senza fazione (è nel gruppo), "str" e "ent" abbreviati. */
function unitToFile({ side: _, strength, entrenched, ...u }: ScenarioJson['units'][number]): Record<string, unknown> {
  return { ...toLoc(u), str: strength, ...(entrenched ? { ent: true } : {}) };
}

function unitFromFile({ str, ent, ...u }: Record<string, unknown>, side: Side): ScenarioJson['units'][number] {
  return { ...fromLoc<Omit<ScenarioJson['units'][number], 'side' | 'strength'>>(u), side, strength: str as number, ...(ent ? { entrenched: true } : {}) };
}

const mapSides = <A, B>(r: Record<Side, A>, f: (a: A) => B): Record<Side, B> => ({ blue: f(r.blue), red: f(r.red) });

/** Il documento come va scritto nel file: griglia dei terreni, posizioni [col, riga], condizioni [meteo, luce]. */
export function toFile(doc: ScenarioJson, data: GameData): Record<string, unknown> {
  const { map, turns } = doc;
  const code = (id: string) => data.terrain[id]?.code ?? '?';
  const at = new Map(map.hexes.map((h) => [`${h.col},${h.row}`, h]));
  const terrain = Array.from({ length: map.height }, (_, row) =>
    Array.from({ length: map.width }, (_, col) => code(at.get(`${col},${row}`)?.terrain ?? map.defaultTerrain)).join(''),
  );
  const labels = map.hexes.filter((h) => h.label !== undefined).map((h) => ({ loc: [h.col, h.row], label: h.label }));
  const out: Record<string, unknown> = {
    ...doc,
    map: { width: map.width, height: map.height, terrain, labels, edges: [] },
    objectives: doc.objectives.map(toLoc),
    supplySources: mapSides(doc.supplySources, (s) => ({ ...s, hexes: s.hexes.map((h) => [h.col, h.row]) })),
    turns: { ...turns, conditions: turns.conditions.map((c) => [c.weather, c.daylight]) },
    units: Object.fromEntries(SIDES.map((side) => [side, doc.units.filter((u) => u.side === side).map(unitToFile)])),
  };
  if (!doc.description.trim()) delete out.description;
  return out;
}

interface FileShape {
  map: { width: number; height: number; terrain: string[]; labels?: { loc: Loc; label: string }[] };
  objectives?: Record<string, unknown>[];
  supplySources: Record<Side, { edges: ScenarioJson['supplySources'][Side]['edges']; hexes?: Loc[] }>;
  turns: { max: number; firstSide: Side; conditions: [string, string][] };
  units: Partial<Record<Side, Record<string, unknown>[]>>;
}

/** Legge un file già validato; i campi mancanti prendono i valori di uno scenario vuoto. */
export function fromFile(raw: unknown, data: GameData): ScenarioJson {
  const base = blankScenario();
  const o = raw as Omit<Partial<ScenarioJson>, keyof FileShape> & FileShape;
  const byCode = new Map(Object.values(data.terrain).map((t) => [t.code, t.id]));
  const hexes = new Map<string, HexJson>();
  o.map.terrain.forEach((line, row) =>
    [...line].forEach((c, col) => {
      const terrain = byCode.get(c)!;
      if (terrain !== base.map.defaultTerrain) hexes.set(`${col},${row}`, { col, row, terrain });
    }),
  );
  for (const { loc: [col, row], label } of o.map.labels ?? []) {
    const k = `${col},${row}`;
    hexes.set(k, { ...(hexes.get(k) ?? { col, row }), label });
  }
  return {
    ...base,
    ...o,
    description: o.description ?? '',
    sideNames: { ...base.sideNames, ...o.sideNames },
    map: { width: o.map.width, height: o.map.height, defaultTerrain: base.map.defaultTerrain, hexes: [...hexes.values()], edges: [] },
    objectives: (o.objectives ?? []).map((x) => fromLoc<ScenarioJson['objectives'][number]>(x)),
    supplySources: mapSides(o.supplySources, (s) => ({ edges: s.edges, hexes: (s.hexes ?? []).map(([col, row]) => ({ col, row })) })),
    turns: { ...o.turns, conditions: o.turns.conditions.map(([weather, daylight]) => ({ weather, daylight })) },
    units: SIDES.flatMap((side) => (o.units[side] ?? []).map((x) => unitFromFile(x, side))),
  };
}

/** JSON indentato, con su una riga sola ogni valore che ci sta in `width` caratteri. */
export function formatJson(value: unknown, width = 120): string {
  const fmt = (v: Json, indent: string): string => {
    const flat = JSON.stringify(v);
    if (v === null || typeof v !== 'object' || flat.length + indent.length <= width) return flat;
    const inner = `${indent}  `;
    const items = Array.isArray(v) ? v.map((x) => fmt(x, inner)) : Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${fmt(x, inner)}`);
    const [open, close] = Array.isArray(v) ? ['[', ']'] : ['{', '}'];
    return `${open}\n${items.map((s) => inner + s).join(',\n')}\n${indent}${close}`;
  };
  return `${fmt(JSON.parse(JSON.stringify(value)) as Json, '')}\n`;
}

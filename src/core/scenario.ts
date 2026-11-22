/**
 * Caricamento e validazione di uno scenario (scenarios/*.json).
 * Nei file le posizioni sono in offset odd-q (col, row); qui diventano assiali.
 */
import type { GameData } from './data';
import { type Axial, type HexKey, hexKey, offsetToAxial } from './hex';
import {
  type HexData,
  type HexEdge,
  MAP_EDGE_NAMES,
  type MapData,
  type Objective,
  assertOnMap,
  edgeHexes,
} from './map';
import { SIDES, type Side, isAirType } from './units';
import {
  DataError,
  array,
  bool,
  int,
  oneOf,
  optional,
  record,
  str,
  type Json,
} from './validate';
import { DAYLIGHTS, type TurnConditions } from './weather';

export type AiPosture = string;

export interface ScenarioUnit {
  readonly id: string;
  readonly typeId: string;
  readonly side: Side;
  readonly pos: Axial;
  readonly strength: number;
  readonly entrenched: boolean;
}

export interface VictoryRules {
  /** Vittoria decisiva per il giocatore. */
  readonly decisive: 'allObjectives';
  /** Vittoria marginale per il giocatore. */
  readonly marginal: 'morePoints';
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Nomi delle fazioni mostrati al giocatore; i colori restano blu e rosso. */
  readonly sideNames: Readonly<Record<Side, string>>;
  readonly seed: number;
  readonly map: MapData;
  /** Fazione che possiede gli obiettivi a inizio partita. */
  readonly defender: Side;
  readonly player: Side;
  readonly ai: { readonly side: Side; readonly posture: AiPosture };
  readonly turns: {
    readonly max: number;
    readonly firstSide: Side;
    readonly conditions: readonly TurnConditions[];
  };
  readonly victory: VictoryRules;
  readonly units: readonly ScenarioUnit[];
}

function readPos(o: Record<string, Json>, path: string): Axial {
  return offsetToAxial({ col: int(o.col, `${path}.col`), row: int(o.row, `${path}.row`) });
}

export const DEFAULT_SIDE_NAMES: Readonly<Record<Side, string>> = { blue: 'Blu', red: 'Rosso' };

function readSideNames(v: Json, path: string): Record<Side, string> {
  if (v === undefined) return { ...DEFAULT_SIDE_NAMES };
  const o = record(v, path);
  const names = {} as Record<Side, string>;
  for (const side of SIDES) names[side] = optional(o[side], DEFAULT_SIDE_NAMES[side], (x) => str(x, `${path}.${side}`));
  return names;
}

export function parseScenario(raw: unknown, data: GameData, fileName = 'scenario'): Scenario {
  const p = fileName;
  const o = record(raw, p);

  // --- Mappa ---------------------------------------------------------------
  const m = record(o.map, `${p}.map`);
  const width = int(m.width, `${p}.map.width`, 1);
  const height = int(m.height, `${p}.map.height`, 1);
  const size = { width, height };
  const defaultTerrain = str(m.defaultTerrain, `${p}.map.defaultTerrain`);
  const checkTerrain = (t: string, path: string) => {
    if (!data.terrain[t]) throw new DataError(path, `terreno "${t}" non definito in terrain.json`);
    return t;
  };
  checkTerrain(defaultTerrain, `${p}.map.defaultTerrain`);

  const hexes: Record<HexKey, HexData> = {};
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      hexes[hexKey(offsetToAxial({ col, row }))] = { terrain: defaultTerrain };
    }
  }
  array(m.hexes ?? [], `${p}.map.hexes`).forEach((v, i) => {
    const path = `${p}.map.hexes[${i}]`;
    const h = record(v, path);
    const pos = readPos(h, path);
    assertOnMap(size, pos, path);
    const key = hexKey(pos);
    const prev = hexes[key] ?? { terrain: defaultTerrain };
    const terrain = h.terrain === undefined ? prev.terrain : checkTerrain(str(h.terrain, `${path}.terrain`), `${path}.terrain`);
    const label = h.label === undefined ? prev.label : str(h.label, `${path}.label`);
    hexes[key] = label === undefined ? { terrain } : { terrain, label };
  });

  const edges: HexEdge[] = array(m.edges ?? [], `${p}.map.edges`).map((v, i) => {
    const path = `${p}.map.edges[${i}]`;
    const e = record(v, path);
    const pos = readPos(e, path);
    assertOnMap(size, pos, path);
    return { hex: pos, direction: int(e.direction, `${path}.direction`, 0, 5), type: str(e.type, `${path}.type`) };
  });

  const assertPassable = (pos: Axial, path: string) => {
    if (data.terrain[hexes[hexKey(pos)]!.terrain]!.impassable) throw new DataError(path, 'esagono su terreno invalicabile');
  };

  // --- Obiettivi -------------------------------------------------------------
  const objectiveIds = new Set<string>();
  const objectiveHexes = new Set<HexKey>();
  const objectives: Objective[] = array(o.objectives, `${p}.objectives`).map((v, i) => {
    const path = `${p}.objectives[${i}]`;
    const ob = record(v, path);
    const id = str(ob.id, `${path}.id`);
    if (objectiveIds.has(id)) throw new DataError(`${path}.id`, `id obiettivo duplicato "${id}"`);
    objectiveIds.add(id);
    const pos = readPos(ob, path);
    assertOnMap(size, pos, path);
    if (objectiveHexes.has(hexKey(pos))) throw new DataError(path, 'due obiettivi sullo stesso esagono');
    objectiveHexes.add(hexKey(pos));
    assertPassable(pos, path);
    return { id, name: str(ob.name, `${path}.name`), pos, points: int(ob.points, `${path}.points`, 0) };
  });

  // --- Sorgenti di rifornimento ---------------------------------------------
  const ss = record(o.supplySources, `${p}.supplySources`);
  const supplySources = {} as Record<Side, HexKey[]>;
  for (const side of SIDES) {
    const path = `${p}.supplySources.${side}`;
    const s = record(ss[side], path);
    const keys = new Set<HexKey>();
    array(s.edges ?? [], `${path}.edges`).forEach((e, i) => {
      for (const h of edgeHexes(width, height, oneOf(e, `${path}.edges[${i}]`, MAP_EDGE_NAMES))) keys.add(hexKey(h));
    });
    array(s.hexes ?? [], `${path}.hexes`).forEach((v, i) => {
      const hp = `${path}.hexes[${i}]`;
      const pos = readPos(record(v, hp), hp);
      assertOnMap(size, pos, hp);
      keys.add(hexKey(pos));
    });
    if (keys.size === 0) throw new DataError(path, 'nessuna sorgente di rifornimento');
    supplySources[side] = [...keys];
  }

  const map: MapData = { width, height, hexes, edges, objectives, supplySources };

  // --- Turni -----------------------------------------------------------------
  const t = record(o.turns, `${p}.turns`);
  const maxTurns = int(t.max, `${p}.turns.max`, 1);
  const conditions: TurnConditions[] = array(t.conditions, `${p}.turns.conditions`).map((v, i) => {
    const path = `${p}.turns.conditions[${i}]`;
    const c = record(v, path);
    const weather = str(c.weather, `${path}.weather`);
    if (!data.weather[weather]) throw new DataError(`${path}.weather`, `meteo "${weather}" non definito in weather.json`);
    return { weather, daylight: oneOf(c.daylight, `${path}.daylight`, DAYLIGHTS) };
  });
  if (conditions.length !== maxTurns) {
    throw new DataError(`${p}.turns.conditions`, `servono ${maxTurns} voci, una per turno; trovate ${conditions.length}`);
  }

  // --- Fazioni e IA ----------------------------------------------------------
  const player = oneOf(o.player, `${p}.player`, SIDES);
  const ai = record(o.ai, `${p}.ai`);
  const aiSide = oneOf(ai.side, `${p}.ai.side`, SIDES);
  if (aiSide === player) throw new DataError(`${p}.ai.side`, 'l\'IA deve guidare la fazione opposta al giocatore');
  const posture = str(ai.posture, `${p}.ai.posture`);
  if (!data.rules.ai.postures[posture]) {
    throw new DataError(`${p}.ai.posture`, `postura "${posture}" non definita in rules.json`);
  }

  const vic = record(o.victory, `${p}.victory`);
  const victory: VictoryRules = {
    decisive: oneOf(vic.decisive, `${p}.victory.decisive`, ['allObjectives'] as const),
    marginal: oneOf(vic.marginal, `${p}.victory.marginal`, ['morePoints'] as const),
  };

  // --- Unità -----------------------------------------------------------------
  const unitIds = new Set<string>();
  const occupied = new Map<string, string>();
  const units: ScenarioUnit[] = array(o.units, `${p}.units`).map((v, i) => {
    const path = `${p}.units[${i}]`;
    const u = record(v, path);
    const id = str(u.id, `${path}.id`);
    if (unitIds.has(id)) throw new DataError(`${path}.id`, `id unità duplicato "${id}"`);
    unitIds.add(id);
    const typeId = str(u.type, `${path}.type`);
    if (!data.unitTypes[typeId]) throw new DataError(`${path}.type`, `tipo "${typeId}" non definito in units.json`);
    const pos = readPos(u, path);
    assertOnMap(size, pos, path);
    const air = isAirType(data.unitTypes[typeId]!);
    if (!air) assertPassable(pos, path);
    // Per esagono: un posto terrestre e uno aereo.
    const slot = `${hexKey(pos)}|${air ? 'air' : 'ground'}`;
    const other = occupied.get(slot);
    if (other) throw new DataError(path, `esagono già occupato da "${other}" (una unità terrestre e una aerea per esagono)`);
    occupied.set(slot, id);
    return {
      id,
      typeId,
      side: oneOf(u.side, `${path}.side`, SIDES),
      pos,
      strength: int(u.strength, `${path}.strength`, 1, data.rules.maxStrength),
      entrenched: optional(u.entrenched, false, (x) => bool(x, `${path}.entrenched`)),
    };
  });
  for (const side of SIDES) {
    if (!units.some((u) => u.side === side)) throw new DataError(`${p}.units`, `nessuna unità per la fazione ${side}`);
  }

  return {
    id: str(o.id, `${p}.id`),
    name: str(o.name, `${p}.name`),
    description: optional(o.description, '', (x) => str(x, `${p}.description`)),
    sideNames: readSideNames(o.sideNames, `${p}.sideNames`),
    seed: int(o.seed ?? 1, `${p}.seed`),
    map,
    defender: oneOf(o.defender, `${p}.defender`, SIDES),
    player,
    ai: { side: aiSide, posture },
    turns: { max: maxTurns, firstSide: oneOf(t.firstSide, `${p}.turns.firstSide`, SIDES), conditions },
    victory,
    units,
  };
}

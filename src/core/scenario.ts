/**
 * Caricamento e validazione di uno scenario (src/scenarios/*.json).
 * Nei file le posizioni sono in offset odd-q (col, row); qui diventano assiali.
 */
import type { GameData } from './data';
import { type Axial, type HexKey, hexDistance, hexKey, offsetToAxial } from './hex';
import {
  type Depot,
  type HexData,
  type HexEdge,
  type MapData,
  type Objective,
  ROUTE_KINDS,
  type Route,
  type RouteKind,
  assertOnMap,
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

/** Posizione come [colonna, riga] in coordinate offset. */
function readLoc(v: Json | undefined, path: string): Axial {
  const a = array(v, path);
  if (a.length !== 2) throw new DataError(path, 'serve [colonna, riga]');
  return offsetToAxial({ col: int(a[0], `${path}[0]`), row: int(a[1], `${path}[1]`) });
}

function readPos(o: Record<string, Json>, path: string): Axial {
  return readLoc(o.loc, `${path}.loc`);
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
  const byCode = new Map(Object.values(data.terrain).map((t) => [t.code, t.id]));
  const rows = array(m.terrain, `${p}.map.terrain`);
  if (rows.length !== height) throw new DataError(`${p}.map.terrain`, `servono ${height} righe; trovate ${rows.length}`);
  const hexes: Record<HexKey, HexData> = {};
  rows.forEach((v, row) => {
    const path = `${p}.map.terrain[${row}]`;
    const cells = [...str(v, path)];
    if (cells.length !== width) throw new DataError(path, `servono ${width} caratteri; trovati ${cells.length}`);
    cells.forEach((c, col) => {
      const terrain = byCode.get(c);
      if (!terrain) throw new DataError(path, `colonna ${col}: codice "${c}" non definito in terrain.json`);
      hexes[hexKey(offsetToAxial({ col, row }))] = { terrain };
    });
  });
  array(m.labels ?? [], `${p}.map.labels`).forEach((v, i) => {
    const path = `${p}.map.labels[${i}]`;
    const l = record(v, path);
    const pos = readPos(l, path);
    assertOnMap(size, pos, path);
    const key = hexKey(pos);
    hexes[key] = { ...hexes[key]!, label: str(l.label, `${path}.label`) };
  });

  const edges: HexEdge[] = array(m.edges ?? [], `${p}.map.edges`).map((v, i) => {
    const path = `${p}.map.edges[${i}]`;
    const e = record(v, path);
    const pos = readPos(e, path);
    assertOnMap(size, pos, path);
    return { hex: pos, direction: int(e.direction, `${path}.direction`, 0, 5), type: str(e.type, `${path}.type`) };
  });

  const routes = {} as Record<RouteKind, Route[]>;
  for (const kind of ROUTE_KINDS) {
    const key = `${kind}s`;
    routes[kind] = array(m[key] ?? [], `${p}.map.${key}`).map((v, i) => {
      const path = `${p}.map.${key}[${i}]`;
      const hexes = array(v, path).map((x, j) => readLoc(x, `${path}[${j}]`));
      if (hexes.length < 2) throw new DataError(path, 'servono almeno due esagoni');
      hexes.forEach((h, j) => {
        assertOnMap(size, h, `${path}[${j}]`);
        if (j > 0 && hexDistance(hexes[j - 1]!, h) !== 1) throw new DataError(`${path}[${j}]`, 'esagono non adiacente al precedente');
      });
      return hexes;
    });
  }

  // Un esagono invalicabile attraversato da una via è un ponte: ci si può stare.
  const routeHexes = new Set(ROUTE_KINDS.flatMap((k) => routes[k].flat().map(hexKey)));
  const assertPassable = (pos: Axial, path: string) => {
    if (data.terrain[hexes[hexKey(pos)]!.terrain]!.impassable && !routeHexes.has(hexKey(pos))) {
      throw new DataError(path, 'esagono su terreno invalicabile');
    }
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

  // --- Depositi -------------------------------------------------------------
  const depotIds = new Set<string>();
  const depotHexes = new Set<HexKey>();
  const depots: Depot[] = array(o.depots, `${p}.depots`).map((v, i) => {
    const path = `${p}.depots[${i}]`;
    const d = record(v, path);
    const id = str(d.id, `${path}.id`);
    if (depotIds.has(id)) throw new DataError(`${path}.id`, `id deposito duplicato "${id}"`);
    depotIds.add(id);
    const pos = readPos(d, path);
    assertOnMap(size, pos, path);
    if (depotHexes.has(hexKey(pos))) throw new DataError(path, 'due depositi sullo stesso esagono');
    depotHexes.add(hexKey(pos));
    assertPassable(pos, path);
    return { id, name: str(d.name, `${path}.name`), pos, owner: oneOf(d.side, `${path}.side`, SIDES) };
  });
  for (const side of SIDES) {
    if (!depots.some((d) => d.owner === side)) throw new DataError(`${p}.depots`, `nessun deposito per la fazione ${side}`);
  }

  const map: MapData = { width, height, hexes, edges, routes, objectives, depots };

  // --- Turni -----------------------------------------------------------------
  const t = record(o.turns, `${p}.turns`);
  const maxTurns = int(t.max, `${p}.turns.max`, 1);
  const conditions: TurnConditions[] = array(t.conditions, `${p}.turns.conditions`).map((v, i) => {
    const path = `${p}.turns.conditions[${i}]`;
    const c = array(v, path);
    if (c.length !== 2) throw new DataError(path, 'serve [meteo, luce]');
    const weather = str(c[0], `${path}[0]`);
    if (!data.weather[weather]) throw new DataError(`${path}[0]`, `meteo "${weather}" non definito in weather.json`);
    return { weather, daylight: oneOf(c[1], `${path}[1]`, DAYLIGHTS) };
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
  const byside = record(o.units, `${p}.units`);
  const units: ScenarioUnit[] = SIDES.flatMap((side) => array(byside[side] ?? [], `${p}.units.${side}`).map((v, i) => {
    const path = `${p}.units.${side}[${i}]`;
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
      side,
      pos,
      strength: int(u.str, `${path}.str`, 1, data.rules.maxStrength),
      entrenched: optional(u.ent, false, (x) => bool(x, `${path}.ent`)),
    };
  }));
  for (const side of SIDES) {
    if (!units.some((u) => u.side === side)) throw new DataError(`${p}.units.${side}`, `nessuna unità per la fazione ${side}`);
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

/**
 * Scenario in modifica: stessa forma del file JSON in src/scenarios,
 * così l'esportazione è una semplice serializzazione.
 */
import { type HexKey, hexKey, offsetToAxial } from '../core/hex';
import type { HexData, MapData, MapEdgeName } from '../core/map';
import type { Side, Unit } from '../core/units';

export interface HexJson {
  col: number;
  row: number;
  terrain?: string;
  label?: string;
}

export interface ScenarioJson {
  id: string;
  name: string;
  description: string;
  sideNames: Record<Side, string>;
  seed: number;
  map: { width: number; height: number; defaultTerrain: string; hexes: HexJson[]; edges: [] };
  objectives: { id: string; name: string; col: number; row: number; points: number }[];
  defender: Side;
  supplySources: Record<Side, { edges: MapEdgeName[]; hexes: { col: number; row: number }[] }>;
  turns: { max: number; firstSide: Side; conditions: { weather: string; daylight: string }[] };
  player: Side;
  ai: { side: Side; posture: string };
  victory: { decisive: 'allObjectives'; marginal: 'morePoints' };
  units: { id: string; type: string; side: Side; col: number; row: number; strength: number; entrenched?: boolean }[];
}

export function blankScenario(width = 20, height = 14): ScenarioJson {
  const turns = 5;
  return {
    id: 'nuovo',
    name: 'Nuovo scenario',
    description: '',
    sideNames: { blue: 'Blu', red: 'Rosso' },
    seed: 1,
    map: { width, height, defaultTerrain: 'clear', hexes: [], edges: [] },
    objectives: [],
    defender: 'red',
    supplySources: { blue: { edges: ['west'], hexes: [] }, red: { edges: ['east'], hexes: [] } },
    turns: { max: turns, firstSide: 'blue', conditions: Array.from({ length: turns }, () => ({ weather: 'clear', daylight: 'day' })) },
    player: 'blue',
    ai: { side: 'red', posture: 'defend' },
    victory: { decisive: 'allObjectives', marginal: 'morePoints' },
    units: [],
  };
}

const pos = (o: { col: number; row: number }) => offsetToAxial({ col: o.col, row: o.row });

/** Mappa da disegnare, senza validazione: lo scenario può essere incompleto mentre lo si modifica. */
export function toMapData(doc: ScenarioJson): MapData {
  const { width, height, defaultTerrain } = doc.map;
  const hexes: Record<HexKey, HexData> = {};
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) hexes[hexKey(offsetToAxial({ col, row }))] = { terrain: defaultTerrain };
  }
  for (const h of doc.map.hexes) {
    const key = hexKey(pos(h));
    if (!hexes[key]) continue;
    const terrain = h.terrain ?? hexes[key].terrain;
    hexes[key] = h.label ? { terrain, label: h.label } : { terrain };
  }
  return {
    width,
    height,
    hexes,
    edges: [],
    objectives: doc.objectives.map((o) => ({ id: o.id, name: o.name, pos: pos(o), points: o.points })),
    supplySources: { blue: [], red: [] },
  };
}

export function toUnits(doc: ScenarioJson): Unit[] {
  return doc.units.map((u) => ({
    id: u.id,
    typeId: u.type,
    side: u.side,
    pos: pos(u),
    strength: u.strength,
    movesLeft: 0,
    hasMoved: false,
    hasAttacked: false,
    hasReacted: false,
    entrenched: u.entrenched ?? false,
    outOfSupplyTurns: 0,
  }));
}

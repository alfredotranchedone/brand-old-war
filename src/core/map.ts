/**
 * Mappa, terreno, obiettivi e sorgenti di rifornimento.
 * Nella demo ogni esagono è "clear", ma tutte le regole leggono già il terreno da qui.
 */
import { type Axial, type HexKey, axialToOffset, hexKey, offsetToAxial } from './hex';
import type { Mobility, Side } from './units';
import { DataError, bool, dictionary, num, record, str } from './validate';

// ---------------------------------------------------------------------------
// Terreno (terrain.json)
// ---------------------------------------------------------------------------

export interface TerrainType {
  readonly id: string;
  readonly name: string;
  /** Costo in PM per entrare nell'esagono, per tipo di mobilità. */
  readonly moveCost: Readonly<Record<Mobility, number>>;
  /** Moltiplicatore della difesa per chi sta nell'esagono. */
  readonly defenseMod: number;
  readonly blocksLOS: boolean;
}

export type TerrainTable = Readonly<Record<string, TerrainType>>;

export function parseTerrain(raw: unknown): TerrainTable {
  return dictionary(raw, 'terrain.json', (v, path, id) => {
    const o = record(v, path);
    const mc = record(o.moveCost, `${path}.moveCost`);
    return {
      id,
      name: str(o.name, `${path}.name`),
      moveCost: {
        tracked: num(mc.tracked, `${path}.moveCost.tracked`, 0),
        wheeled: num(mc.wheeled, `${path}.moveCost.wheeled`, 0),
        foot: num(mc.foot, `${path}.moveCost.foot`, 0),
      },
      defenseMod: num(o.defenseMod, `${path}.defenseMod`, 0),
      blocksLOS: bool(o.blocksLOS, `${path}.blocksLOS`),
    } satisfies TerrainType;
  });
}

// ---------------------------------------------------------------------------
// Mappa
// ---------------------------------------------------------------------------

export interface HexData {
  /** Chiave in terrain.json. */
  readonly terrain: string;
  /** Nome di località, solo descrittivo. */
  readonly label?: string;
}

/** Lato di un esagono (per i futuri fiumi): esagono e direzione 0..5 (vedi HEX_DIRECTIONS). */
export interface HexEdge {
  readonly hex: Axial;
  readonly direction: number;
  readonly type: string;
}

export interface Objective {
  readonly id: string;
  readonly name: string;
  readonly pos: Axial;
  readonly points: number;
}

export interface MapData {
  /** Numero di colonne (offset odd-q). */
  readonly width: number;
  /** Numero di righe (offset odd-q). */
  readonly height: number;
  /** Esagoni indicizzati per chiave assiale. Oggetto semplice, così lo stato resta serializzabile. */
  readonly hexes: Readonly<Record<HexKey, HexData>>;
  /** Lati speciali (fiumi). Vuoto nella demo. */
  readonly edges: readonly HexEdge[];
  readonly objectives: readonly Objective[];
  /** Esagoni sorgente di rifornimento per fazione. */
  readonly supplySources: Readonly<Record<Side, readonly HexKey[]>>;
}

export function createUniformMap(width: number, height: number, terrain = 'clear'): MapData {
  const hexes: Record<HexKey, HexData> = {};
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      hexes[hexKey(offsetToAxial({ col, row }))] = { terrain };
    }
  }
  return { width, height, hexes, edges: [], objectives: [], supplySources: { blue: [], red: [] } };
}

export function isOnMap(map: MapData, h: Axial): boolean {
  const { col, row } = axialToOffset(h);
  return col >= 0 && col < map.width && row >= 0 && row < map.height;
}

export function getHex(map: MapData, h: Axial): HexData | undefined {
  return map.hexes[hexKey(h)];
}

/** Tipo di terreno dell'esagono; errore se l'esagono è fuori mappa o il terreno non esiste. */
export function terrainAt(map: MapData, terrain: TerrainTable, h: Axial): TerrainType {
  const data = getHex(map, h);
  if (!data) throw new Error(`Esagono fuori mappa: ${hexKey(h)}`);
  const t = terrain[data.terrain];
  if (!t) throw new Error(`Terreno sconosciuto: ${data.terrain}`);
  return t;
}

export function objectiveAt(map: MapData, h: Axial): Objective | undefined {
  return map.objectives.find((o) => o.pos.q === h.q && o.pos.r === h.r);
}

/** Tutti gli esagoni della mappa, per colonna e poi per riga (ordine stabile). */
export function mapHexes(map: MapData): Axial[] {
  const result: Axial[] = [];
  for (let col = 0; col < map.width; col++) {
    for (let row = 0; row < map.height; row++) {
      result.push(offsetToAxial({ col, row }));
    }
  }
  return result;
}

export type MapEdgeName = 'west' | 'east' | 'north' | 'south';
export const MAP_EDGE_NAMES: readonly MapEdgeName[] = ['west', 'east', 'north', 'south'];

/** Esagoni lungo un bordo della mappa. */
export function edgeHexes(width: number, height: number, edge: MapEdgeName): Axial[] {
  const out: Axial[] = [];
  if (edge === 'west' || edge === 'east') {
    const col = edge === 'west' ? 0 : width - 1;
    for (let row = 0; row < height; row++) out.push(offsetToAxial({ col, row }));
  } else {
    const row = edge === 'north' ? 0 : height - 1;
    for (let col = 0; col < width; col++) out.push(offsetToAxial({ col, row }));
  }
  return out;
}

export function assertOnMap(map: Pick<MapData, 'width' | 'height'>, h: Axial, path: string): void {
  const { col, row } = axialToOffset(h);
  if (col < 0 || col >= map.width || row < 0 || row >= map.height) {
    throw new DataError(path, `esagono (${col}, ${row}) fuori mappa ${map.width}×${map.height}`);
  }
}

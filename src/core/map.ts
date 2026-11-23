/**
 * Mappa, terreno, vie di comunicazione, obiettivi e depositi.
 */
import { type Axial, type HexKey, axialToOffset, hexKey, offsetToAxial } from './hex';
import type { GroundMobility, Side } from './units';
import { DataError, bool, dictionary, num, record, str } from './validate';

// ---------------------------------------------------------------------------
// Terreno (terrain.json)
// ---------------------------------------------------------------------------

export interface TerrainType {
  readonly id: string;
  /** Carattere che rappresenta il terreno nella griglia degli scenari. */
  readonly code: string;
  readonly name: string;
  /** Costo in PM per entrare nell'esagono, per tipo di mobilità. */
  readonly moveCost: Readonly<Record<GroundMobility, number>>;
  /** Moltiplicatore della difesa per chi sta nell'esagono. */
  readonly defenseMod: number;
  /** Moltiplicatore della difesa per chi è trincerato nell'esagono. */
  readonly entrenchmentMod: number;
  readonly blocksLOS: boolean;
  /** Nessuna unità ci entra (né per movimento, ritirata o avanzata) e i rifornimenti non ci passano. */
  readonly impassable: boolean;
  /** Immagine di fondo (nome in src/assets/tiles); senza, il renderer usa un colore piatto. */
  readonly tile?: string;
  /** Immagine disegnata sopra il fondo (foreste, colline, montagne): solo grafica. */
  readonly overlay?: string;
}

export type TerrainTable = Readonly<Record<string, TerrainType>>;

export function parseTerrain(raw: unknown): TerrainTable {
  const codes = new Set<string>();
  return dictionary(raw, 'terrain.json', (v, path, id) => {
    const o = record(v, path);
    const mc = record(o.moveCost, `${path}.moveCost`);
    const code = str(o.code, `${path}.code`);
    if ([...code].length !== 1) throw new DataError(`${path}.code`, 'serve un solo carattere');
    if (codes.has(code)) throw new DataError(`${path}.code`, `codice "${code}" già usato`);
    codes.add(code);
    return {
      id,
      code,
      name: str(o.name, `${path}.name`),
      moveCost: {
        tracked: num(mc.tracked, `${path}.moveCost.tracked`, 0),
        wheeled: num(mc.wheeled, `${path}.moveCost.wheeled`, 0),
        foot: num(mc.foot, `${path}.moveCost.foot`, 0),
      },
      defenseMod: num(o.defenseMod, `${path}.defenseMod`, 0),
      entrenchmentMod: num(o.entrenchmentMod, `${path}.entrenchmentMod`, 0),
      blocksLOS: bool(o.blocksLOS, `${path}.blocksLOS`),
      impassable: o.impassable === undefined ? false : bool(o.impassable, `${path}.impassable`),
      ...(o.tile === undefined ? {} : { tile: str(o.tile, `${path}.tile`) }),
      ...(o.overlay === undefined ? {} : { overlay: str(o.overlay, `${path}.overlay`) }),
    } satisfies TerrainType;
  });
}

// ---------------------------------------------------------------------------
// Mappa
// ---------------------------------------------------------------------------

export interface HexData {
  /** Quale tipo di terreno è in questo esagono. */
  readonly terrain: string;
  /** Nome opzionale della località. */
  readonly label?: string;
}

/** Rappresenta un lato di un esagono (es. per fiumi futuri): esagono, direzione 0..5, e tipo. */
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

/** Deposito di rifornimento; `owner` è la fazione che lo controlla a inizio partita. */
export interface Depot {
  readonly id: string;
  readonly name: string;
  readonly pos: Axial;
  readonly owner: Side;
}

export type RouteKind = 'road' | 'rail';
export const ROUTE_KINDS: readonly RouteKind[] = ['road', 'rail'];

/** Spezzata di esagoni adiacenti; attraversare acqua invalicabile equivale a un ponte. */
export type Route = readonly Axial[];

export interface MapData {
  /** Larghezza della mappa in esagoni (coordinate offset odd-q). */
  readonly width: number;
  /** Altezza della mappa in esagoni (coordinate offset odd-q). */
  readonly height: number;
  /** Tutti gli esagoni della mappa, indicizzati per chiave assiale. Usato così rimane serializzabile. */
  readonly hexes: Readonly<Record<HexKey, HexData>>;
  /** Lati speciali come fiumi. Vuoto per ora. */
  readonly edges: readonly HexEdge[];
  readonly routes: Readonly<Record<RouteKind, readonly Route[]>>;
  readonly objectives: readonly Objective[];
  readonly depots: readonly Depot[];
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

/** Sulla mappa e su terreno attraversabile. */
export function isPassable(map: MapData, terrain: TerrainTable, h: Axial): boolean {
  return isOnMap(map, h) && !terrainAt(map, terrain, h).impassable;
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

export function assertOnMap(map: Pick<MapData, 'width' | 'height'>, h: Axial, path: string): void {
  const { col, row } = axialToOffset(h);
  if (col < 0 || col >= map.width || row < 0 || row >= map.height) {
    throw new DataError(path, `esagono (${col}, ${row}) fuori mappa ${map.width}×${map.height}`);
  }
}

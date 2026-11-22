/**
 * Modello della mappa. Nella Fase 1 serve solo la griglia; caricamento da JSON,
 * obiettivi, sorgenti di rifornimento ed `edges` arrivano nella Fase 2.
 */
import { type Axial, type HexKey, axialToOffset, hexKey, offsetToAxial } from './hex';

export interface HexData {
  /** Chiave in terrain.json. Nella demo vale sempre "clear". */
  readonly terrain: string;
  /** Nome di località, solo descrittivo. */
  readonly label?: string;
}

export interface MapData {
  /** Numero di colonne (offset odd-q). */
  readonly width: number;
  /** Numero di righe (offset odd-q). */
  readonly height: number;
  /** Esagoni indicizzati per chiave assiale. Oggetto semplice, così lo stato resta serializzabile. */
  readonly hexes: Readonly<Record<HexKey, HexData>>;
}

export function createUniformMap(width: number, height: number, terrain = 'clear'): MapData {
  const hexes: Record<HexKey, HexData> = {};
  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      hexes[hexKey(offsetToAxial({ col, row }))] = { terrain };
    }
  }
  return { width, height, hexes };
}

export function isOnMap(map: MapData, h: Axial): boolean {
  const { col, row } = axialToOffset(h);
  return col >= 0 && col < map.width && row >= 0 && row < map.height;
}

export function getHex(map: MapData, h: Axial): HexData | undefined {
  return map.hexes[hexKey(h)];
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

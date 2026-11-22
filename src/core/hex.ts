/**
 * Griglia esagonale "flat-top" (lato piatto in alto).
 * Internamente: coordinate assiali (q, r); la terza coordinata cubica è s = -q - r.
 * Nei file JSON: offset "odd-q" (col, row), con le colonne dispari spostate in basso di mezzo esagono.
 * Riferimento: https://www.redblobgames.com/grids/hexagons/
 */

export interface Axial {
  readonly q: number;
  readonly r: number;
}

export interface Offset {
  readonly col: number;
  readonly row: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Chiave stringa stabile per usare un esagono in Map/Set/Record. */
export type HexKey = string;

export function hex(q: number, r: number): Axial {
  // Normalizza -0 in 0, così chiavi e confronti restano stabili.
  return { q: q + 0, r: r + 0 };
}

export function hexKey(h: Axial): HexKey {
  return `${h.q},${h.r}`;
}

export function parseHexKey(key: HexKey): Axial {
  const [q, r] = key.split(',').map(Number);
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`Chiave esagono non valida: "${key}"`);
  }
  return hex(q, r);
}

export function hexEquals(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexS(h: Axial): number {
  return -h.q - h.r;
}

export function hexAdd(a: Axial, b: Axial): Axial {
  return hex(a.q + b.q, a.r + b.r);
}

export function hexSubtract(a: Axial, b: Axial): Axial {
  return hex(a.q - b.q, a.r - b.r);
}

export function hexScale(a: Axial, k: number): Axial {
  return hex(a.q * k, a.r * k);
}

// ---------------------------------------------------------------------------
// Vicini e distanza
// ---------------------------------------------------------------------------

/**
 * Le 6 direzioni assiali, in senso orario a partire da "sud-est".
 * L'indice di direzione serve anche per i lati (futuri fiumi in `edges`).
 */
export const HEX_DIRECTIONS: readonly Axial[] = [
  hex(1, 0),
  hex(0, 1),
  hex(-1, 1),
  hex(-1, 0),
  hex(0, -1),
  hex(1, -1),
];

export function hexDirection(direction: number): Axial {
  const d = HEX_DIRECTIONS[((direction % 6) + 6) % 6];
  if (!d) throw new Error('unreachable');
  return d;
}

export function hexNeighbor(h: Axial, direction: number): Axial {
  return hexAdd(h, hexDirection(direction));
}

export function hexNeighbors(h: Axial): Axial[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// ---------------------------------------------------------------------------
// Arrotondamento, linee, anelli, aree
// ---------------------------------------------------------------------------

/** Arrotonda coordinate assiali frazionarie all'esagono più vicino (arrotondamento cubico). */
export function hexRound(fq: number, fr: number): Axial {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  }
  return hex(q, r);
}

/**
 * Esagoni sulla linea da `a` a `b`, estremi inclusi (lunghezza = distanza + 1).
 * Un piccolo spostamento evita ambiguità quando la linea corre esattamente su un lato.
 */
export function hexLine(a: Axial, b: Axial): Axial[] {
  const n = hexDistance(a, b);
  if (n === 0) return [hex(a.q, a.r)];
  const eps = 1e-6;
  const aq = a.q + eps;
  const ar = a.r + eps;
  const bq = b.q + eps;
  const br = b.r + eps;
  const result: Axial[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    result.push(hexRound(aq + (bq - aq) * t, ar + (br - ar) * t));
  }
  return result;
}

/** Esagoni a distanza esatta `radius` da `center` (radius 0 = solo il centro). */
export function hexRing(center: Axial, radius: number): Axial[] {
  if (radius < 0) return [];
  if (radius === 0) return [hex(center.q, center.r)];
  const result: Axial[] = [];
  // Parte dall'esagono a distanza `radius` in direzione 4, poi gira lungo i 6 lati.
  let h = hexAdd(center, hexScale(hexDirection(4), radius));
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      result.push(h);
      h = hexNeighbor(h, side);
    }
  }
  return result;
}

/** Tutti gli esagoni entro `radius` da `center`, centro incluso. */
export function hexesInRange(center: Axial, radius: number): Axial[] {
  const result: Axial[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    const rMin = Math.max(-radius, -dq - radius);
    const rMax = Math.min(radius, -dq + radius);
    for (let dr = rMin; dr <= rMax; dr++) {
      result.push(hex(center.q + dq, center.r + dr));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Offset odd-q <-> assiale
// ---------------------------------------------------------------------------

export function offsetToAxial(o: Offset): Axial {
  const q = o.col;
  const r = o.row - (o.col - (o.col & 1)) / 2;
  return hex(q, r);
}

export function axialToOffset(h: Axial): Offset {
  const col = h.q;
  const row = h.r + (h.q - (h.q & 1)) / 2;
  return { col: col + 0, row: row + 0 };
}

// ---------------------------------------------------------------------------
// Pixel <-> esagono (flat-top)
// ---------------------------------------------------------------------------

const SQRT3 = Math.sqrt(3);

/**
 * Centro dell'esagono in pixel, con l'origine nel centro dell'esagono assiale (0,0).
 * `size` = raggio (distanza dal centro a un vertice).
 */
export function hexToPixel(h: Axial, size: number): Point {
  return {
    x: size * 1.5 * h.q,
    y: size * SQRT3 * (h.r + h.q / 2),
  };
}

/** Esagono che contiene il punto (stesso sistema di riferimento di `hexToPixel`). */
export function pixelToHex(p: Point, size: number): Axial {
  const fq = ((2 / 3) * p.x) / size;
  const fr = ((-1 / 3) * p.x + (SQRT3 / 3) * p.y) / size;
  return hexRound(fq, fr);
}

/** I 6 vertici dell'esagono in pixel, a partire dal vertice destro, in senso orario sullo schermo. */
export function hexCorners(h: Axial, size: number): Point[] {
  const c = hexToPixel(h, size);
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    corners.push({ x: c.x + size * Math.cos(angle), y: c.y + size * Math.sin(angle) });
  }
  return corners;
}

/** Larghezza e altezza di un esagono flat-top di raggio `size`. */
export function hexDimensions(size: number): { width: number; height: number } {
  return { width: 2 * size, height: SQRT3 * size };
}

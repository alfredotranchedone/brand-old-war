import { describe, expect, it } from 'vitest';
import {
  axialToOffset,
  hex,
  hexCorners,
  hexDistance,
  hexEquals,
  hexesInRange,
  hexKey,
  hexLine,
  hexNeighbor,
  hexNeighbors,
  hexRing,
  hexToPixel,
  offsetToAxial,
  parseHexKey,
  pixelToHex,
} from '../src/core/hex';

const SIZE = 32;

describe('distanza', () => {
  it('è zero sullo stesso esagono', () => {
    expect(hexDistance(hex(3, -2), hex(3, -2))).toBe(0);
  });

  it('vale 1 per ogni vicino', () => {
    const c = hex(2, 5);
    for (const n of hexNeighbors(c)) expect(hexDistance(c, n)).toBe(1);
  });

  it('casi noti e simmetria', () => {
    expect(hexDistance(hex(0, 0), hex(3, 0))).toBe(3);
    expect(hexDistance(hex(0, 0), hex(2, -5))).toBe(5);
    expect(hexDistance(hex(-2, 1), hex(3, -3))).toBe(5);
    expect(hexDistance(hex(1, 4), hex(-3, 2))).toBe(hexDistance(hex(-3, 2), hex(1, 4)));
  });

  it('su offset odd-q: colonne adiacenti, stessa riga', () => {
    // In odd-q (0,0) e (1,0) sono adiacenti; anche (1,0) e (2,0).
    const a = offsetToAxial({ col: 0, row: 0 });
    const b = offsetToAxial({ col: 1, row: 0 });
    const c = offsetToAxial({ col: 2, row: 0 });
    expect(hexDistance(a, b)).toBe(1);
    expect(hexDistance(b, c)).toBe(1);
    expect(hexDistance(a, c)).toBe(2);
  });
});

describe('vicini', () => {
  it('sono 6, distinti e diversi dal centro', () => {
    const c = hex(0, 0);
    const ns = hexNeighbors(c);
    expect(ns).toHaveLength(6);
    expect(new Set(ns.map(hexKey)).size).toBe(6);
    expect(ns.some((n) => hexEquals(n, c))).toBe(false);
  });

  it('la direzione opposta riporta al punto di partenza', () => {
    const c = hex(4, -1);
    for (let d = 0; d < 6; d++) {
      expect(hexNeighbor(hexNeighbor(c, d), d + 3)).toEqual(c);
    }
  });

  it('vicini in odd-q: colonna pari e dispari', () => {
    const toOffsets = (col: number, row: number) =>
      hexNeighbors(offsetToAxial({ col, row }))
        .map(axialToOffset)
        .map((o) => `${o.col},${o.row}`)
        .sort();
    // Colonna pari: i vicini laterali stanno sulla riga stessa e su quella sopra.
    expect(toOffsets(2, 2)).toEqual(['1,1', '1,2', '2,1', '2,3', '3,1', '3,2'].sort());
    // Colonna dispari: i vicini laterali stanno sulla riga stessa e su quella sotto.
    expect(toOffsets(3, 2)).toEqual(['2,2', '2,3', '3,1', '3,3', '4,2', '4,3'].sort());
  });
});

describe('offset odd-q <-> assiale', () => {
  it('andata e ritorno su tutta la mappa 20x14', () => {
    for (let col = 0; col < 20; col++) {
      for (let row = 0; row < 14; row++) {
        expect(axialToOffset(offsetToAxial({ col, row }))).toEqual({ col, row });
      }
    }
  });
});

describe('pixel <-> esagono', () => {
  it('il centro di ogni esagono torna allo stesso esagono', () => {
    for (let col = 0; col < 20; col++) {
      for (let row = 0; row < 14; row++) {
        const h = offsetToAxial({ col, row });
        expect(pixelToHex(hexToPixel(h, SIZE), SIZE)).toEqual(h);
      }
    }
  });

  it('i punti interni vicini ai vertici restano nello stesso esagono', () => {
    const h = hex(3, -1);
    const c = hexToPixel(h, SIZE);
    for (const v of hexCorners(h, SIZE)) {
      // 90% della strada dal centro al vertice: ancora dentro l'esagono.
      const p = { x: c.x + (v.x - c.x) * 0.9, y: c.y + (v.y - c.y) * 0.9 };
      expect(pixelToHex(p, SIZE)).toEqual(h);
    }
  });

  it('appena oltre il punto medio di un lato si passa al vicino', () => {
    const h = hex(1, 2);
    const c = hexToPixel(h, SIZE);
    for (let d = 0; d < 6; d++) {
      const n = hexNeighbor(h, d);
      const nc = hexToPixel(n, SIZE);
      const p = { x: c.x + (nc.x - c.x) * 0.55, y: c.y + (nc.y - c.y) * 0.55 };
      expect(pixelToHex(p, SIZE)).toEqual(n);
    }
  });

  it('flat-top: colonne a passo 1,5·size, righe a passo √3·size', () => {
    const a = hexToPixel(offsetToAxial({ col: 0, row: 0 }), SIZE);
    const b = hexToPixel(offsetToAxial({ col: 1, row: 0 }), SIZE);
    const c = hexToPixel(offsetToAxial({ col: 0, row: 1 }), SIZE);
    expect(b.x - a.x).toBeCloseTo(1.5 * SIZE);
    expect(b.y - a.y).toBeCloseTo((Math.sqrt(3) / 2) * SIZE); // colonna dispari più in basso
    expect(c.y - a.y).toBeCloseTo(Math.sqrt(3) * SIZE);
  });
});

describe('linee, anelli, aree', () => {
  it('la linea ha lunghezza distanza+1 ed è continua', () => {
    const a = hex(0, 0);
    const b = hex(5, -2);
    const line = hexLine(a, b);
    expect(line).toHaveLength(hexDistance(a, b) + 1);
    expect(line[0]).toEqual(a);
    expect(line[line.length - 1]).toEqual(b);
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1]!, line[i]!)).toBe(1);
    }
  });

  it('la linea tra un esagono e se stesso è un solo esagono', () => {
    expect(hexLine(hex(2, 2), hex(2, 2))).toEqual([hex(2, 2)]);
  });

  it("l'anello di raggio N ha 6N esagoni tutti a distanza N", () => {
    const c = hex(1, -1);
    expect(hexRing(c, 0)).toEqual([c]);
    for (let n = 1; n <= 4; n++) {
      const ring = hexRing(c, n);
      expect(ring).toHaveLength(6 * n);
      expect(new Set(ring.map(hexKey)).size).toBe(6 * n);
      for (const h of ring) expect(hexDistance(c, h)).toBe(n);
    }
  });

  it("l'area entro N ha 3N(N+1)+1 esagoni tutti a distanza ≤ N", () => {
    const c = hex(-2, 3);
    for (let n = 0; n <= 4; n++) {
      const area = hexesInRange(c, n);
      expect(area).toHaveLength(3 * n * (n + 1) + 1);
      expect(new Set(area.map(hexKey)).size).toBe(area.length);
      for (const h of area) expect(hexDistance(c, h)).toBeLessThanOrEqual(n);
    }
  });
});

describe('chiavi', () => {
  it('andata e ritorno, senza -0', () => {
    expect(parseHexKey(hexKey(hex(-3, 7)))).toEqual(hex(-3, 7));
    expect(hexKey(hex(-0, 0))).toBe('0,0');
    expect(() => parseHexKey('a,b')).toThrow();
  });
});

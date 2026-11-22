import { nextFloat, nextUniform } from './rng';

export interface LossRange {
  readonly min: number;
  readonly expected: number;
  readonly max: number;
}

/** Calcola l'intervallo di perdite: valore base × variazione casuale, poi arrotonda. */
export function lossRange(base: number, vMin: number, vMax: number): LossRange {
  return {
    min: Math.floor(base * vMin),
    expected: (base * (vMin + vMax)) / 2,
    max: Math.ceil(base * vMax),
  };
}

/** Probabilità che le perdite totali raggiungano almeno n unità. */
export function probAtLeast(base: number, vMin: number, vMax: number, n: number): number {
  if (n <= 0) return 1;
  const lo = base * vMin;
  const hi = base * vMax;
  if (hi <= lo) return lo >= n ? 1 : lo > n - 1 ? lo - (n - 1) : 0;
  // Calcola la probabilità cumulative della zona di transizione tra n-1 e n.
  const a = Math.max(lo, n - 1);
  const b = Math.min(hi, n);
  const partial = b > a ? ((b - (n - 1)) ** 2 - (a - (n - 1)) ** 2) / 2 : 0;
  const full = Math.max(0, hi - Math.max(lo, n));
  return (partial + full) / (hi - lo);
}

export function rollLosses(rng: number, base: number, vMin: number, vMax: number): { losses: number; rng: number } {
  const v = nextUniform(rng, vMin, vMax);
  const x = base * v.value;
  const whole = Math.floor(x);
  const r = nextFloat(v.state);
  return { losses: whole + (r.value < x - whole ? 1 : 0), rng: r.state };
}

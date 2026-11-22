import { describe, expect, it } from 'vitest';
import { nextFloat, nextInt, nextUniform, seedRng } from '../src/core/rng';

function sequence(seed: number, n: number): number[] {
  let state = seedRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = nextFloat(state);
    out.push(r.value);
    state = r.state;
  }
  return out;
}

describe('rng con seme', () => {
  it('stesso seme, stessa sequenza', () => {
    expect(sequence(42, 50)).toEqual(sequence(42, 50));
  });

  it('semi diversi, sequenze diverse', () => {
    expect(sequence(1, 10)).not.toEqual(sequence(2, 10));
  });

  it('valori in [0,1) e media plausibile', () => {
    const values = sequence(7, 10000);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('uniforme e intero rispettano gli estremi', () => {
    let state = seedRng(3);
    const ints = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const u = nextUniform(state, 0.85, 1.15);
      expect(u.value).toBeGreaterThanOrEqual(0.85);
      expect(u.value).toBeLessThan(1.15);
      const k = nextInt(u.state, 1, 6);
      ints.add(k.value);
      state = k.state;
    }
    expect([...ints].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lo stato è serializzabile e la sequenza riprende uguale', () => {
    const r1 = nextFloat(seedRng(99));
    const saved = JSON.parse(JSON.stringify({ s: r1.state })) as { s: number };
    expect(nextFloat(saved.s).value).toBe(nextFloat(r1.state).value);
  });
});

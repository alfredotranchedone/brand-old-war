/**
 * Generatore pseudocasuale con seme (mulberry32): l'unica fonte di casualità del gioco.
 * È puro: lo stato è un intero a 32 bit che vive in GameState.rngState,
 * e ogni estrazione restituisce il valore insieme al nuovo stato.
 */

export interface RngResult<T> {
  readonly value: T;
  readonly state: number;
}

/** Normalizza un seme qualsiasi in uno stato a 32 bit senza segno. */
export function seedRng(seed: number): number {
  return seed >>> 0;
}

/** Numero uniforme in [0, 1). */
export function nextFloat(state: number): RngResult<number> {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** Numero uniforme in [min, max). */
export function nextUniform(state: number, min: number, max: number): RngResult<number> {
  const r = nextFloat(state);
  return { value: min + (max - min) * r.value, state: r.state };
}

/** Intero uniforme in [min, max], estremi inclusi. */
export function nextInt(state: number, min: number, max: number): RngResult<number> {
  const r = nextFloat(state);
  return { value: min + Math.floor(r.value * (max - min + 1)), state: r.state };
}

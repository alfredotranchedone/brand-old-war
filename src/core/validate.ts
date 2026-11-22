/**
 * Piccoli controlli per i dati JSON. Ogni errore riporta il percorso del campo,
 * così un valore sbagliato in units.json o nello scenario si trova subito.
 */

export class DataError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'DataError';
  }
}

export type Json = unknown;

export function isRecord(v: Json): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function record(v: Json, path: string): Record<string, Json> {
  if (!isRecord(v)) throw new DataError(path, 'atteso un oggetto');
  return v;
}

export function array(v: Json, path: string): Json[] {
  if (!Array.isArray(v)) throw new DataError(path, 'attesa una lista');
  return v;
}

export function str(v: Json, path: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new DataError(path, 'attesa una stringa non vuota');
  return v;
}

export function num(v: Json, path: string, min = -Infinity, max = Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new DataError(path, 'atteso un numero');
  if (v < min || v > max) throw new DataError(path, `atteso un valore tra ${min} e ${max}, trovato ${v}`);
  return v;
}

export function int(v: Json, path: string, min = -Infinity, max = Infinity): number {
  const n = num(v, path, min, max);
  if (!Number.isInteger(n)) throw new DataError(path, `atteso un intero, trovato ${n}`);
  return n;
}

export function bool(v: Json, path: string): boolean {
  if (typeof v !== 'boolean') throw new DataError(path, 'atteso true o false');
  return v;
}

export function oneOf<T extends string>(v: Json, path: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new DataError(path, `atteso uno tra ${allowed.join(', ')}, trovato ${JSON.stringify(v)}`);
  }
  return v as T;
}

export function optional<T>(v: Json, fallback: T, read: (v: Json) => T): T {
  return v === undefined ? fallback : read(v);
}

/** Legge ogni voce di un oggetto-dizionario (es. units.json) con la funzione data. */
export function dictionary<T>(v: Json, path: string, read: (v: Json, path: string, key: string) => T): Record<string, T> {
  const src = record(v, path);
  const out: Record<string, T> = {};
  const keys = Object.keys(src);
  if (keys.length === 0) throw new DataError(path, 'il dizionario è vuoto');
  for (const key of keys) out[key] = read(src[key], `${path}.${key}`, key);
  return out;
}

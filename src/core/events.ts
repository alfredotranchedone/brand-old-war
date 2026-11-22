import type { Axial } from './hex';

export type GameEvent =
  | { readonly kind: 'gameStart'; readonly turn: number; readonly scenarioId: string }
  | { readonly kind: 'move'; readonly unitId: string; readonly path: readonly Axial[]; readonly cost: number };

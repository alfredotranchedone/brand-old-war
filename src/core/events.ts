import type { Axial } from './hex';

export type GameEvent =
  | { readonly kind: 'gameStart'; readonly turn: number; readonly scenarioId: string }
  | { readonly kind: 'move'; readonly unitId: string; readonly path: readonly Axial[]; readonly cost: number }
  | {
      readonly kind: 'combat';
      readonly attackerId: string;
      readonly targetId: string;
      readonly ratio: number;
      readonly attackerLosses: number;
      /** Perdite totali del difensore, perdita extra inclusa. */
      readonly defenderLosses: number;
      readonly extraLoss: number;
      readonly retreatTo: Axial | null;
      readonly attackerDestroyed: boolean;
      readonly defenderDestroyed: boolean;
    }
  | { readonly kind: 'advance'; readonly unitId: string; readonly to: Axial };

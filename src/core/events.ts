import type { GameResult } from './game';
import type { Axial } from './hex';
import type { Side } from './units';

export type GameEvent =
  | { readonly kind: 'gameStart'; readonly turn: number; readonly scenarioId: string }
  | { readonly kind: 'gameEnd'; readonly result: GameResult }
  | {
      readonly kind: 'turnSummary';
      readonly turn: number;
      /** Step persi da ciascuna fazione nel turno. */
      readonly losses: Readonly<Record<Side, number>>;
      /** Id degli obiettivi controllati da ciascuna fazione. */
      readonly objectives: Readonly<Record<Side, readonly string[]>>;
    }
  | { readonly kind: 'turnStart'; readonly turn: number; readonly side: Side }
  | { readonly kind: 'move'; readonly unitId: string; readonly path: readonly Axial[]; readonly cost: number }
  | {
      readonly kind: 'combat';
      readonly attackerId: string;
      readonly targetId: string;
      /** Esagono del difensore al momento dello scontro (prima della ritirata). */
      readonly targetPos: Axial;
      readonly ratio: number;
      readonly attackerLosses: number;
      /** Perdite totali del difensore, perdita extra inclusa. */
      readonly defenderLosses: number;
      readonly extraLoss: number;
      readonly retreatTo: Axial | null;
      readonly attackerDestroyed: boolean;
      readonly defenderDestroyed: boolean;
      /** Id delle unità che hanno dato supporto. */
      readonly support: {
        readonly offensive: readonly string[];
        readonly artilleryCover: readonly string[];
        readonly defensive: readonly string[];
        readonly barrage: readonly string[];
      };
    }
  | { readonly kind: 'advance'; readonly unitId: string; readonly to: Axial }
  | {
      readonly kind: 'supply';
      readonly side: Side;
      readonly outOfSupply: readonly string[];
      /** Unità che hanno perso forza per logoramento. */
      readonly attrition: readonly string[];
    };

import { create } from 'zustand';
import { type Action, applyAction } from '../core/actions';
import type { GameData } from '../core/data';
import { type GameState, createGame, getUnit, unitAt } from '../core/game';
import { type Axial, hexEquals } from '../core/hex';
import { type UndoStack, popUndo, recordAction } from '../core/history';
import { type Reach, computeReach, isReachable } from '../core/movement';
import { loadGameData, loadScenario } from '../data';

export interface UiState {
  data: GameData;
  game: GameState;
  undoStack: UndoStack;
  hovered: Axial | null;
  selectedUnitId: string | null;
  /** Esagoni raggiungibili dall'unità selezionata, se può muovere. */
  reach: Reach | null;
  showCoords: boolean;
  showZoc: boolean;
  setHovered: (h: Axial | null) => void;
  clickHex: (h: Axial) => void;
  select: (unitId: string | null) => void;
  deselect: () => void;
  dispatch: (action: Action) => boolean;
  undo: () => void;
  toggleCoords: () => void;
  toggleZoc: () => void;
}

const sameHex = (a: Axial | null, b: Axial | null): boolean =>
  a === b || (a !== null && b !== null && hexEquals(a, b));

/** L'unità può ricevere ordini dal giocatore in questo momento. */
export function isCommandable(game: GameState, unitId: string | null): boolean {
  const u = unitId ? getUnit(game, unitId) : undefined;
  return !!u && u.side === game.activeSide && u.side === game.setup.player;
}

function reachFor(game: GameState, data: GameData, unitId: string | null): Reach | null {
  return unitId && isCommandable(game, unitId) ? computeReach(game, data, unitId) : null;
}

const data = loadGameData();
const scenario = loadScenario(data, 'crocevia');

export const useUiStore = create<UiState>()((set, get) => ({
  data,
  game: createGame(scenario, data),
  undoStack: [],
  hovered: null,
  selectedUnitId: null,
  reach: null,
  showCoords: false,
  showZoc: false,

  setHovered: (h) => {
    if (!sameHex(get().hovered, h)) set({ hovered: h });
  },

  clickHex: (h) => {
    const { game, reach, selectedUnitId } = get();
    if (reach && selectedUnitId && isReachable(reach, h)) {
      get().dispatch({ kind: 'move', unitId: selectedUnitId, to: h });
      return;
    }
    const clicked = unitAt(game, h)?.id ?? null;
    get().select(clicked === selectedUnitId ? null : clicked);
  },

  select: (unitId) => {
    const { game, data } = get();
    set({ selectedUnitId: unitId, reach: reachFor(game, data, unitId) });
  },

  deselect: () => set({ selectedUnitId: null, reach: null }),

  dispatch: (action) => {
    const { game, data, undoStack, selectedUnitId } = get();
    const result = applyAction(game, data, action);
    if (!result.ok) {
      console.warn(result.error);
      return false;
    }
    set({
      game: result.state,
      undoStack: recordAction(undoStack, game, action),
      reach: reachFor(result.state, data, selectedUnitId),
    });
    return true;
  },

  undo: () => {
    const { undoStack, data, selectedUnitId } = get();
    const popped = popUndo(undoStack);
    if (!popped) return;
    set({ game: popped.state, undoStack: popped.stack, reach: reachFor(popped.state, data, selectedUnitId) });
  },

  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
  toggleZoc: () => set((s) => ({ showZoc: !s.showZoc })),
}));

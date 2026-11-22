import { create } from 'zustand';
import { type Action, applyAction } from '../core/actions';
import { type CombatPreview, attackableTargets, previewCombat } from '../core/combat';
import type { GameData } from '../core/data';
import { type GameState, getUnit, unitAt } from '../core/game';
import { startGame } from '../core/turn';
import { type Axial, hexEquals } from '../core/hex';
import { type UndoStack, popUndo, recordAction } from '../core/history';
import { type Reach, computeReach, isReachable } from '../core/movement';
import { loadGameData, loadScenario } from '../data';
import { clearSave, loadSavedGame, saveGame } from './save';

export interface UiState {
  data: GameData;
  game: GameState;
  undoStack: UndoStack;
  hovered: Axial | null;
  selectedUnitId: string | null;
  reach: Reach | null;
  /** Nemici attaccabili dall'unità selezionata. */
  targets: readonly string[];
  /** Bersaglio scelto, in attesa di conferma. */
  preview: CombatPreview | null;
  showCoords: boolean;
  showZoc: boolean;
  showSupply: boolean;
  setHovered: (h: Axial | null) => void;
  clickHex: (h: Axial) => void;
  select: (unitId: string | null) => void;
  deselect: () => void;
  confirmAttack: () => void;
  cancelTarget: () => void;
  dispatch: (action: Action) => boolean;
  undo: () => void;
  toggleCoords: () => void;
  toggleZoc: () => void;
  toggleSupply: () => void;
  endTurn: () => void;
  restart: () => void;
}

const sameHex = (a: Axial | null, b: Axial | null): boolean =>
  a === b || (a !== null && b !== null && hexEquals(a, b));

export function isCommandable(game: GameState, unitId: string | null): boolean {
  const u = unitId ? getUnit(game, unitId) : undefined;
  // Finché non c'è l'IA si giocano a mano entrambe le fazioni.
  return !!u && u.side === game.activeSide;
}

function selectionFor(game: GameState, data: GameData, unitId: string | null) {
  const commandable = isCommandable(game, unitId);
  return {
    selectedUnitId: unitId,
    reach: commandable && unitId ? computeReach(game, data, unitId) : null,
    targets: commandable && unitId ? attackableTargets(game, data, unitId).map((u) => u.id) : [],
    preview: null,
  };
}

const data = loadGameData();
const scenario = loadScenario(data, 'crocevia');

export const useUiStore = create<UiState>()((set, get) => ({
  data,
  game: loadSavedGame(scenario.id) ?? startGame(scenario, data),
  undoStack: [],
  hovered: null,
  selectedUnitId: null,
  reach: null,
  targets: [],
  preview: null,
  showCoords: false,
  showZoc: false,
  showSupply: false,

  setHovered: (h) => {
    if (!sameHex(get().hovered, h)) set({ hovered: h });
  },

  clickHex: (h) => {
    const { game, data, reach, targets, preview, selectedUnitId } = get();
    const pending = game.pendingAdvance;
    if (pending && pending.unitId === selectedUnitId && hexEquals(pending.to, h)) {
      get().dispatch({ kind: 'advance', unitId: pending.unitId, to: h });
      return;
    }
    const clicked = unitAt(game, h);
    if (clicked && selectedUnitId && targets.includes(clicked.id)) {
      if (preview?.targetId === clicked.id) get().confirmAttack();
      else set({ preview: previewCombat(game, data, selectedUnitId, clicked.id) });
      return;
    }
    if (reach && selectedUnitId && isReachable(reach, h)) {
      get().dispatch({ kind: 'move', unitId: selectedUnitId, to: h });
      return;
    }
    const id = clicked?.id ?? null;
    get().select(id === selectedUnitId ? null : id);
  },

  select: (unitId) => {
    const { game, data } = get();
    set(selectionFor(game, data, unitId));
  },

  deselect: () => set({ selectedUnitId: null, reach: null, targets: [], preview: null }),

  confirmAttack: () => {
    const { preview } = get();
    if (preview) get().dispatch({ kind: 'attack', unitId: preview.attackerId, targetId: preview.targetId });
  },

  cancelTarget: () => set({ preview: null }),

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
      ...selectionFor(result.state, data, selectedUnitId),
    });
    return true;
  },

  undo: () => {
    const { undoStack, data, selectedUnitId } = get();
    const popped = popUndo(undoStack);
    if (!popped) return;
    set({ game: popped.state, undoStack: popped.stack, ...selectionFor(popped.state, data, selectedUnitId) });
  },

  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
  toggleZoc: () => set((s) => ({ showZoc: !s.showZoc })),
  toggleSupply: () => set((s) => ({ showSupply: !s.showSupply })),
  restart: () => {
    clearSave();
    const game = startGame(scenario, data);
    set({ game, undoStack: [], ...selectionFor(game, data, null) });
  },
  endTurn: () => {
    if (!get().dispatch({ kind: 'endTurn' })) return;
    saveGame(get().game);
    get().deselect();
  },
}));

import { create } from 'zustand';
import { type Action, applyAction } from '../core/actions';
import { type CombatPreview, attackableTargets, previewCombat } from '../core/combat';
import type { GameData } from '../core/data';
import type { GameEvent } from '../core/events';
import { spentUnits } from '../core/availability';
import { type GameState, getUnit, liveUnits, unitsAt } from '../core/game';
import { startGame } from '../core/turn';
import { type Axial, hexEquals } from '../core/hex';
import { type UndoStack, popState, recordAction } from '../core/history';
import { type Reach, computeReach, isReachable } from '../core/movement';
import { DEFAULT_SCENARIO, type ScenarioEntry, listScenarios, loadGameData, loadScenario, scenarioFingerprint } from '../data';
import { clearSave, loadSavedGame, saveGame } from './save';

export interface UiState {
  data: GameData;
  game: GameState;
  undoStack: UndoStack;
  redoStack: UndoStack;
  hovered: Axial | null;
  selectedUnitId: string | null;
  reach: Reach | null;
  /** Unità nemiche che l'unità selezionata può attaccare. */
  targets: readonly string[];
  /** Anteprima dell'attacco scelto, in attesa di conferma. */
  preview: CombatPreview | null;
  showCoords: boolean;
  showZoc: boolean;
  showSupply: boolean;
  showAnimations: boolean;
  /** Ultimo turno del quale si è visto il riepilogo. */
  summarySeen: number;
  setHovered: (h: Axial | null) => void;
  clickHex: (h: Axial) => void;
  select: (unitId: string | null) => void;
  deselect: () => void;
  confirmAttack: () => void;
  cancelTarget: () => void;
  /** Alterna tra bersagli nemici diversi nello stesso esagono (terrestre e aereo). */
  switchTarget: () => void;
  dispatch: (action: Action) => boolean;
  undo: () => void;
  redo: () => void;
  toggleCoords: () => void;
  toggleZoc: () => void;
  toggleSupply: () => void;
  toggleAnimations: () => void;
  endTurn: () => void;
  readonly scenarios: readonly ScenarioEntry[];
  /** Inizia una nuova partita, opzionalmente su uno scenario diverso. */
  restart: (scenarioId?: string) => void;
  selectNextUnit: () => void;
  closeSummary: () => void;
}

const sameHex = (a: Axial | null, b: Axial | null): boolean =>
  a === b || (a !== null && b !== null && hexEquals(a, b));

export function isCommandable(game: GameState, unitId: string | null): boolean {
  const u = unitId ? getUnit(game, unitId) : undefined;
  return !!u && u.side === game.activeSide && u.side === game.setup.player;
}

type TurnSummaryEvent = Extract<GameEvent, { kind: 'turnSummary' }>;

export function lastSummary(game: GameState): TurnSummaryEvent | null {
  for (let i = game.log.length - 1; i >= 0; i--) {
    const e = game.log[i]!;
    if (e.kind === 'turnSummary') return e;
  }
  return null;
}

export function lastSummaryTurn(game: GameState): number {
  return lastSummary(game)?.turn ?? 0;
}

export function isPlayerTurn(game: GameState): boolean {
  return !game.result && game.activeSide === game.setup.player;
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
const scenarios = listScenarios(data);
const playable = (id: string) => scenarios.some((s) => s.id === id && !s.error);

const savedFingerprint = (id: string) => (playable(id) ? scenarioFingerprint(id) : undefined);
const initialGame = loadSavedGame(savedFingerprint) ?? startGame(loadScenario(data, DEFAULT_SCENARIO), data);

export const useUiStore = create<UiState>()((set, get) => ({
  data,
  scenarios,
  game: initialGame,
  undoStack: [],
  redoStack: [],
  hovered: null,
  selectedUnitId: null,
  reach: null,
  targets: [],
  preview: null,
  showCoords: false,
  showZoc: false,
  showSupply: false,
  showAnimations: true,
  summarySeen: lastSummaryTurn(initialGame),
  closeSummary: () => set((s) => ({ summarySeen: lastSummaryTurn(s.game) })),

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
    const here = unitsAt(game, data, h);
    const targetable = selectedUnitId ? here.filter((u) => targets.includes(u.id)) : [];
    if (selectedUnitId && targetable.length > 0) {
      if (targetable.some((u) => u.id === preview?.targetId)) get().confirmAttack();
      else set({ preview: previewCombat(game, data, selectedUnitId, targetable[0]!.id) });
      return;
    }
    if (reach && selectedUnitId && isReachable(reach, h)) {
      get().dispatch({ kind: 'move', unitId: selectedUnitId, to: h });
      return;
    }
    // Con un'unità terrestre e una aerea nello stesso esagono, i clic le alternano.
    const idx = here.findIndex((u) => u.id === selectedUnitId);
    get().select((idx >= 0 ? here[idx + 1] : here[0])?.id ?? null);
  },

  switchTarget: () => {
    const { game, data, preview, targets } = get();
    const target = preview && getUnit(game, preview.targetId);
    if (!target) return;
    const other = unitsAt(game, data, target.pos).find((u) => u.id !== target.id && targets.includes(u.id));
    if (other) set({ preview: previewCombat(game, data, preview.attackerId, other.id) });
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
    if (action.kind === 'endTurn') saveGame(result.state, scenarioFingerprint(result.state.scenarioId));
    set({
      game: result.state,
      undoStack: recordAction(undoStack, game, action),
      redoStack: [],
      ...selectionFor(result.state, data, selectedUnitId),
    });
    return true;
  },

  undo: () => {
    const { game, undoStack, redoStack, data, selectedUnitId } = get();
    if (!isPlayerTurn(game)) return;
    const popped = popState(undoStack);
    if (!popped) return;
    set({ game: popped.state, undoStack: popped.stack, redoStack: [...redoStack, game], ...selectionFor(popped.state, data, selectedUnitId) });
  },

  redo: () => {
    const { game, undoStack, redoStack, data, selectedUnitId } = get();
    if (!isPlayerTurn(game)) return;
    const popped = popState(redoStack);
    if (!popped) return;
    set({ game: popped.state, redoStack: popped.stack, undoStack: [...undoStack, game], ...selectionFor(popped.state, data, selectedUnitId) });
  },

  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
  toggleZoc: () => set((s) => ({ showZoc: !s.showZoc })),
  toggleSupply: () => set((s) => ({ showSupply: !s.showSupply })),
  toggleAnimations: () => set((s) => ({ showAnimations: !s.showAnimations })),
  selectNextUnit: () => {
    const { game, data, selectedUnitId } = get();
    if (!isPlayerTurn(game)) return;
    const spent = spentUnits(game, data);
    const ready = liveUnits(game, game.activeSide)
      .filter((u) => !spent.has(u.id))
      .map((u) => u.id)
      .sort();
    if (ready.length === 0) return;
    const next = ready.find((id) => selectedUnitId !== null && id > selectedUnitId) ?? ready[0]!;
    get().select(next);
  },
  restart: (scenarioId) => {
    clearSave();
    const game = startGame(loadScenario(data, scenarioId ?? get().game.scenarioId), data);
    set({ game, undoStack: [], redoStack: [], summarySeen: 0, ...selectionFor(game, data, null) });
  },
  endTurn: () => {
    if (isPlayerTurn(get().game) && get().dispatch({ kind: 'endTurn' })) get().deselect();
  },
}));

/**
 * Store Zustand: contiene i dati statici, il GameState e lo stato della vista.
 * Dalla Fase 3 esporrà le azioni di gioco, che chiameranno applyAction.
 */
import { create } from 'zustand';
import type { GameData } from '../core/data';
import { type GameState, createGame, unitAt } from '../core/game';
import { type Axial, hexEquals } from '../core/hex';
import { loadGameData, loadScenario } from '../data';

export interface UiState {
  data: GameData;
  game: GameState;
  hovered: Axial | null;
  selectedUnitId: string | null;
  showCoords: boolean;
  setHovered: (h: Axial | null) => void;
  /** Clic su un esagono: seleziona l'unità presente (amica o nemica), altrimenti deseleziona. */
  clickHex: (h: Axial) => void;
  deselect: () => void;
  toggleCoords: () => void;
}

const sameHex = (a: Axial | null, b: Axial | null): boolean =>
  a === b || (a !== null && b !== null && hexEquals(a, b));

const data = loadGameData();
const scenario = loadScenario(data, 'crocevia');

export const useUiStore = create<UiState>()((set, get) => ({
  data,
  game: createGame(scenario, data),
  hovered: null,
  selectedUnitId: null,
  showCoords: false,
  setHovered: (h) => {
    if (!sameHex(get().hovered, h)) set({ hovered: h });
  },
  clickHex: (h) => {
    const unit = unitAt(get().game, h);
    set({ selectedUnitId: unit?.id ?? null });
  },
  deselect: () => set({ selectedUnitId: null }),
  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
}));

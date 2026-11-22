/**
 * Store Zustand dell'interfaccia. Nella Fase 1 contiene la mappa e lo stato della vista;
 * dalla Fase 2 conterrà il GameState e le azioni che chiamano applyAction.
 */
import { create } from 'zustand';
import { type Axial, hexEquals } from '../core/hex';
import { type MapData, createUniformMap } from '../core/map';

export interface UiState {
  map: MapData;
  hovered: Axial | null;
  showCoords: boolean;
  setHovered: (h: Axial | null) => void;
  toggleCoords: () => void;
}

const sameHex = (a: Axial | null, b: Axial | null): boolean =>
  a === b || (a !== null && b !== null && hexEquals(a, b));

export const useUiStore = create<UiState>()((set, get) => ({
  // Mappa provvisoria 20x14 tutta "aperto"; nella Fase 2 arriva da scenarios/crocevia.json.
  map: createUniformMap(20, 14),
  hovered: null,
  showCoords: false,
  setHovered: (h) => {
    if (!sameHex(get().hovered, h)) set({ hovered: h });
  },
  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
}));

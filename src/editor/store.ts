import { create } from 'zustand';
import type { GameData } from '../core/data';
import { type Side, otherSide } from '../core/units';
import { type Axial, axialToOffset, hexKey } from '../core/hex';
import { loadGameData } from '../data';
import { type UnitDraft, brushArea, eraseAt, paintTerrain, placeObjective, placeUnit, resize, setLabel, setTurns } from './edit';
import { type ScenarioJson, blankScenario, toMapData } from './model';

export type Tool = 'terrain' | 'unit' | 'objective' | 'label' | 'erase';

export interface EditorState {
  readonly data: GameData;
  readonly doc: ScenarioJson;
  readonly hovered: Axial | null;
  readonly showCoords: boolean;
  readonly tool: Tool;
  /** Terreno del pennello. */
  readonly brush: string;
  /** Lato del pennello in esagoni (terreno e gomma). */
  readonly brushSize: number;
  readonly unitDraft: UnitDraft;
  readonly objectiveDraft: { name: string; points: number };
  readonly labelDraft: string;
  /** Avviso dell'ultima azione rifiutata. */
  readonly notice: string | null;
  setHovered(h: Axial | null): void;
  /** Applica lo strumento all'esagono; `first` è la pressione, il resto è trascinamento. */
  apply(h: Axial, first: boolean): void;
  setTool(tool: Tool): void;
  setBrushSize(size: number): void;
  setUnitDraft(d: Partial<UnitDraft>): void;
  setObjectiveDraft(d: Partial<{ name: string; points: number }>): void;
  setLabelDraft(label: string): void;
  setMeta(meta: Partial<Pick<ScenarioJson, 'id' | 'name' | 'description' | 'defender' | 'player' | 'sideNames'>> & { firstSide?: Side }): void;
  load(doc: ScenarioJson): void;
  setBrush(terrain: string): void;
  resize(width: number, height: number): void;
  setTurns(turns: number): void;
  toggleCoords(): void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  data: loadGameData(),
  doc: blankScenario(),
  hovered: null,
  showCoords: true,
  tool: 'terrain',
  brush: 'clear',
  brushSize: 1,
  unitDraft: { side: 'blue', type: 'armor', strength: 10, entrenched: false },
  objectiveDraft: { name: 'Obiettivo', points: 1 },
  labelDraft: '',
  notice: null,
  setHovered: (h) => {
    const cur = get().hovered;
    if (cur?.q !== h?.q || cur?.r !== h?.r) set({ hovered: h });
  },
  apply: (h, first) => {
    const s = get();
    const { col, row } = axialToOffset(h);
    if (s.tool === 'terrain' || s.tool === 'erase') {
      let doc = s.doc;
      for (const a of brushArea(s.doc, col, row, s.brushSize)) {
        doc = s.tool === 'terrain' ? paintTerrain(doc, a.col, a.row, s.brush) : eraseAt(doc, a.col, a.row);
      }
      if (doc !== s.doc) set({ doc, notice: null });
      return;
    }
    if (!first) return;
    if (s.tool === 'label') {
      set({ doc: setLabel(s.doc, col, row, s.labelDraft), notice: null });
      return;
    }
    const terrain = s.data.terrain[toMapData(s.doc).hexes[hexKey(h)]?.terrain ?? ''];
    if (terrain?.impassable) {
      set({ notice: `${terrain.name}: esagono invalicabile` });
      return;
    }
    if (s.tool === 'unit') set({ doc: placeUnit(s.doc, col, row, s.unitDraft), notice: null });
    else if (!s.objectiveDraft.name.trim()) set({ notice: "Dai un nome all'obiettivo" });
    else set({ doc: placeObjective(s.doc, col, row, s.objectiveDraft.name.trim(), s.objectiveDraft.points), notice: null });
  },
  setTool: (tool) => set({ tool, notice: null }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setUnitDraft: (d) => set((s) => ({ unitDraft: { ...s.unitDraft, ...d } })),
  setObjectiveDraft: (d) => set((s) => ({ objectiveDraft: { ...s.objectiveDraft, ...d } })),
  setLabelDraft: (labelDraft) => set({ labelDraft }),
  setMeta: ({ firstSide, player, ...meta }) =>
    set((s) => ({
      doc: {
        ...s.doc,
        ...meta,
        ...(player ? { player, ai: { ...s.doc.ai, side: otherSide(player) } } : {}),
        ...(firstSide ? { turns: { ...s.doc.turns, firstSide } } : {}),
      },
    })),
  load: (doc) => set({ doc, notice: null }),
  setBrush: (brush) => set({ brush }),
  resize: (width, height) => set((s) => ({ doc: resize(s.doc, width, height) })),
  setTurns: (turns) => set((s) => ({ doc: setTurns(s.doc, turns) })),
  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
}));

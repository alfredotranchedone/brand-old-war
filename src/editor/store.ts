import { create } from 'zustand';
import type { GameData } from '../core/data';
import { type Side, otherSide } from '../core/units';
import { type Axial, axialToOffset, hexKey } from '../core/hex';
import type { RouteKind } from '../core/map';
import { canStand } from '../core/routes';
import { loadGameData } from '../data';
import { type UnitDraft, brushArea, eraseAt, paintTerrain, placeDepot, placeObjective, placeUnit, resize, setLabel, setTurns } from './edit';
import { type ScenarioJson, blankScenario, toMapData } from './model';
import { type RouteDrawing, eraseRouteAt, extendRoute, startRoute } from './routesEdit';

export type Tool = 'terrain' | 'route' | 'unit' | 'objective' | 'depot' | 'label' | 'erase';

export interface RouteDraft {
  kind: RouteKind;
  erase: boolean;
}

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
  readonly depotDraft: { name: string; side: Side };
  readonly labelDraft: string;
  readonly routeDraft: RouteDraft;
  /** Via in corso di disegno (tra pressione e rilascio). */
  readonly drawing: RouteDrawing | null;
  /** Avviso dell'ultima azione rifiutata. */
  readonly notice: string | null;
  setHovered(h: Axial | null): void;
  /** Applica lo strumento all'esagono; `first` è la pressione, il resto è trascinamento. */
  apply(h: Axial, first: boolean): void;
  setTool(tool: Tool): void;
  setBrushSize(size: number): void;
  setUnitDraft(d: Partial<UnitDraft>): void;
  setObjectiveDraft(d: Partial<{ name: string; points: number }>): void;
  setDepotDraft(d: Partial<{ name: string; side: Side }>): void;
  setLabelDraft(label: string): void;
  setRouteDraft(d: Partial<RouteDraft>): void;
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
  depotDraft: { name: 'Deposito', side: 'blue' },
  labelDraft: '',
  routeDraft: { kind: 'road', erase: false },
  drawing: null,
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
    if (s.tool === 'route') {
      const at = { col, row };
      const { kind, erase } = s.routeDraft;
      if (erase) {
        const doc = eraseRouteAt(s.doc, kind, at);
        if (doc !== s.doc) set({ doc, notice: null });
        return;
      }
      const next = first || !s.drawing ? startRoute(s.doc, kind, at) : extendRoute(s.doc, s.drawing, at);
      set({ doc: next.doc, drawing: next.drawing, notice: null });
      return;
    }
    if (!first) return;
    if (s.tool === 'label') {
      set({ doc: setLabel(s.doc, col, row, s.labelDraft), notice: null });
      return;
    }
    const map = toMapData(s.doc);
    const terrain = s.data.terrain[map.hexes[hexKey(h)]?.terrain ?? ''];
    const isAir = (type: string) => s.data.unitTypes[type]?.mobility === 'air';
    const flying = s.tool === 'unit' && isAir(s.unitDraft.type);
    if (!flying && !canStand(map, s.data.terrain, h)) {
      set({ notice: `${terrain?.name ?? 'Esagono'}: esagono invalicabile` });
      return;
    }
    if (s.tool === 'unit') set({ doc: placeUnit(s.doc, col, row, s.unitDraft, isAir), notice: null });
    else if (s.tool === 'depot') {
      if (!s.depotDraft.name.trim()) set({ notice: 'Dai un nome al deposito' });
      else set({ doc: placeDepot(s.doc, col, row, s.depotDraft.name.trim(), s.depotDraft.side), notice: null });
    }
    else if (!s.objectiveDraft.name.trim()) set({ notice: "Dai un nome all'obiettivo" });
    else set({ doc: placeObjective(s.doc, col, row, s.objectiveDraft.name.trim(), s.objectiveDraft.points), notice: null });
  },
  setTool: (tool) => set({ tool, drawing: null, notice: null }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setUnitDraft: (d) => set((s) => ({ unitDraft: { ...s.unitDraft, ...d } })),
  setObjectiveDraft: (d) => set((s) => ({ objectiveDraft: { ...s.objectiveDraft, ...d } })),
  setDepotDraft: (d) => set((s) => ({ depotDraft: { ...s.depotDraft, ...d } })),
  setLabelDraft: (labelDraft) => set({ labelDraft }),
  setRouteDraft: (d) => set((s) => ({ routeDraft: { ...s.routeDraft, ...d }, drawing: null })),
  setMeta: ({ firstSide, player, ...meta }) =>
    set((s) => ({
      doc: {
        ...s.doc,
        ...meta,
        ...(player ? { player, ai: { ...s.doc.ai, side: otherSide(player) } } : {}),
        ...(firstSide ? { turns: { ...s.doc.turns, firstSide } } : {}),
      },
    })),
  load: (doc) => set({ doc, drawing: null, notice: null }),
  setBrush: (brush) => set({ brush }),
  resize: (width, height) => set((s) => ({ doc: resize(s.doc, width, height), drawing: null })),
  setTurns: (turns) => set((s) => ({ doc: setTurns(s.doc, turns) })),
  toggleCoords: () => set((s) => ({ showCoords: !s.showCoords })),
}));

import { useEffect, useRef } from 'react';
import { type Axial, axialToOffset, offsetToAxial } from '../core/hex';
import { isOnMap } from '../core/map';
import { brushArea } from './edit';
import { attachMapInput } from '../render/mapInput';
import { MapRenderer, type RenderInput } from '../render/mapRenderer';
import { type ScenarioJson, toMapData, toUnits } from './model';
import { type EditorState, useEditorStore } from './store';
import styles from '../ui/MapCanvas.module.css';

const NONE = new Set<string>();

/** Area del pennello sotto il cursore, per terreno e gomma. */
function brushHover(s: EditorState): Axial[] | undefined {
  if (!s.hovered || (s.tool !== 'terrain' && s.tool !== 'erase') || s.brushSize === 1) return undefined;
  const { col, row } = axialToOffset(s.hovered);
  return brushArea(s.doc, col, row, s.brushSize).map((a) => offsetToAxial(a));
}

function renderInput(s: EditorState, map: ReturnType<typeof toMapData>): RenderInput {
  return {
    map,
    unitTypes: s.data.unitTypes,
    terrain: s.data.terrain,
    units: toUnits(s.doc),
    // A inizio partita gli obiettivi sono del difensore.
    objectives: Object.fromEntries(s.doc.objectives.map((o) => [o.id, s.doc.defender])),
    hovered: s.hovered,
    hoverArea: brushHover(s),
    selectedUnitId: null,
    reachable: [],
    path: null,
    zoc: [],
    supply: [],
    targets: [],
    chosenTarget: null,
    supportHexes: { attacker: [], defender: [] },
    advanceHex: null,
    spent: NONE,
    showCoords: s.showCoords,
  };
}

export function EditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new MapRenderer(canvas);
    const store = useEditorStore;
    // La mappa si ricostruisce solo quando cambia lo scenario, non a ogni movimento del cursore.
    let lastDoc: ScenarioJson | null = null;
    let map = toMapData(store.getState().doc);
    const push = () => {
      const s = store.getState();
      if (s.doc !== lastDoc) {
        map = toMapData(s.doc);
        lastDoc = s.doc;
      }
      renderer.update(renderInput(s, map));
    };
    push();
    const unsubscribe = store.subscribe(push);
    const detach = attachMapInput(wrap, canvas, renderer, {
      isOnMap: (h) => isOnMap(map, h),
      onHover: (h) => store.getState().setHovered(h),
      onClick: () => {},
      onPaint: (h, first) => store.getState().apply(h, first),
    });
    return () => {
      unsubscribe();
      detach();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

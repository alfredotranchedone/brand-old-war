import { axialToOffset } from '../core/hex';
import { getHex } from '../core/map';
import { EditorCanvas } from './EditorCanvas';
import { MapPanel, TurnsPanel } from './EditorPanels';
import { FilePanel, ScenarioPanel } from './ScenarioPanels';
import { ToolBar } from './ToolPanels';
import { toMapData } from './model';
import { useEditorStore } from './store';
import app from '../ui/App.module.css';

function HexStatus() {
  const text = useEditorStore((s) => {
    if (!s.hovered) return 'Passa il mouse sulla mappa';
    const { col, row } = axialToOffset(s.hovered);
    const hex = getHex(toMapData(s.doc), s.hovered);
    const terrain = hex ? (s.data.terrain[hex.terrain]?.name ?? hex.terrain) : '—';
    return `Esagono ${col}, ${row} · ${terrain}${hex?.label ? ` · ${hex.label}` : ''}`;
  });
  return <span className={app.muted}>{text}</span>;
}

export function EditorApp() {
  const name = useEditorStore((s) => s.doc.name);
  const size = useEditorStore((s) => `${s.doc.map.width} × ${s.doc.map.height} · ${s.doc.turns.max} turni`);
  const showCoords = useEditorStore((s) => s.showCoords);
  const toggleCoords = useEditorStore((s) => s.toggleCoords);

  return (
    <div className={app.app}>
      <header className={app.topBar}>
        <span className={app.title}>Editor scenari</span>
        <span className={app.muted}>
          {name} · {size}
        </span>
        <span className={app.spacer} />
        <label className={app.muted}>
          <input type="checkbox" checked={showCoords} onChange={toggleCoords} /> Coordinate
        </label>
      </header>
      <main className={app.map}>
        <EditorCanvas />
      </main>
      <aside className={app.side}>
        <ToolBar />
        <MapPanel key={size} />
        <TurnsPanel />
        <ScenarioPanel />
        <FilePanel />
      </aside>
      <footer className={app.bottomBar}>
        <HexStatus />
      </footer>
    </div>
  );
}

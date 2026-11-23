import { SIDES } from '../core/units';
import { BrushSize, TerrainPalette } from './EditorPanels';
import { type Tool, useEditorStore } from './store';
import app from '../ui/App.module.css';
import styles from './Editor.module.css';

const TOOLS: [Tool, string][] = [
  ['terrain', 'Terreno'],
  ['route', 'Vie'],
  ['unit', 'Unità'],
  ['objective', 'Obiettivo'],
  ['depot', 'Deposito'],
  ['label', 'Località'],
  ['erase', 'Gomma'],
];

export function ToolBar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const notice = useEditorStore((s) => s.notice);
  return (
    <>
      <div className={styles.tools} role="tablist">
        {TOOLS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tool === id}
            className={`${styles.toolTab} ${tool === id ? styles.active : ''}`}
            onClick={() => setTool(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {notice && <p className={app.badge}>{notice}</p>}
      {(tool === 'terrain' || tool === 'erase') && <BrushSize />}
      {tool === 'terrain' && <TerrainPalette />}
      {tool === 'unit' && <UnitTool />}
      {tool === 'route' && <RouteTool />}
      {tool === 'objective' && <ObjectiveTool />}
      {tool === 'depot' && <DepotTool />}
      {tool === 'label' && <LabelTool />}
      {tool === 'erase' && (
        <section className={app.card}>
          <p className={app.hint}>Clic o trascina per togliere unità, obiettivi, depositi e nomi di località. Terreno e vie restano.</p>
        </section>
      )}
    </>
  );
}

function UnitTool() {
  const d = useEditorStore((s) => s.unitDraft);
  const set = useEditorStore((s) => s.setUnitDraft);
  const types = useEditorStore((s) => s.data.unitTypes);
  const max = useEditorStore((s) => s.data.rules.maxStrength);
  const names = useEditorStore((s) => s.doc.sideNames);
  const counts = useEditorStore((s) => SIDES.map((side) => `${s.doc.sideNames[side]} ${s.doc.units.filter((u) => u.side === side).length}`).join(' · '));
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Unità</h2>
      <div className={styles.form}>
        <label className={styles.field}>
          Fazione
          <select value={d.side} onChange={(e) => set({ side: e.target.value as typeof d.side })}>
            {SIDES.map((side) => (
              <option key={side} value={side}>
                {names[side]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Tipo
          <select value={d.type} onChange={(e) => set({ type: e.target.value })}>
            {Object.values(types).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Forza (1–{max})
          <input
            type="number"
            min={1}
            max={max}
            value={d.strength}
            onChange={(e) => set({ strength: Math.max(1, Math.min(max, Math.round(Number(e.target.value) || 1))) })}
          />
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={d.entrenched} onChange={(e) => set({ entrenched: e.target.checked })} />
          Trincerata
        </label>
      </div>
      <p className={app.hint}>Clic per piazzare; sostituisce l'unità già presente. Unità: {counts}</p>
    </section>
  );
}

function ObjectiveTool() {
  const d = useEditorStore((s) => s.objectiveDraft);
  const set = useEditorStore((s) => s.setObjectiveDraft);
  const count = useEditorStore((s) => s.doc.objectives.length);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Obiettivo</h2>
      <div className={styles.form}>
        <label className={styles.field}>
          Nome
          <input type="text" className={styles.wide} value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className={styles.field}>
          Punti
          <input type="number" min={0} max={9} value={d.points} onChange={(e) => set({ points: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
        </label>
      </div>
      <p className={app.hint}>Clic per piazzare; sostituisce l'obiettivo già presente. Obiettivi: {count}</p>
    </section>
  );
}

function LabelTool() {
  const label = useEditorStore((s) => s.labelDraft);
  const set = useEditorStore((s) => s.setLabelDraft);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Località</h2>
      <label className={styles.field}>
        Nome
        <input type="text" className={styles.wide} value={label} onChange={(e) => set(e.target.value)} />
      </label>
      <p className={app.hint}>Clic per dare il nome all'esagono; con il nome vuoto lo toglie.</p>
    </section>
  );
}

function RouteTool() {
  const d = useEditorStore((s) => s.routeDraft);
  const set = useEditorStore((s) => s.setRouteDraft);
  const counts = useEditorStore((s) => `Strade ${s.doc.map.roads.length} · Ferrovie ${s.doc.map.rails.length}`);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Vie</h2>
      <div className={styles.form}>
        <label className={styles.field}>
          Tipo
          <select value={d.kind} onChange={(e) => set({ kind: e.target.value as typeof d.kind })}>
            <option value="road">Strada</option>
            <option value="rail">Ferrovia</option>
          </select>
        </label>
        <label className={styles.field}>
          Modalità
          <select value={d.erase ? 'erase' : 'draw'} onChange={(e) => set({ erase: e.target.value === 'erase' })}>
            <option value="draw">Disegna</option>
            <option value="erase">Cancella</option>
          </select>
        </label>
      </div>
      <p className={app.hint}>
        {d.erase
          ? 'Clic o trascina per togliere gli esagoni dalle vie del tipo scelto, che si spezzano.'
          : "Trascina per disegnare; partendo dall'estremo di una sola via la prolunga. Tornando indietro di un esagono lo togli. Sull'acqua diventa un ponte."}{' '}
        {counts}
      </p>
    </section>
  );
}

function DepotTool() {
  const d = useEditorStore((s) => s.depotDraft);
  const set = useEditorStore((s) => s.setDepotDraft);
  const names = useEditorStore((s) => s.doc.sideNames);
  const counts = useEditorStore((s) => SIDES.map((side) => `${s.doc.sideNames[side]} ${s.doc.depots.filter((x) => x.side === side).length}`).join(' · '));
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Deposito</h2>
      <div className={styles.form}>
        <label className={styles.field}>
          Nome
          <input type="text" className={styles.wide} value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className={styles.field}>
          Fazione
          <select value={d.side} onChange={(e) => set({ side: e.target.value as typeof d.side })}>
            {SIDES.map((side) => (
              <option key={side} value={side}>
                {names[side]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={app.hint}>Clic per piazzare; sostituisce il deposito già presente. Serve almeno un deposito per fazione. Depositi: {counts}</p>
    </section>
  );
}

import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SIDES, type Side } from '../core/units';
import { checkScenario, downloadJson, fromJson } from './io';
import { useEditorStore } from './store';
import app from '../ui/App.module.css';
import styles from './Editor.module.css';

/** Scenari già presenti nel gioco, da aprire come punto di partenza. */
const existing = import.meta.glob<unknown>('../scenarios/*.json', { eager: true, import: 'default' });
const existingNames = Object.keys(existing).map((p) => p.replace(/^.*\/(.+)\.json$/, '$1'));

function SideSelect({ value, onChange }: { value: Side; onChange: (s: Side) => void }) {
  const names = useEditorStore((s) => s.doc.sideNames);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Side)}>
      {SIDES.map((s) => (
        <option key={s} value={s}>
          {names[s]}
        </option>
      ))}
    </select>
  );
}

export function ScenarioPanel() {
  const m = useEditorStore(
    useShallow((s) => ({
      id: s.doc.id,
      name: s.doc.name,
      description: s.doc.description,
      defender: s.doc.defender,
      player: s.doc.player,
      firstSide: s.doc.turns.firstSide,
      sideNames: s.doc.sideNames,
    })),
  );
  const setMeta = useEditorStore((s) => s.setMeta);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Scenario</h2>
      <div className={styles.form}>
        <label className={styles.field}>
          Nome
          <input type="text" className={styles.wide} value={m.name} onChange={(e) => setMeta({ name: e.target.value })} />
        </label>
        <label className={styles.field}>
          Id (nome del file)
          <input type="text" className={styles.wide} value={m.id} onChange={(e) => setMeta({ id: e.target.value })} />
        </label>
        <label className={styles.field}>
          Descrizione
          <textarea rows={3} className={styles.wide} value={m.description} onChange={(e) => setMeta({ description: e.target.value })} />
        </label>
        {SIDES.map((side) => (
          <label key={side} className={styles.field}>
            Fazione {side === 'blue' ? 'blu' : 'rossa'}
            <input
              type="text"
              value={m.sideNames[side]}
              onChange={(e) => setMeta({ sideNames: { ...m.sideNames, [side]: e.target.value } })}
            />
          </label>
        ))}
        <label className={styles.field}>
          Giocatore
          <SideSelect value={m.player} onChange={(player) => setMeta({ player })} />
        </label>
        <label className={styles.field}>
          Difensore
          <SideSelect value={m.defender} onChange={(defender) => setMeta({ defender })} />
        </label>
        <label className={styles.field}>
          Muove per primo
          <SideSelect value={m.firstSide} onChange={(firstSide) => setMeta({ firstSide })} />
        </label>
      </div>
      <p className={app.hint}>L'altra fazione è guidata dall'IA. Il difensore possiede gli obiettivi a inizio partita.</p>
    </section>
  );
}

export function FilePanel() {
  const doc = useEditorStore((s) => s.doc);
  const data = useEditorStore((s) => s.data);
  const load = useEditorStore((s) => s.load);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const check = checkScenario(doc, data);

  const open = (raw: unknown) => {
    try {
      load(fromJson(raw, data));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      open(JSON.parse(await file.text()));
    } catch (e) {
      setError(`File non valido: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>File</h2>
      {check.errors.map((e) => (
        <p key={e} className={styles.error}>
          {e}
        </p>
      ))}
      {check.warnings.map((w) => (
        <p key={w} className={app.hint}>
          ⚠ {w}
        </p>
      ))}
      <div className={app.actions}>
        <button type="button" className={`${app.button} ${app.primary}`} disabled={check.errors.length > 0} onClick={() => downloadJson(doc)}>
          Esporta {doc.id}.json
        </button>
        <button type="button" className={app.button} onClick={() => fileRef.current?.click()}>
          Importa…
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      <label className={`${styles.field} ${styles.spaced}`}>
        Apri uno scenario del gioco
        <select value="" onChange={(e) => e.target.value && open(existing[`../scenarios/${e.target.value}.json`])}>
          <option value="">—</option>
          {existingNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <p className={app.hint}>Il file esportato va messo in src/scenarios.</p>
    </section>
  );
}

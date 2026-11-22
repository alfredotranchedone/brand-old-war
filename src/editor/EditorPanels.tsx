import { useState } from 'react';
import { tileUrl } from '../render/tiles';
import { LIMITS } from './edit';
import { useEditorStore } from './store';
import app from '../ui/App.module.css';
import styles from './Editor.module.css';

export function MapPanel() {
  const width = useEditorStore((s) => s.doc.map.width);
  const height = useEditorStore((s) => s.doc.map.height);
  const resize = useEditorStore((s) => s.resize);
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const changed = w !== width || h !== height;
  const shrinks = w < width || h < height;

  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Mappa</h2>
      <div className={styles.row}>
        <label className={styles.field}>
          Colonne
          <input type="number" min={LIMITS.minSize} max={LIMITS.maxSize} value={w} onChange={(e) => setW(Number(e.target.value))} />
        </label>
        <label className={styles.field}>
          Righe
          <input type="number" min={LIMITS.minSize} max={LIMITS.maxSize} value={h} onChange={(e) => setH(Number(e.target.value))} />
        </label>
        <button type="button" className={app.button} disabled={!changed} onClick={() => resize(w, h)}>
          Applica
        </button>
      </div>
      {changed && shrinks && <p className={app.hint}>Quello che resta fuori dalla mappa viene tolto.</p>}
    </section>
  );
}

export function TurnsPanel() {
  const turns = useEditorStore((s) => s.doc.turns.max);
  const setTurns = useEditorStore((s) => s.setTurns);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Turni</h2>
      <label className={styles.field}>
        Numero di turni
        <input
          type="number"
          min={LIMITS.minTurns}
          max={LIMITS.maxTurns}
          value={turns}
          onChange={(e) => e.target.value !== '' && setTurns(Number(e.target.value))}
        />
      </label>
    </section>
  );
}

export function TerrainPalette() {
  const terrain = useEditorStore((s) => s.data.terrain);
  const brush = useEditorStore((s) => s.brush);
  const setBrush = useEditorStore((s) => s.setBrush);
  return (
    <section className={app.card}>
      <h2 className={app.cardTitle}>Terreno</h2>
      <div className={styles.palette}>
        {Object.values(terrain).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.swatch} ${t.id === brush ? styles.active : ''}`}
            onClick={() => setBrush(t.id)}
            title={t.impassable ? `${t.name} (invalicabile)` : t.name}
          >
            <span className={styles.tile}>
              {[t.tile, t.overlay].map((name) => {
                const url = name ? tileUrl(name) : undefined;
                return url ? <img key={name} src={url} alt="" /> : null;
              })}
            </span>
            {t.name}
          </button>
        ))}
      </div>
      <p className={app.hint}>Clic o trascina per dipingere · Maiusc + trascina o tasto centrale per spostare la mappa</p>
    </section>
  );
}

const BRUSH_SIZES = [1, 2, 5, 10];

export function BrushSize() {
  const size = useEditorStore((s) => s.brushSize);
  const setSize = useEditorStore((s) => s.setBrushSize);
  return (
    <div className={styles.tools} role="radiogroup" aria-label="Dimensione del pennello">
      {BRUSH_SIZES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={size === n}
          className={`${styles.toolTab} ${size === n ? styles.active : ''}`}
          onClick={() => setSize(n)}
        >
          {n}×{n}
        </button>
      ))}
    </div>
  );
}

import { getUnit } from '../core/game';
import type { LossRange } from '../core/losses';
import { useUiStore } from './store';
import styles from './App.module.css';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const ratio = (r: number) => (Number.isFinite(r) ? `${r.toFixed(2)} : 1` : '∞');
const range = (l: LossRange) => `${l.min} · ${fmt(l.expected)} · ${l.max}`;

export function CombatPanel() {
  const preview = useUiStore((s) => s.preview);
  const game = useUiStore((s) => s.game);
  const unitTypes = useUiStore((s) => s.data.unitTypes);
  const confirm = useUiStore((s) => s.confirmAttack);
  const cancel = useUiStore((s) => s.cancelTarget);
  if (!preview) return null;

  const a = getUnit(game, preview.attackerId);
  const d = getUnit(game, preview.targetId);
  if (!a || !d) return null;
  const aName = unitTypes[a.typeId]?.name ?? a.typeId;
  const dName = unitTypes[d.typeId]?.name ?? d.typeId;
  const retreatPct = Math.round(preview.retreatChance * 100);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Anteprima attacco</h2>
      <p className={styles.combatLine}>
        {aName} → {dName}
      </p>
      <dl className={styles.facts}>
        <dt>Rapporto</dt>
        <dd>{ratio(preview.ratio)}</dd>
        <dt>Potenze</dt>
        <dd>
          {fmt(preview.attackPower)} / {fmt(preview.defensePower)}
        </dd>
        <dt>Perdite attaccante</dt>
        <dd>{preview.defenderResponds ? range(preview.attackerLosses) : 'nessuna (tiro a distanza)'}</dd>
        <dt>Perdite difensore</dt>
        <dd>{range(preview.defenderLosses)}</dd>
        <dt>Ritirata</dt>
        <dd>
          {retreatPct === 0
            ? 'no'
            : preview.retreatHex
              ? `${retreatPct}%`
              : `${retreatPct}% · bloccata, +1 step perso`}
        </dd>
      </dl>
      <p className={styles.hint}>Perdite: minime · attese · massime</p>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={confirm}>
          Attacca
        </button>
        <button type="button" className={styles.button} onClick={cancel}>
          Annulla
        </button>
      </div>
    </section>
  );
}

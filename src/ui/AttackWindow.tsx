import { entrenchmentNegated, isEntrenchedEffective } from '../core/combatPower';
import { getUnit } from '../core/game';
import type { LossRange } from '../core/losses';
import { useUiStore } from './store';
import app from './App.module.css';
import styles from './AttackWindow.module.css';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pct = (n: number) => `${n > 0 ? '+' : '−'}${Math.round(Math.abs(n) * 100)}%`;
const mult = (n: number) => `×${String(Math.round(n * 1000) / 1000).replace('.', ',')}`;
const ratio = (r: number) => (Number.isFinite(r) ? `${r.toFixed(2)} : 1` : '∞');
const range = (l: LossRange) => `${l.min} · ${fmt(l.expected)} · ${l.max}`;
const units = (n: number) => `${n} unità`;

/** Finestra di anteprima dell'attacco, con i supporti e la conferma. */
export function AttackWindow() {
  const preview = useUiStore((s) => s.preview);
  const game = useUiStore((s) => s.game);
  const data = useUiStore((s) => s.data);
  const unitTypes = data.unitTypes;
  const confirm = useUiStore((s) => s.confirmAttack);
  const cancel = useUiStore((s) => s.cancelTarget);
  if (!preview) return null;

  const a = getUnit(game, preview.attackerId);
  const d = getUnit(game, preview.targetId);
  if (!a || !d) return null;
  const name = (id: string) => {
    const u = getUnit(game, id);
    return u ? (unitTypes[u.typeId]?.name ?? u.typeId) : id;
  };
  const m = preview.modifiers;
  const sup = preview.support;
  const baseAtt = m.attack / ((1 + m.offensiveBonus) * m.barrageMod);
  const baseDef = m.defense / (1 + m.defensiveBonus);
  const retreatPct = Math.round(preview.retreatChance * 100);

  return (
    <section className={styles.window} role="dialog" aria-label="Anteprima attacco">
      <h2 className={app.cardTitle}>Anteprima attacco</h2>
      <p className={app.combatLine}>
        {name(a.id)} → {name(d.id)}
      </p>

      <dl className={`${app.facts} ${styles.rows}`}>
        <dt>Attacco</dt>
        <dd>{fmt(baseAtt)}</dd>
        {sup.offensive.length > 0 && (
          <>
            <dt title={sup.offensive.map(name).join(', ')}>Supporto fianchi ({units(sup.offensive.length)})</dt>
            <dd className={styles.good}>{pct(m.offensiveBonus)}</dd>
          </>
        )}
        {sup.barrage.length > 0 && (
          <>
            <dt>Sbarramento nemico</dt>
            <dd className={styles.bad}>{pct(m.barrageMod - 1)}</dd>
          </>
        )}
        <dt className={styles.total}>Attacco totale</dt>
        <dd className={styles.total}>{fmt(m.attack)}</dd>

        <dt>Difesa</dt>
        <dd>{fmt(baseDef)}</dd>
        {m.terrainMod.before !== 1 && (
          <>
            <dt>Terreno e trincea</dt>
            <dd>{mult(m.terrainMod.before)}</dd>
          </>
        )}
        {isEntrenchedEffective(data, d) && entrenchmentNegated(game, data, d) && (
          <>
            <dt>Trincea annullata (genieri)</dt>
            <dd className={styles.good}>—</dd>
          </>
        )}
        {sup.artilleryCover.length > 0 && m.terrainMod.after !== m.terrainMod.before && (
          <>
            <dt>Copertura artiglieria</dt>
            <dd className={styles.good}>→ {mult(m.terrainMod.after)}</dd>
          </>
        )}
        {sup.defensive.length > 0 && (
          <>
            <dt title={sup.defensive.map(name).join(', ')}>Supporto difensivo ({units(sup.defensive.length)})</dt>
            <dd className={styles.bad}>{pct(m.defensiveBonus)}</dd>
          </>
        )}
        <dt className={styles.total}>Difesa totale</dt>
        <dd className={styles.total}>{fmt(m.defense)}</dd>

        <dt>Rapporto</dt>
        <dd>{ratio(preview.ratio)}</dd>
        <dt>Perdite attaccante</dt>
        <dd>{preview.defenderResponds ? range(preview.attackerLosses) : 'nessuna'}</dd>
        <dt>Perdite difensore</dt>
        <dd>{range(preview.defenderLosses)}</dd>
        <dt>Ritirata</dt>
        <dd>{retreatPct === 0 ? 'no' : preview.retreatHex ? `${retreatPct}%` : `${retreatPct}% · bloccata`}</dd>
      </dl>
      <p className={app.hint}>Perdite: minime · attese · massime</p>
      <div className={app.actions}>
        <button type="button" className={`${app.button} ${app.primary}`} onClick={confirm} autoFocus>
          Attacca
        </button>
        <button type="button" className={app.button} onClick={cancel}>
          Annulla
        </button>
      </div>
    </section>
  );
}

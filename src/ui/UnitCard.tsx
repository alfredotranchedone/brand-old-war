import { useMemo } from 'react';
import { getUnit } from '../core/game';
import { hasTag } from '../core/units';
import { isWeak } from '../core/weakness';
import { symbolDataUrl } from '../render/symbols';
import { MOBILITY_LABEL, TARGET_CLASS_LABEL } from './labels';
import { useUiStore } from './store';
import { supplyText } from './supplyText';
import styles from './App.module.css';

/** Scheda dell'unità selezionata. */
export function UnitCard() {
  const unit = useUiStore((s) => (s.selectedUnitId ? getUnit(s.game, s.selectedUnitId) : undefined));
  const data = useUiStore((s) => s.data);
  const setup = useUiStore((s) => s.game.setup);
  const type = unit ? data.unitTypes[unit.typeId] : undefined;
  const symbol = useMemo(() => (type && unit ? symbolDataUrl(type, unit.side, 34) : ''), [type, unit?.side]);

  if (!unit || !type) return null;

  const max = data.rules.maxStrength;
  const canEntrench = data.rules.entrenchment.appliesToTags.some((t) => hasTag(type, t));
  const role = unit.side === setup.player ? 'giocatore' : 'IA';
  const status = unit.hasAttacked
    ? 'Ha attaccato'
    : unit.hasMoved
      ? 'Ha mosso'
      : isWeak(data.rules, unit)
        ? 'Logorata: non può attaccare, PM dimezzati'
        : 'Pronta';

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Unità</h2>
      <div className={styles.unitHead}>
        <img src={symbol} alt="" className={styles.unitSymbol} />
        <div>
          <div className={styles.unitName}>{type.name}</div>
          <div className={styles.muted}>
            {setup.sideNames[unit.side]} ({role}) · battaglione
          </div>
        </div>
      </div>

      <div className={styles.strength} aria-label={`Forza ${unit.strength} su ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={i < unit.strength ? styles.stepOn : styles.stepOff} />
        ))}
      </div>

      <dl className={styles.facts}>
        <dt>Forza</dt>
        <dd>
          {unit.strength} / {max}
        </dd>
        <dt>PM residui</dt>
        <dd>
          {unit.movesLeft} / {type.move}
        </dd>
        <dt>Stato</dt>
        <dd>{status}</dd>
        <dt>Rifornimento</dt>
        <dd className={unit.outOfSupplyTurns > 0 ? styles.warn : undefined}>
          {supplyText(data, unit)}
        </dd>
        <dt>Trincerata</dt>
        <dd>{canEntrench ? (unit.entrenched ? 'Sì' : 'No') : '—'}</dd>
      </dl>

      <h3 className={styles.subTitle}>Caratteristiche</h3>
      <dl className={styles.facts}>
        <dt>Attacco vs blindati</dt>
        <dd>{type.attack.armored}</dd>
        <dt>Attacco vs non blindati</dt>
        <dd>{type.attack.unarmored}</dd>
        <dt>Attacco vs aerei</dt>
        <dd>{type.attack.air}</dd>
        <dt>Difesa</dt>
        <dd>{type.defense}</dd>
        <dt>Portata</dt>
        <dd>{type.range === 1 ? '1 esagono' : `${type.range} esagoni`}</dd>
        <dt>Bersaglio</dt>
        <dd>{TARGET_CLASS_LABEL[type.targetClass]}</dd>
        <dt>Mobilità</dt>
        <dd>{MOBILITY_LABEL[type.mobility]}</dd>
        {type.aaRadius > 0 && (
          <>
            <dt>Bolla contraerea</dt>
            <dd>{type.aaRadius} esagoni</dd>
          </>
        )}
        {type.ewRadius > 0 && (
          <>
            <dt>Bolla EW</dt>
            <dd>{type.ewRadius} esagoni</dd>
          </>
        )}
      </dl>
    </section>
  );
}

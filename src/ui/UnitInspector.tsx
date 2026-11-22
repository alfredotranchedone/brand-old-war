import { useMemo } from 'react';
import { unitAt } from '../core/game';
import { symbolDataUrl } from '../render/symbols';
import { SIDE_LABEL } from './labels';
import { effective } from './organic';
import { useUiStore } from './store';
import { supplyText } from './supplyText';
import styles from './App.module.css';

/** Ispezione dell'unità sotto il cursore: organico stimato e rifornimento. */
export function UnitInspector() {
  const unit = useUiStore((s) => (s.hovered ? unitAt(s.game, s.hovered) : undefined));
  const data = useUiStore((s) => s.data);
  const type = unit ? data.unitTypes[unit.typeId] : undefined;
  const symbol = useMemo(() => (type && unit ? symbolDataUrl(type, unit.side, 34) : ''), [type, unit?.side]);

  if (!unit || !type) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ispezione</h2>
        <p className={styles.muted}>Passa il mouse su un'unità.</p>
      </section>
    );
  }

  const max = data.rules.maxStrength;
  const { personnel, mainVehicles, mainVehiclesLabel, supportVehicles } = type.organic;
  const rows: [string, number][] = [
    ['Uomini', personnel],
    [mainVehiclesLabel, mainVehicles],
    ['Mezzi di supporto', supportVehicles],
  ];

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Ispezione</h2>
      <div className={styles.unitHead}>
        <img src={symbol} alt="" className={styles.unitSymbol} />
        <div>
          <div className={styles.unitName}>{type.name}</div>
          <div className={styles.muted}>
            {SIDE_LABEL[unit.side]} · forza {unit.strength} / {max}
          </div>
        </div>
      </div>
      <dl className={`${styles.facts} ${styles.organic}`}>
        {rows
          .filter(([, nominal]) => nominal > 0)
          .map(([label, nominal]) => (
            <div key={label} className={styles.factRow}>
              <dt>{label}</dt>
              <dd>
                ~{effective(nominal, unit.strength, max)} / {nominal}
              </dd>
            </div>
          ))}
      </dl>
      {unit.outOfSupplyTurns > 0 && <p className={styles.badge}>{supplyText(data.rules, unit)}</p>}
    </section>
  );
}

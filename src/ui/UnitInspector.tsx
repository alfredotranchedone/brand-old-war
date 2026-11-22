import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { unitsAt } from '../core/game';
import type { Unit } from '../core/units';
import { symbolDataUrl } from '../render/symbols';
import { effective } from './organic';
import { useUiStore } from './store';
import { supplyText } from './supplyText';
import styles from './App.module.css';

/** Ispezione delle unità sotto il cursore (terrestre e aerea): organico stimato e rifornimento. */
export function UnitInspector() {
  const units = useUiStore(useShallow((s) => (s.hovered ? unitsAt(s.game, s.data, s.hovered) : [])));
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Ispezione</h2>
      {units.length === 0 && <p className={styles.muted}>Passa il mouse su un'unità.</p>}
      {units.map((u) => (
        <UnitDetails key={u.id} unit={u} />
      ))}
    </section>
  );
}

function UnitDetails({ unit }: { unit: Unit }) {
  const data = useUiStore((s) => s.data);
  const sideNames = useUiStore((s) => s.game.setup.sideNames);
  const type = data.unitTypes[unit.typeId];
  const symbol = useMemo(() => (type ? symbolDataUrl(type, unit.side, 34) : ''), [type, unit.side]);
  if (!type) return null;

  const max = data.rules.maxStrength;
  const { personnel, mainVehicles, mainVehiclesLabel, supportVehicles } = type.organic;
  const rows: [string, number][] = [
    ['Uomini', personnel],
    [mainVehiclesLabel, mainVehicles],
    ['Mezzi di supporto', supportVehicles],
  ];

  return (
    <div className={styles.inspected}>
      <div className={styles.unitHead}>
        <img src={symbol} alt="" className={styles.unitSymbol} />
        <div>
          <div className={styles.unitName}>{type.name}</div>
          <div className={styles.muted}>
            {sideNames[unit.side]} · forza {unit.strength} / {max}
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
    </div>
  );
}

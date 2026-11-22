import { useShallow } from 'zustand/react/shallow';
import { axialToOffset, hexKey } from '../core/hex';
import { type Objective, getHex, objectiveAt } from '../core/map';
import { supplyFor } from './renderInput';
import { type UiState, isPlayerTurn, useUiStore } from './store';
import { requestEndTurn } from './requestEndTurn';
import styles from './App.module.css';

function placeText(s: UiState, label: string | undefined, objective: Objective | undefined): string {
  if (!objective) return label ?? '';
  const owner = s.game.setup.sideNames[s.game.objectives[objective.id] ?? s.game.setup.defender];
  const points = `${objective.points} ${objective.points === 1 ? 'punto' : 'punti'}`;
  return [label, objective.name, points, owner].filter(Boolean).join(' · ');
}

function useHexFacts() {
  return useUiStore(useShallow((s) => {
    const h = s.hovered;
    if (!h) return { coords: '', terrain: '', supply: '', place: '' };
    const { col, row } = axialToOffset(h);
    const hexData = getHex(s.game.map, h);
    const key = hexKey(h);
    const supplied = supplyFor(s).filter((o) => o.hexes.has(key)).map((o) => s.game.setup.sideNames[o.side]);
    return {
      coords: `${col}, ${row}`,
      terrain: hexData ? (s.data.terrain[hexData.terrain]?.name ?? '—') : '—',
      supply: supplied.length ? supplied.join(', ') : 'nessuno',
      place: placeText(s, hexData?.label, objectiveAt(s.game.map, h)),
    };
  }));
}

export function BottomBar() {
  const facts = useHexFacts();
  const playerTurn = useUiStore((s) => isPlayerTurn(s.game));

  return (
    <footer className={styles.bottomBar}>
      <span className={styles.barHex}>
        {facts.coords ? (
          <>
            <span>Esagono {facts.coords}</span>
            <span>{facts.terrain}</span>
            <span>Rifornimento: {facts.supply}</span>
          </>
        ) : (
          <span className={styles.muted}>Passa il mouse sulla mappa</span>
        )}
      </span>
      <span className={styles.barPlace}>{facts.place}</span>
      <span className={styles.barEnd}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={requestEndTurn} disabled={!playerTurn} title="Fine turno (Invio)">
          Fine turno
        </button>
      </span>
    </footer>
  );
}

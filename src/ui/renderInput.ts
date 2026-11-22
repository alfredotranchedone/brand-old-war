import { getUnit, liveUnits } from '../core/game';
import { hexKey } from '../core/hex';
import { pathTo, reachableHexes } from '../core/movement';
import { SIDES, type Side, otherSide } from '../core/units';
import { exertsZoc, zocOf } from '../core/zoc';
import type { RenderInput, ZocOverlay } from '../render/mapRenderer';
import type { UiState } from './store';

/** Area della ZOC di una fazione, esagoni delle sue unità inclusi (per un contorno senza buchi). */
function zocArea({ game, data }: UiState, side: Side): ZocOverlay {
  const hexes = zocOf(game, data, side);
  for (const u of liveUnits(game, side)) if (exertsZoc(data, u)) hexes.add(hexKey(u.pos));
  return { side, hexes };
}

/** Traduce lo stato dello store nei dati che il renderer disegna. */
export function buildRenderInput(s: UiState): RenderInput {
  const { game, data, reach, hovered } = s;
  const selected = s.selectedUnitId ? getUnit(game, s.selectedUnitId) : undefined;

  let zoc: ZocOverlay[] = [];
  if (s.showZoc) zoc = SIDES.map((side) => zocArea(s, side));
  else if (reach && selected) zoc = [zocArea(s, otherSide(selected.side))];

  let path: RenderInput['path'] = null;
  if (reach && hovered) {
    const hexes = pathTo(reach, hovered);
    const node = reach.nodes.get(hexKey(hovered));
    if (hexes && node) path = { hexes, cost: node.cost };
  }

  return {
    map: game.map,
    unitTypes: data.unitTypes,
    units: game.units,
    objectives: game.objectives,
    hovered,
    selectedUnitId: s.selectedUnitId,
    reachable: reach ? reachableHexes(reach) : [],
    path,
    zoc,
    showCoords: s.showCoords,
  };
}

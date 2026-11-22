import { spentUnits } from '../core/availability';
import type { GameState } from '../core/game';
import { getUnit, liveUnits } from '../core/game';
import { hexKey } from '../core/hex';
import { pathTo, reachableHexes } from '../core/movement';
import { SIDES, type Side, otherSide } from '../core/units';
import { supplyNetwork } from '../core/supplyNetwork';
import { exertsZoc, zocOf } from '../core/zoc';
import type { RenderInput, SupplyOverlay, ZocOverlay } from '../render/mapRenderer';
import type { UiState } from './store';

/** Area della ZOC di una fazione, esagoni delle sue unità inclusi (per un contorno senza buchi). */
function zocArea({ game, data }: UiState, side: Side): ZocOverlay {
  const hexes = zocOf(game, data, side);
  for (const u of liveUnits(game, side)) if (exertsZoc(data, u)) hexes.add(hexKey(u.pos));
  return { side, hexes };
}

const spentCache = new WeakMap<GameState, Set<string>>();

function spentFor(s: UiState): Set<string> {
  let spent = spentCache.get(s.game);
  if (!spent) {
    spent = spentUnits(s.game, s.data);
    spentCache.set(s.game, spent);
  }
  return spent;
}

const supplyCache = new WeakMap<GameState, SupplyOverlay[]>();

function supplyFor(s: UiState): SupplyOverlay[] {
  let overlays = supplyCache.get(s.game);
  if (!overlays) {
    overlays = SIDES.map((side) => ({ side, hexes: new Set(supplyNetwork(s.game, s.data, side).cost.keys()) }));
    supplyCache.set(s.game, overlays);
  }
  return overlays;
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
    supply: s.showSupply ? supplyFor(s) : [],
    targets: s.targets.flatMap((id) => getUnit(game, id)?.pos ?? []),
    chosenTarget: s.preview ? (getUnit(game, s.preview.targetId)?.pos ?? null) : null,
    advanceHex:
      game.pendingAdvance && game.pendingAdvance.unitId === s.selectedUnitId ? game.pendingAdvance.to : null,
    spent: spentFor(s),
    showCoords: s.showCoords,
  };
}

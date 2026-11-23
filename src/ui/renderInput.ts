import { spentUnits } from '../core/availability';
import type { GameState } from '../core/game';
import { getUnit, liveUnits, unitsAt } from '../core/game';
import { hexKey, hexesInRange } from '../core/hex';
import { isOnMap } from '../core/map';
import { ignoresZoc, pathTo, reachableHexes } from '../core/movement';
import { SIDES, type Side, otherSide } from '../core/units';
import { supplyNetwork } from '../core/supplyNetwork';
import { exertsZoc, zocOf } from '../core/zoc';
import type { RenderInput, SupplyOverlay, ZocOverlay } from '../render/mapRenderer';
import type { UiState } from './store';

/** Calcola la zona di controllo della fazione: unità che esercitano ZOC e loro esagoni vicini. */
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

export function supplyFor(s: UiState): SupplyOverlay[] {
  let overlays = supplyCache.get(s.game);
  if (!overlays) {
    overlays = SIDES.map((side) => ({ side, hexes: supplyNetwork(s.game, s.data, side).hexes }));
    supplyCache.set(s.game, overlays);
  }
  return overlays;
}

function supportHexesFor({ game, preview }: UiState): RenderInput['supportHexes'] {
  const pos = (ids: readonly string[]) => ids.flatMap((id) => getUnit(game, id)?.pos ?? []);
  if (!preview) return { attacker: [], defender: [] };
  const sup = preview.support;
  return { attacker: pos([...sup.offensive, ...sup.artilleryCover]), defender: pos([...sup.defensive, ...sup.barrage]) };
}

/** Visualizza le bolle di contraerea e guerra elettronica dell'unità selezionata e di quelle sotto il cursore. */
function bubblesFor({ game, data, hovered, selectedUnitId }: UiState): NonNullable<RenderInput['bubbles']> {
  const units = [...(hovered ? unitsAt(game, data, hovered) : [])];
  const selected = selectedUnitId ? getUnit(game, selectedUnitId) : undefined;
  if (selected && !units.includes(selected)) units.push(selected);
  const out: { kind: 'aa' | 'ew'; hexes: Set<string> }[] = [];
  for (const u of units) {
    const t = data.unitTypes[u.typeId];
    if (!t) continue;
    for (const [kind, r] of [['aa', t.aaRadius], ['ew', t.ewRadius]] as const) {
      if (r > 0) out.push({ kind, hexes: new Set(hexesInRange(u.pos, r).filter((h) => isOnMap(game.map, h)).map(hexKey)) });
    }
  }
  return out;
}

/** Converte lo stato del gioco e dell'interfaccia nei dati che il renderer disegna. */
export function buildRenderInput(s: UiState): RenderInput {
  const { game, data, reach, hovered } = s;
  const selected = s.selectedUnitId ? getUnit(game, s.selectedUnitId) : undefined;

  let zoc: ZocOverlay[] = [];
  if (s.showZoc) zoc = SIDES.map((side) => zocArea(s, side));
  else if (reach && selected && !ignoresZoc(data.unitTypes[selected.typeId]!)) zoc = [zocArea(s, otherSide(selected.side))];

  let path: RenderInput['path'] = null;
  if (reach && hovered) {
    const hexes = pathTo(reach, hovered);
    const node = reach.nodes.get(hexKey(hovered));
    if (hexes && node) path = { hexes, cost: node.cost };
  }

  return {
    map: game.map,
    unitTypes: data.unitTypes,
    terrain: data.terrain,
    units: game.units,
    objectives: game.objectives,
    depots: game.depots,
    hovered,
    selectedUnitId: s.selectedUnitId,
    reachable: reach ? reachableHexes(reach) : [],
    path,
    zoc,
    supply: s.showSupply ? supplyFor(s) : [],
    targets: s.targets.flatMap((id) => getUnit(game, id)?.pos ?? []),
    chosenTarget: s.preview ? (getUnit(game, s.preview.targetId)?.pos ?? null) : null,
    supportHexes: supportHexesFor(s),
    advanceHex:
      game.pendingAdvance && game.pendingAdvance.unitId === s.selectedUnitId ? game.pendingAdvance.to : null,
    spent: spentFor(s),
    showCoords: s.showCoords,
    bubbles: bubblesFor(s),
  };
}

/**
 * Tipi di unità (da units.json) e istanze in gioco.
 */
import type { Axial } from './hex';
import { DataError, array, dictionary, int, num, oneOf, record, str } from './validate';

export type Side = 'blue' | 'red';
export const SIDES: readonly Side[] = ['blue', 'red'];

export function otherSide(side: Side): Side {
  return side === 'blue' ? 'red' : 'blue';
}

/** Classe di bersaglio: decide quale valore di attacco usa chi spara. */
export type TargetClass = 'armored' | 'unarmored';
export const TARGET_CLASSES: readonly TargetClass[] = ['armored', 'unarmored'];

export type Mobility = 'tracked' | 'wheeled' | 'foot';
export const MOBILITIES: readonly Mobility[] = ['tracked', 'wheeled', 'foot'];

/** Etichette di comportamento: le regole speciali si agganciano qui, non al nome del tipo. */
export type UnitTag = 'infantry' | 'recon' | 'artillery';
export const UNIT_TAGS: readonly UnitTag[] = ['infantry', 'recon', 'artillery'];

export interface UnitType {
  readonly id: string;
  readonly name: string;
  /** Codice simbolo APP-6 / 2525 (15 caratteri). L'affiliazione (2° carattere) viene impostata per fazione. */
  readonly sidc: string;
  readonly move: number;
  readonly attack: Readonly<Record<TargetClass, number>>;
  readonly defense: number;
  /** Portata d'attacco in esagoni (1 = solo adiacente). */
  readonly range: number;
  readonly targetClass: TargetClass;
  readonly mobility: Mobility;
  /** Portata di avvistamento: usata solo con la futura nebbia di guerra. */
  readonly spotting: number;
  readonly tags: readonly UnitTag[];
}

export type UnitTypeTable = Readonly<Record<string, UnitType>>;

export interface Unit {
  id: string;
  /** Chiave in units.json. */
  typeId: string;
  side: Side;
  pos: Axial;
  /** 0..maxStrength; a 0 l'unità è distrutta. */
  strength: number;
  movesLeft: number;
  hasMoved: boolean;
  hasAttacked: boolean;
  entrenched: boolean;
  /** Turni consecutivi fuori rifornimento (0 = rifornita). */
  outOfSupplyTurns: number;
}

export function hasTag(type: UnitType, tag: UnitTag): boolean {
  return type.tags.includes(tag);
}

export function isAlive(unit: Unit): boolean {
  return unit.strength > 0;
}

/** Ha già agito nel turno: ha attaccato, oppure ha mosso e non ha più punti movimento. */
export function hasActed(unit: Unit): boolean {
  return unit.hasAttacked || (unit.hasMoved && unit.movesLeft <= 0);
}

/** SIDC del tipo con l'affiliazione della fazione: F (amico) per il Blu, H (ostile) per il Rosso. */
export function sidcForSide(type: UnitType, side: Side): string {
  return type.sidc.slice(0, 1) + (side === 'blue' ? 'F' : 'H') + type.sidc.slice(2);
}

export function parseUnitTypes(raw: unknown): UnitTypeTable {
  return dictionary(raw, 'units.json', (v, path, id) => {
    const o = record(v, path);
    const sidc = str(o.sidc, `${path}.sidc`);
    if (sidc.length !== 15) throw new DataError(`${path}.sidc`, 'il SIDC deve avere 15 caratteri');
    const attack = record(o.attack, `${path}.attack`);
    const range = int(o.range, `${path}.range`, 1);
    return {
      id,
      name: str(o.name, `${path}.name`),
      sidc,
      move: int(o.move, `${path}.move`, 0),
      attack: {
        armored: num(attack.armored, `${path}.attack.armored`, 0),
        unarmored: num(attack.unarmored, `${path}.attack.unarmored`, 0),
      },
      defense: num(o.defense, `${path}.defense`, 0),
      range,
      targetClass: oneOf(o.targetClass, `${path}.targetClass`, TARGET_CLASSES),
      mobility: oneOf(o.mobility, `${path}.mobility`, MOBILITIES),
      spotting: int(o.spotting, `${path}.spotting`, 1),
      tags: array(o.tags ?? [], `${path}.tags`).map((t, i) => oneOf(t, `${path}.tags[${i}]`, UNIT_TAGS)),
    } satisfies UnitType;
  });
}

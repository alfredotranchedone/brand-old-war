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
export type TargetClass = 'armored' | 'unarmored' | 'air';
export const TARGET_CLASSES: readonly TargetClass[] = ['armored', 'unarmored', 'air'];

/** `air`: elicotteri e droni (layer aereo), ignorano terreno e ZOC terrestre. */
export type Mobility = 'tracked' | 'wheeled' | 'foot' | 'air';
export const MOBILITIES: readonly Mobility[] = ['tracked', 'wheeled', 'foot', 'air'];
/** Mobilità terrestri: hanno un costo di movimento nel terreno. */
export type GroundMobility = Exclude<Mobility, 'air'>;

/** Etichette di comportamento: le regole speciali si agganciano qui, non al nome del tipo. */
export type UnitTag = 'infantry' | 'recon' | 'artillery' | 'infiltrator' | 'engineer' | 'helicopter' | 'uav';
export const UNIT_TAGS: readonly UnitTag[] = ['infantry', 'recon', 'artillery', 'infiltrator', 'engineer', 'helicopter', 'uav'];

export interface UnitType {
  readonly id: string;
  readonly name: string;
  /** Codice simbolo APP-6 / 2525 (15 caratteri). L'affiliazione (2° carattere) viene impostata per fazione. */
  readonly sidc: string;
  /** Testo dentro la cornice al posto dell'icona (es. «HQ»). */
  readonly symbolText?: string;
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
  /** Turni fuori rifornimento che valgono come uno (1 = normale, 3 = resiste il triplo). */
  readonly supplyEndurance: number;
  /** Raggio della bolla contraerea in esagoni (0 = nessuna). */
  readonly aaRadius: number;
  /** Raggio della bolla di guerra elettronica in esagoni (0 = nessuna). */
  readonly ewRadius: number;
  /** Organico nominale a forza piena: solo informativo, non entra nelle regole. */
  readonly organic: Organic;
}

export interface Organic {
  readonly personnel: number;
  readonly mainVehicles: number;
  /** Nome dei mezzi principali nell'interfaccia (es. «Carri armati»). */
  readonly mainVehiclesLabel: string;
  readonly supportVehicles: number;
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
  /** Ha già dato supporto difensivo (o sbarramento) in questo turno nemico. */
  hasReacted: boolean;
  entrenched: boolean;
  /** Turni consecutivi fuori rifornimento (0 = rifornita). */
  outOfSupplyTurns: number;
}

export function hasTag(type: UnitType, tag: UnitTag): boolean {
  return type.tags.includes(tag);
}

/** Elicotteri e droni: occupano il posto aereo dell'esagono. */
export function isAirType(type: UnitType): boolean {
  return type.mobility === 'air';
}

export function isAlive(unit: Unit): boolean {
  return unit.strength > 0;
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
    const organic = record(o.organic, `${path}.organic`);
    return {
      id,
      name: str(o.name, `${path}.name`),
      sidc,
      ...(o.symbolText !== undefined ? { symbolText: str(o.symbolText, `${path}.symbolText`) } : {}),
      move: int(o.move, `${path}.move`, 0),
      attack: {
        armored: num(attack.armored, `${path}.attack.armored`, 0),
        unarmored: num(attack.unarmored, `${path}.attack.unarmored`, 0),
        air: num(attack.air, `${path}.attack.air`, 0),
      },
      defense: num(o.defense, `${path}.defense`, 0),
      range,
      targetClass: oneOf(o.targetClass, `${path}.targetClass`, TARGET_CLASSES),
      mobility: oneOf(o.mobility, `${path}.mobility`, MOBILITIES),
      spotting: int(o.spotting, `${path}.spotting`, 1),
      tags: array(o.tags ?? [], `${path}.tags`).map((t, i) => oneOf(t, `${path}.tags[${i}]`, UNIT_TAGS)),
      supplyEndurance: int(o.supplyEndurance ?? 1, `${path}.supplyEndurance`, 1),
      aaRadius: int(o.aaRadius ?? 0, `${path}.aaRadius`, 0),
      ewRadius: int(o.ewRadius ?? 0, `${path}.ewRadius`, 0),
      organic: {
        personnel: int(organic.personnel, `${path}.organic.personnel`, 0),
        mainVehicles: int(organic.mainVehicles, `${path}.organic.mainVehicles`, 0),
        mainVehiclesLabel: str(organic.mainVehiclesLabel, `${path}.organic.mainVehiclesLabel`),
        supportVehicles: int(organic.supportVehicles, `${path}.organic.supportVehicles`, 0),
      },
    } satisfies UnitType;
  });
}

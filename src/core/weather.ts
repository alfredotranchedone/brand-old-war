/**
 * Meteo e luce (weather.json). Nella demo è sempre "clear" e "day", con modificatori neutri,
 * ma movimento, rifornimenti e artiglieria li leggono già da qui.
 * In futuro il meteo sarà estratto a caso per scenario, sempre tramite rng.ts.
 */
import type { GroundMobility } from './units';
import { dictionary, num, record, str } from './validate';

export type Daylight = 'day' | 'night';
export const DAYLIGHTS: readonly Daylight[] = ['day', 'night'];

export interface WeatherType {
  readonly id: string;
  readonly name: string;
  readonly spottingMod: number;
  readonly moveCostMod: Readonly<Record<GroundMobility, number>>;
  readonly supplyRangeMod: number;
  readonly artilleryMod: number;
}

export type WeatherTable = Readonly<Record<string, WeatherType>>;

/** Condizioni di un turno dello scenario. */
export interface TurnConditions {
  readonly weather: string;
  readonly daylight: Daylight;
}

export function parseWeather(raw: unknown): WeatherTable {
  return dictionary(raw, 'weather.json', (v, path, id) => {
    const o = record(v, path);
    const mc = record(o.moveCostMod, `${path}.moveCostMod`);
    return {
      id,
      name: str(o.name, `${path}.name`),
      spottingMod: num(o.spottingMod, `${path}.spottingMod`, 0),
      moveCostMod: {
        tracked: num(mc.tracked, `${path}.moveCostMod.tracked`, 0),
        wheeled: num(mc.wheeled, `${path}.moveCostMod.wheeled`, 0),
        foot: num(mc.foot, `${path}.moveCostMod.foot`, 0),
      },
      supplyRangeMod: num(o.supplyRangeMod, `${path}.supplyRangeMod`, 0),
      artilleryMod: num(o.artilleryMod, `${path}.artilleryMod`, 0),
    } satisfies WeatherType;
  });
}

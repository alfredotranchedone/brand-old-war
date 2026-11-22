import type { Mobility, TargetClass } from '../core/units';

export const TARGET_CLASS_LABEL: Record<TargetClass, string> = {
  armored: 'Blindato',
  unarmored: 'Non blindato',
  air: 'Aereo',
};

export const MOBILITY_LABEL: Record<Mobility, string> = {
  tracked: 'Cingolata',
  wheeled: 'Ruotata',
  foot: 'A piedi',
  air: 'Aerea',
};

import type { EraId } from '../state';

export interface EraDef {
  id: EraId;
  nameKey: string;
  /** порядок прогрессии */
  order: number;
}

/** Движок поддерживает все 14 эпох; контент наполняется по фазам. */
export const eraDefs: Record<EraId, EraDef> = {
  stone_age: { id: 'stone_age', nameKey: 'era.stone_age', order: 0 },
  bronze_age: { id: 'bronze_age', nameKey: 'era.bronze_age', order: 1 },
  iron_age: { id: 'iron_age', nameKey: 'era.iron_age', order: 2 },
};

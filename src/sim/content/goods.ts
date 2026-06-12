import type { EraId, GoodId } from '../state';

export interface GoodDef {
  id: GoodId;
  nameKey: string;
  eraId: EraId;
}

/** Товары эпох — фаза 3+. Пока пусто. */
export const goodDefs: Record<GoodId, GoodDef> = {};

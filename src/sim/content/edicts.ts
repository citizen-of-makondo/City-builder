export interface EdictDef {
  id: string;
  nameKey: string;
  /** модификаторы эффекта — через sim/systems/modifiers.ts (фаза 5) */
}

/** Эдикты — фаза 5. Пока пусто. */
export const edictDefs: Record<string, EdictDef> = {};

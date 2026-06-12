/**
 * Единая система модификаторов (фаза 6.5): все бонусы/штрафы —
 * от великих зданий, эдиктов, счастья, технологий — складываются здесь,
 * без точечных `if` по системам.
 */

export type ModifierTarget = 'production_speed' | 'tax_income' | 'happiness' | 'knowledge_rate';

export interface Modifier {
  /** источник: id великого здания, эдикта и т.п. */
  sourceId: string;
  target: ModifierTarget;
  /** аддитивный процент: +0.2 = +20% */
  add: number;
}

/** Суммарный множитель для цели по списку активных модификаторов. */
export function totalMultiplier(modifiers: readonly Modifier[], target: ModifierTarget): number {
  let add = 0;
  for (const m of modifiers) {
    if (m.target === target) {
      add += m.add;
    }
  }
  return 1 + add;
}

import type { GameState } from '../state';
import type { SimEvent } from './events';

/** Фаза 3: налоги с жилья, производственные циклы, товары эпох. */
export function runEconomy(state: GameState, _events: SimEvent[]): GameState {
  return state;
}

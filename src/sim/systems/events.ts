import type { GameState } from '../state';

/** Событие симуляции — для UI, аудио, летописи. */
export interface SimEvent {
  type: string;
  payload?: unknown;
}

/** Фаза 5: пул карточек-событий, триггеры по лояльности фракций. */
export function runEvents(state: GameState, _events: SimEvent[]): GameState {
  return state;
}

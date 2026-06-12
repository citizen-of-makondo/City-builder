import type { GameState } from './state';
import type { SimEvent } from './systems/events';
import { runEconomy } from './systems/economy';
import { runPopulation } from './systems/population';
import { runEstates } from './systems/estates';
import { runFactions } from './systems/factions';
import { runEvents } from './systems/events';

export interface TickResult {
  state: GameState;
  events: SimEvent[];
}

/**
 * Главный детерминированный цикл: 1 тик = 1 секунда игрового времени.
 * Системы выполняются в фиксированном порядке; никаких Date.now()/Math.random().
 */
export function tick(state: GameState): TickResult {
  const events: SimEvent[] = [];
  let next: GameState = { ...state, tick: state.tick + 1 };

  next = runEconomy(next, events);
  next = runPopulation(next, events);
  next = runEstates(next, events);
  next = runFactions(next, events);
  next = runEvents(next, events);

  return { state: next, events };
}

/** Прокрутить N тиков подряд (загрузка, оффлайн-прогресс). */
export function tickMany(state: GameState, count: number): TickResult {
  let current = state;
  const events: SimEvent[] = [];
  for (let i = 0; i < count; i++) {
    const result = tick(current);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

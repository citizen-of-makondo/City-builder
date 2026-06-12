import type { GameState } from '../state';
import { tickMany } from '../tick';
import { balance } from '../content/balance';

export interface OfflineResult {
  state: GameState;
  /** сколько тиков реально прокручено (с учётом КПД и потолка) */
  ticksApplied: number;
}

/**
 * Оффлайн-прогресс: «прокрутить N тиков при загрузке» с КПД из balance.ts.
 * elapsedSeconds — реальное время отсутствия, считается снаружи sim.
 */
export function applyOfflineProgress(state: GameState, elapsedSeconds: number): OfflineResult {
  const raw = Math.floor(Math.max(0, elapsedSeconds) * balance.offlineEfficiency);
  const ticksApplied = Math.min(raw, balance.offlineMaxTicks);
  if (ticksApplied === 0) {
    return { state, ticksApplied: 0 };
  }
  return { state: tickMany(state, ticksApplied).state, ticksApplied };
}

import type { GameState } from './state';
import { createInitialState } from './state';
import { applyCommand } from './commands';

/**
 * Создаёт новую игру: карта по seed + ратуша 4×4 в центре.
 * Не импортирует ничего из render/, ui/, app/ — правило CLAUDE.md.
 */
export function createNewGame(seed: number, mapSize = { width: 32, height: 32 }): GameState {
  const base = createInitialState(seed, mapSize);
  const cx = Math.floor(mapSize.width / 2) - 2;
  const cy = Math.floor(mapSize.height / 2) - 2;
  const result = applyCommand(base, { type: 'PlaceBuilding', defId: 'town_hall', x: cx, y: cy });
  return result.ok ? result.state : base;
}

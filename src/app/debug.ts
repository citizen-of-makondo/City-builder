import type { GameState } from '../sim/state';
import { createInitialState } from '../sim/state';
import { applyCommand } from '../sim/commands';
import type { BuildingDefId } from '../sim/state';

/**
 * Стресс-сцена (?stress в URL): большая карта и 1000+ зданий
 * для проверки бюджета производительности (60 FPS, тик ≤ 2 мс).
 * Только dev-инструмент: ресурсы накручиваются в обход команд.
 */
export function buildStressState(): GameState {
  let state = createInitialState(1337, { width: 80, height: 80 });
  state = {
    ...state,
    resources: { ...state.resources, gold: 10_000_000, supplies: 10_000_000 },
  };
  const defs: BuildingDefId[] = ['hut', 'gatherer', 'totem'];
  let placed = 0;
  for (let y = 0; y < state.mapSize.height && placed < 1000; y += 1) {
    for (let x = 0; x < state.mapSize.width && placed < 1000; x += 1) {
      const defId = defs[(x + y * 7) % defs.length] as BuildingDefId;
      const result = applyCommand(state, { type: 'PlaceBuilding', defId, x, y });
      if (result.ok) {
        state = result.state;
        placed++;
      }
    }
  }
  return state;
}

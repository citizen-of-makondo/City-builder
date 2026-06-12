import { create } from 'zustand';
import type { BuildingDefId, GameState } from '../sim/state';
import { createInitialState } from '../sim/state';
import type { Command } from '../sim/commands';
import { applyCommand } from '../sim/commands';
import { tick } from '../sim/tick';

interface GameStore {
  state: GameState;
  /** единственный путь изменений состояния из UI */
  dispatch(command: Command): void;
  advanceTick(): void;
  replaceState(state: GameState): void;
}

// seed берётся снаружи симуляции — здесь Date.now() допустим
export const useGameStore = create<GameStore>((set) => ({
  state: createInitialState(Date.now() % 0xffffffff),
  dispatch: (command) =>
    set((s) => {
      const result = applyCommand(s.state, command);
      return result.ok ? { state: result.state } : s;
    }),
  advanceTick: () => set((s) => ({ state: tick(s.state).state })),
  replaceState: (state) => set({ state }),
}));

interface UiStore {
  /** выбранный тип здания в режиме строительства, null — режим выключен */
  buildDefId: BuildingDefId | null;
  setBuildDefId(id: BuildingDefId | null): void;
}

export const useUiStore = create<UiStore>((set) => ({
  buildDefId: null,
  setBuildDefId: (buildDefId) => set({ buildDefId }),
}));

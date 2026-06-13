import { create } from 'zustand';
import type { BuildingDefId, GameState } from '../sim/state';
import type { Command } from '../sim/commands';
import { applyCommand } from '../sim/commands';
import { tick } from '../sim/tick';
import { createNewGame } from './newGame';

interface GameStore {
  state: GameState;
  dispatch(command: Command): void;
  advanceTick(): void;
  replaceState(state: GameState): void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: createNewGame(Date.now() % 0xffffffff),
  dispatch: (command) =>
    set((s) => {
      const result = applyCommand(s.state, command);
      return result.ok ? { state: result.state } : s;
    }),
  advanceTick: () => set((s) => ({ state: tick(s.state).state })),
  replaceState: (state) => set({ state }),
}));

export type RoadMode = 'place' | 'erase' | null;

interface UiStore {
  buildDefId: BuildingDefId | null;
  setBuildDefId(id: BuildingDefId | null): void;
  roadMode: RoadMode;
  setRoadMode(mode: RoadMode): void;
}

export const useUiStore = create<UiStore>((set) => ({
  buildDefId: null,
  setBuildDefId: (buildDefId) => set({ buildDefId, roadMode: null }),
  roadMode: null,
  setRoadMode: (roadMode) => set({ roadMode, buildDefId: null }),
}));

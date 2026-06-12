import type { BuildingDefId, BuildingId, GameState } from './state';

/**
 * Любое изменение GameState — только через команды с валидацией здесь,
 * внутри симуляции, а не в UI.
 */
export type Command =
  | { type: 'PlaceBuilding'; defId: BuildingDefId; x: number; y: number }
  | { type: 'MoveBuilding'; buildingId: BuildingId; x: number; y: number }
  | { type: 'RemoveBuilding'; buildingId: BuildingId }
  | { type: 'CollectProduction'; buildingId: BuildingId }
  | { type: 'EnactEdict'; edictId: string };

export type CommandResult = { ok: true; state: GameState } | { ok: false; error: CommandError };

export type CommandError =
  | 'not_implemented'
  | 'out_of_bounds'
  | 'tile_occupied'
  | 'unknown_building'
  | 'not_enough_resources';

export function applyCommand(_state: GameState, command: Command): CommandResult {
  switch (command.type) {
    case 'PlaceBuilding':
      // Фаза 1: валидация занятости тайлов, списание стоимости, постановка.
      return { ok: false, error: 'not_implemented' };
    case 'MoveBuilding':
      return { ok: false, error: 'not_implemented' };
    case 'RemoveBuilding':
      return { ok: false, error: 'not_implemented' };
    case 'CollectProduction':
      // Фаза 3: сбор готового производства.
      return { ok: false, error: 'not_implemented' };
    case 'EnactEdict':
      // Фаза 5: эдикты и фракции.
      return { ok: false, error: 'not_implemented' };
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

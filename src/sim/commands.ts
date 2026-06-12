import type {
  BuildingDef,
  BuildingDefId,
  BuildingId,
  GameState,
  Resources,
  TerrainType,
  Tile,
} from './state';
import { tileAt } from './state';
import { getBuildingDef } from './content/buildings';

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
  | 'unknown_def'
  | 'unknown_building'
  | 'out_of_bounds'
  | 'tile_occupied'
  | 'terrain_blocked'
  | 'not_enough_resources';

const BUILDABLE_TERRAIN: ReadonlySet<TerrainType> = new Set(['grass', 'fertile']);

/** Проверка площадки w×h: границы, рельеф, занятость (ignoreBuildingId — для перемещения). */
function validateFootprint(
  state: GameState,
  def: BuildingDef,
  x: number,
  y: number,
  ignoreBuildingId?: BuildingId,
): CommandError | null {
  if (
    x < 0 ||
    y < 0 ||
    x + def.size.w > state.mapSize.width ||
    y + def.size.h > state.mapSize.height
  ) {
    return 'out_of_bounds';
  }
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      const tile = tileAt(state, x + dx, y + dy);
      if (!tile || !BUILDABLE_TERRAIN.has(tile.terrain) || tile.road) {
        return 'terrain_blocked';
      }
      if (tile.buildingId !== null && tile.buildingId !== ignoreBuildingId) {
        return 'tile_occupied';
      }
    }
  }
  return null;
}

function chargeCost(resources: Resources, cost: BuildingDef['cost']): Resources | null {
  const gold = resources.gold - (cost.gold ?? 0);
  const supplies = resources.supplies - (cost.supplies ?? 0);
  const influence = resources.influence - (cost.influence ?? 0);
  if (gold < 0 || supplies < 0 || influence < 0) {
    return null;
  }
  return { ...resources, gold, supplies, influence };
}

/** Dry-run валидация размещения — для подсветки призрака в UI. */
export function validatePlaceBuilding(
  state: GameState,
  defId: BuildingDefId,
  x: number,
  y: number,
): CommandError | null {
  const def = getBuildingDef(defId);
  if (!def) {
    return 'unknown_def';
  }
  const footprintError = validateFootprint(state, def, x, y);
  if (footprintError) {
    return footprintError;
  }
  if (!chargeCost(state.resources, def.cost)) {
    return 'not_enough_resources';
  }
  return null;
}

/** Dry-run валидация перемещения построенного здания. */
export function validateMoveBuilding(
  state: GameState,
  buildingId: BuildingId,
  x: number,
  y: number,
): CommandError | null {
  const building = state.buildings[buildingId];
  if (!building) {
    return 'unknown_building';
  }
  const def = getBuildingDef(building.defId);
  if (!def) {
    return 'unknown_def';
  }
  return validateFootprint(state, def, x, y, buildingId);
}

function setFootprint(
  tiles: Tile[],
  mapWidth: number,
  def: BuildingDef,
  x: number,
  y: number,
  buildingId: BuildingId | null,
): Tile[] {
  const next = tiles.slice();
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      const i = (y + dy) * mapWidth + (x + dx);
      const tile = next[i];
      if (tile) {
        next[i] = { ...tile, buildingId };
      }
    }
  }
  return next;
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  switch (command.type) {
    case 'PlaceBuilding': {
      const error = validatePlaceBuilding(state, command.defId, command.x, command.y);
      if (error) {
        return { ok: false, error };
      }
      const def = getBuildingDef(command.defId) as BuildingDef;
      const resources = chargeCost(state.resources, def.cost) as Resources;
      const id: BuildingId = `b${state.nextBuildingId}`;
      return {
        ok: true,
        state: {
          ...state,
          resources,
          nextBuildingId: state.nextBuildingId + 1,
          buildings: {
            ...state.buildings,
            [id]: {
              id,
              defId: def.id,
              x: command.x,
              y: command.y,
              // связность с ратушей — фаза 2
              connected: true,
              productionStartedAtTick: null,
            },
          },
          tiles: setFootprint(state.tiles, state.mapSize.width, def, command.x, command.y, id),
        },
      };
    }
    case 'MoveBuilding': {
      const error = validateMoveBuilding(state, command.buildingId, command.x, command.y);
      if (error) {
        return { ok: false, error };
      }
      const building = state.buildings[command.buildingId];
      if (!building) {
        return { ok: false, error: 'unknown_building' };
      }
      const def = getBuildingDef(building.defId) as BuildingDef;
      let tiles = setFootprint(state.tiles, state.mapSize.width, def, building.x, building.y, null);
      tiles = setFootprint(tiles, state.mapSize.width, def, command.x, command.y, building.id);
      return {
        ok: true,
        state: {
          ...state,
          tiles,
          buildings: {
            ...state.buildings,
            [building.id]: { ...building, x: command.x, y: command.y },
          },
        },
      };
    }
    case 'RemoveBuilding': {
      const building = state.buildings[command.buildingId];
      if (!building) {
        return { ok: false, error: 'unknown_building' };
      }
      const def = getBuildingDef(building.defId);
      if (!def) {
        return { ok: false, error: 'unknown_def' };
      }
      const buildings = { ...state.buildings };
      delete buildings[building.id];
      return {
        ok: true,
        state: {
          ...state,
          buildings,
          tiles: setFootprint(state.tiles, state.mapSize.width, def, building.x, building.y, null),
        },
      };
    }
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

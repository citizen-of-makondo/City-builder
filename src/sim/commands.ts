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
import { updateConnectivity } from './systems/roads';

/**
 * Любое изменение GameState — только через команды с валидацией здесь,
 * внутри симуляции, а не в UI.
 */
export type Command =
  | { type: 'PlaceBuilding'; defId: BuildingDefId; x: number; y: number }
  | { type: 'MoveBuilding'; buildingId: BuildingId; x: number; y: number }
  | { type: 'RemoveBuilding'; buildingId: BuildingId }
  | { type: 'PlaceRoad'; x: number; y: number }
  | { type: 'RemoveRoad'; x: number; y: number }
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
  if (gold < 0 || supplies < 0 || influence < 0) return null;
  return { ...resources, gold, supplies, influence };
}

export function validatePlaceBuilding(
  state: GameState,
  defId: BuildingDefId,
  x: number,
  y: number,
): CommandError | null {
  const def = getBuildingDef(defId);
  if (!def) return 'unknown_def';
  const err = validateFootprint(state, def, x, y);
  if (err) return err;
  if (!chargeCost(state.resources, def.cost)) return 'not_enough_resources';
  return null;
}

export function validateMoveBuilding(
  state: GameState,
  buildingId: BuildingId,
  x: number,
  y: number,
): CommandError | null {
  const b = state.buildings[buildingId];
  if (!b) return 'unknown_building';
  const def = getBuildingDef(b.defId);
  if (!def) return 'unknown_def';
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
      if (tile) next[i] = { ...tile, buildingId };
    }
  }
  return next;
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  switch (command.type) {
    case 'PlaceBuilding': {
      const error = validatePlaceBuilding(state, command.defId, command.x, command.y);
      if (error) return { ok: false, error };
      const def = getBuildingDef(command.defId) as BuildingDef;
      const resources = chargeCost(state.resources, def.cost) as Resources;
      const id: BuildingId = `b${state.nextBuildingId}`;
      const next: GameState = {
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
            connected: def.id === 'town_hall',
            productionStartedAtTick: null,
          },
        },
        tiles: setFootprint(state.tiles, state.mapSize.width, def, command.x, command.y, id),
      };
      return { ok: true, state: updateConnectivity(next) };
    }

    case 'MoveBuilding': {
      const error = validateMoveBuilding(state, command.buildingId, command.x, command.y);
      if (error) return { ok: false, error };
      const b = state.buildings[command.buildingId]!;
      const def = getBuildingDef(b.defId) as BuildingDef;
      let tiles = setFootprint(state.tiles, state.mapSize.width, def, b.x, b.y, null);
      tiles = setFootprint(tiles, state.mapSize.width, def, command.x, command.y, b.id);
      const next: GameState = {
        ...state,
        tiles,
        buildings: {
          ...state.buildings,
          [b.id]: { ...b, x: command.x, y: command.y },
        },
      };
      return { ok: true, state: updateConnectivity(next) };
    }

    case 'RemoveBuilding': {
      const b = state.buildings[command.buildingId];
      if (!b) return { ok: false, error: 'unknown_building' };
      const def = getBuildingDef(b.defId);
      if (!def) return { ok: false, error: 'unknown_def' };
      const buildings = { ...state.buildings };
      delete buildings[b.id];
      const next: GameState = {
        ...state,
        buildings,
        tiles: setFootprint(state.tiles, state.mapSize.width, def, b.x, b.y, null),
      };
      return { ok: true, state: updateConnectivity(next) };
    }

    case 'PlaceRoad': {
      const tile = tileAt(state, command.x, command.y);
      if (!tile) return { ok: false, error: 'out_of_bounds' };
      if (tile.buildingId !== null) return { ok: false, error: 'tile_occupied' };
      if (!BUILDABLE_TERRAIN.has(tile.terrain)) return { ok: false, error: 'terrain_blocked' };
      if (tile.road) return { ok: true, state }; // уже дорога — no-op
      const i = command.y * state.mapSize.width + command.x;
      const tiles = state.tiles.slice();
      tiles[i] = { ...tile, road: true };
      return { ok: true, state: updateConnectivity({ ...state, tiles }) };
    }

    case 'RemoveRoad': {
      const tile = tileAt(state, command.x, command.y);
      if (!tile) return { ok: false, error: 'out_of_bounds' };
      if (!tile.road) return { ok: true, state }; // не дорога — no-op
      const i = command.y * state.mapSize.width + command.x;
      const tiles = state.tiles.slice();
      tiles[i] = { ...tile, road: false };
      return { ok: true, state: updateConnectivity({ ...state, tiles }) };
    }

    case 'CollectProduction':
      return { ok: false, error: 'not_implemented' };

    case 'EnactEdict':
      return { ok: false, error: 'not_implemented' };

    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}

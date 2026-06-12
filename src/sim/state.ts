/**
 * Типы ядра симуляции. Этот модуль (и весь src/sim/) — чистый TS:
 * никаких импортов из render/, ui/, pixi, react, tauri.
 */
import { generateTerrain } from './mapgen';
import { balance } from './content/balance';

export type BuildingId = string;
export type BuildingDefId = string;
export type EraId = string;
export type GoodId = string;

export type TerrainType = 'grass' | 'water' | 'mountain' | 'forest' | 'fertile';

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  /** id здания, занимающего тайл, или null */
  buildingId: BuildingId | null;
  road: boolean;
}

export interface Resources {
  gold: number;
  supplies: number;
  /** общее население, которое даёт жильё */
  population: number;
  /** занятые рабочие места */
  populationUsed: number;
  knowledge: number;
  influence: number;
  energy: number;
  /** товары эпох по id */
  goods: Record<GoodId, number>;
}

export type BuildingCategory =
  | 'residential'
  | 'production'
  | 'civic'
  | 'decoration'
  | 'road'
  | 'wonder';

export type ResourceCost = Partial<Pick<Resources, 'gold' | 'supplies' | 'influence'>>;

/** Описание типа здания — данные, код их только интерпретирует. */
export interface BuildingDef {
  id: BuildingDefId;
  /** ключ i18n, не строка для показа */
  nameKey: string;
  category: BuildingCategory;
  size: { w: number; h: number };
  cost: ResourceCost;
  eraId: EraId;
}

/** Конкретное построенное здание на карте. */
export interface Building {
  id: BuildingId;
  defId: BuildingDefId;
  /** опорный тайл (левый верхний в координатах сетки) */
  x: number;
  y: number;
  /** соединено ли дорогой с ратушей (фаза 2) */
  connected: boolean;
  /** тик старта текущего производственного цикла, null — цикл не идёт */
  productionStartedAtTick: number | null;
}

export interface GameState {
  /** версия схемы сейва, см. sim/save/migrations.ts */
  schemaVersion: number;
  /** seed генерации карты и RNG */
  seed: number;
  /** игровое время: 1 тик = 1 секунда */
  tick: number;
  /** состояние seeded RNG — единственный источник случайности в sim */
  rngState: number;
  mapSize: { width: number; height: number };
  tiles: Tile[];
  buildings: Record<BuildingId, Building>;
  /** счётчик для генерации id зданий */
  nextBuildingId: number;
  resources: Resources;
  eraId: EraId;
}

export const SCHEMA_VERSION = 1;

export function createEmptyResources(): Resources {
  return {
    gold: 0,
    supplies: 0,
    population: 0,
    populationUsed: 0,
    knowledge: 0,
    influence: 0,
    energy: 0,
    goods: {},
  };
}

export function createInitialState(
  seed: number,
  mapSize: { width: number; height: number } = { width: 32, height: 32 },
): GameState {
  const tiles = generateTerrain(seed, mapSize.width, mapSize.height);
  return {
    schemaVersion: SCHEMA_VERSION,
    seed,
    tick: 0,
    rngState: seed >>> 0 || 1,
    mapSize,
    tiles,
    buildings: {},
    nextBuildingId: 1,
    resources: { ...createEmptyResources(), ...balance.startingResources },
    eraId: 'stone_age',
  };
}

export function tileAt(state: GameState, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= state.mapSize.width || y >= state.mapSize.height) {
    return null;
  }
  return state.tiles[y * state.mapSize.width + x] ?? null;
}

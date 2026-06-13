import type { BuildingId, GameState } from '../state';
import { tileAt } from '../state';
import { getBuildingDef } from '../content/buildings';

/** N=1, E=2, S=4, W=8 — порядок фиксирован для 4-битного автотайлинга. */
export const ROAD_DIRS = [
  { dx: 0, dy: -1, bit: 1 },
  { dx: 1, dy: 0, bit: 2 },
  { dx: 0, dy: 1, bit: 4 },
  { dx: -1, dy: 0, bit: 8 },
] as const;

/** 4-битная маска соседей-дорог: N=1, E=2, S=4, W=8. Нужна для автотайлинга рендера. */
export function getRoadMask(state: GameState, x: number, y: number): number {
  let mask = 0;
  for (const { dx, dy, bit } of ROAD_DIRS) {
    if (tileAt(state, x + dx, y + dy)?.road) mask |= bit;
  }
  return mask;
}

/**
 * BFS от периметра ратуши по сети дорог.
 * Возвращает Set<"x,y"> всех дорог, связанных с ратушей.
 * O(tiles) — при 32×32 ≤ 1024 итераций.
 */
function computeConnectedRoads(state: GameState): Set<string> {
  const townHall = Object.values(state.buildings).find((b) => b.defId === 'town_hall');
  if (!townHall) return new Set();

  const def = getBuildingDef(townHall.defId);
  if (!def) return new Set();

  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [];

  // Собрать дорожные тайлы, примыкающие к периметру ратуши (без дублей)
  const perimeterKeys = new Set<string>();
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      for (const { dx: ddx, dy: ddy } of ROAD_DIRS) {
        const nx = townHall.x + dx + ddx;
        const ny = townHall.y + dy + ddy;
        // пропустить тайлы внутри самой ратуши
        if (
          nx >= townHall.x &&
          nx < townHall.x + def.size.w &&
          ny >= townHall.y &&
          ny < townHall.y + def.size.h
        )
          continue;
        const key = `${nx},${ny}`;
        if (!perimeterKeys.has(key)) {
          perimeterKeys.add(key);
          const tile = tileAt(state, nx, ny);
          if (tile?.road && !visited.has(key)) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  // BFS по дорогам
  let i = 0;
  while (i < queue.length) {
    const { x, y } = queue[i++]!;
    for (const { dx, dy } of ROAD_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!tileAt(state, nx, ny)?.road) continue;
      const key = `${nx},${ny}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return visited;
}

/**
 * Пересчитывает флаг connected у всех зданий (кроме ратуши — она всегда true).
 * Вызывается после любого изменения дорог или зданий; кэш не нужен — O(tiles) быстро.
 */
export function updateConnectivity(state: GameState): GameState {
  const connectedRoads = computeConnectedRoads(state);

  const updatedBuildings: typeof state.buildings = {};
  let changed = false;

  for (const b of Object.values(state.buildings)) {
    const isTownHall = b.defId === 'town_hall';
    let connected: boolean;

    if (isTownHall) {
      connected = true;
    } else {
      const def = getBuildingDef(b.defId);
      connected = false;
      if (def) {
        outer: for (let dy = 0; dy < def.size.h; dy++) {
          for (let dx = 0; dx < def.size.w; dx++) {
            for (const { dx: ddx, dy: ddy } of ROAD_DIRS) {
              if (connectedRoads.has(`${b.x + dx + ddx},${b.y + dy + ddy}`)) {
                connected = true;
                break outer;
              }
            }
          }
        }
      }
    }

    if (connected !== b.connected) {
      updatedBuildings[b.id] = { ...b, connected };
      changed = true;
    } else {
      updatedBuildings[b.id] = b;
    }
  }

  return changed ? { ...state, buildings: updatedBuildings } : state;
}

/** Для тестов: публичная обёртка BFS-результата. */
export function connectedBuildingIds(state: GameState): Set<BuildingId> {
  const result = new Set<BuildingId>();
  const roads = computeConnectedRoads(state);
  for (const b of Object.values(state.buildings)) {
    if (b.defId === 'town_hall') {
      result.add(b.id);
      continue;
    }
    const def = getBuildingDef(b.defId);
    if (!def) continue;
    outer: for (let dy = 0; dy < def.size.h; dy++) {
      for (let dx = 0; dx < def.size.w; dx++) {
        for (const { dx: ddx, dy: ddy } of ROAD_DIRS) {
          if (roads.has(`${b.x + dx + ddx},${b.y + dy + ddy}`)) {
            result.add(b.id);
            break outer;
          }
        }
      }
    }
  }
  return result;
}

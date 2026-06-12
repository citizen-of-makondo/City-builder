/** Математика изометрии: ромб-тайл 64×32 (PLAN.md 4.1). Тесты — фаза 1. */

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface GridPoint {
  col: number;
  row: number;
}

/** Координаты сетки -> экранные (центр ромба тайла). */
export function gridToScreen(col: number, row: number): ScreenPoint {
  return {
    x: ((col - row) * TILE_WIDTH) / 2,
    y: ((col + row) * TILE_HEIGHT) / 2,
  };
}

/** Экранные координаты -> тайл сетки (округление к ближайшему). */
export function screenToGrid(x: number, y: number): GridPoint {
  const col = y / TILE_HEIGHT + x / TILE_WIDTH;
  const row = y / TILE_HEIGHT - x / TILE_WIDTH;
  return { col: Math.round(col), row: Math.round(row) };
}

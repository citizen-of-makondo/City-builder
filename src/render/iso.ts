/** Математика изометрии: ромб-тайл 64×32 (PLAN.md 4.1). Без зависимостей от pixi. */

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

export interface FootprintCorners {
  top: ScreenPoint;
  right: ScreenPoint;
  bottom: ScreenPoint;
  left: ScreenPoint;
}

/**
 * Углы ромба-площадки w×h тайлов в пикселях
 * относительно центра опорного тайла (0,0).
 */
export function footprintCorners(w: number, h: number): FootprintCorners {
  return {
    top: { x: 0, y: -TILE_HEIGHT / 2 },
    right: { x: (w * TILE_WIDTH) / 2, y: ((w - 1) * TILE_HEIGHT) / 2 },
    bottom: { x: ((w - h) * TILE_WIDTH) / 2, y: ((w + h - 1) * TILE_HEIGHT) / 2 },
    left: { x: -(h * TILE_WIDTH) / 2, y: ((h - 1) * TILE_HEIGHT) / 2 },
  };
}

/**
 * Z-сортировка по дальнему углу площадки (PLAN.md 4.1):
 * здание с большей суммой (col+row) дальнего угла рисуется поверх.
 */
export function buildingZIndex(x: number, y: number, w: number, h: number): number {
  return x + w - 1 + (y + h - 1);
}

export interface PixelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Пиксельные границы карты width×height тайлов (для ограничения камеры). */
export function mapPixelBounds(width: number, height: number): PixelBounds {
  return {
    minX: -(height * TILE_WIDTH) / 2,
    maxX: (width * TILE_WIDTH) / 2,
    minY: -TILE_HEIGHT / 2,
    maxY: ((width + height - 1) * TILE_HEIGHT) / 2 + TILE_HEIGHT / 2,
  };
}

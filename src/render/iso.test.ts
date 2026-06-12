import { describe, expect, it } from 'vitest';
import { buildingZIndex, gridToScreen, screenToGrid, TILE_HEIGHT, TILE_WIDTH } from './iso';

describe('изометрия 64×32', () => {
  it('известные точки gridToScreen', () => {
    expect(gridToScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gridToScreen(1, 0)).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
    expect(gridToScreen(0, 1)).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
    expect(gridToScreen(1, 1)).toEqual({ x: 0, y: TILE_HEIGHT });
  });

  it('round-trip: grid -> screen -> grid для диапазона координат', () => {
    for (let col = -8; col <= 8; col++) {
      for (let row = -8; row <= 8; row++) {
        const p = gridToScreen(col, row);
        expect(screenToGrid(p.x, p.y)).toEqual({ col, row });
      }
    }
  });

  it('screenToGrid попадает в тот же тайл внутри ромба', () => {
    const p = gridToScreen(3, 5);
    // точки внутри ромба (смещения меньше полуразмеров)
    expect(screenToGrid(p.x + 10, p.y)).toEqual({ col: 3, row: 5 });
    expect(screenToGrid(p.x - 10, p.y)).toEqual({ col: 3, row: 5 });
    expect(screenToGrid(p.x, p.y + 6)).toEqual({ col: 3, row: 5 });
    expect(screenToGrid(p.x, p.y - 6)).toEqual({ col: 3, row: 5 });
  });
});

describe('z-сортировка мультитайловых зданий', () => {
  it('здание ближе к камере (ниже-правее) рисуется поверх', () => {
    // 3×3 в (0,0), его дальний угол (2,2); 1×1 в (3,3) перед ним
    expect(buildingZIndex(3, 3, 1, 1)).toBeGreaterThan(buildingZIndex(0, 0, 3, 3));
    // 2×2 в (1,1) перекрывает 2×2 в (0,0)
    expect(buildingZIndex(1, 1, 2, 2)).toBeGreaterThan(buildingZIndex(0, 0, 2, 2));
    // 1×1 строго за большим зданием — z меньше
    expect(buildingZIndex(0, 0, 1, 1)).toBeLessThan(buildingZIndex(0, 1, 3, 3));
  });
});

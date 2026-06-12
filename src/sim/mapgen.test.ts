import { describe, expect, it } from 'vitest';
import { generateTerrain, safeZoneOrigin, SAFE_ZONE_SIZE } from './mapgen';
import type { TerrainType } from './state';

const VALID_TERRAIN: ReadonlySet<TerrainType> = new Set([
  'grass',
  'water',
  'mountain',
  'forest',
  'fertile',
]);

describe('генератор карты', () => {
  it('валидность: размер, координаты, типы рельефа', () => {
    const tiles = generateTerrain(123, 32, 32);
    expect(tiles).toHaveLength(32 * 32);
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(32);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(32);
      expect(VALID_TERRAIN.has(tile.terrain)).toBe(true);
      expect(tile.buildingId).toBeNull();
      expect(tile.road).toBe(false);
    }
  });

  it('детерминизм: одинаковый seed даёт одинаковую карту', () => {
    expect(generateTerrain(777, 32, 32)).toEqual(generateTerrain(777, 32, 32));
  });

  it('разные seed дают разные карты', () => {
    expect(generateTerrain(1, 32, 32)).not.toEqual(generateTerrain(2, 32, 32));
  });

  it.each([24, 32, 48])('стартовая зона 8×8 чистая (карта %i)', (size) => {
    const tiles = generateTerrain(99, size, size);
    const safe = safeZoneOrigin(size, size);
    for (let dy = 0; dy < SAFE_ZONE_SIZE; dy++) {
      for (let dx = 0; dx < SAFE_ZONE_SIZE; dx++) {
        const tile = tiles[(safe.y + dy) * size + (safe.x + dx)];
        expect(tile?.terrain).toBe('grass');
      }
    }
  });

  it('на карте есть река', () => {
    const tiles = generateTerrain(5, 32, 32);
    expect(tiles.some((t) => t.terrain === 'water')).toBe(true);
  });
});

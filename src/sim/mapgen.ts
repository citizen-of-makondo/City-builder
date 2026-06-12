import type { TerrainType, Tile } from './state';
import { nextInt } from './rng';

/**
 * Процедурная генерация рельефа по seed (PLAN.md 4.10):
 * река, горы, лес, плодородная земля. Детерминирована,
 * стартовая зона 8×8 в центре гарантированно чистая (трава).
 */

export const SAFE_ZONE_SIZE = 8;

export function safeZoneOrigin(width: number, height: number): { x: number; y: number } {
  return {
    x: Math.floor(width / 2) - SAFE_ZONE_SIZE / 2,
    y: Math.floor(height / 2) - SAFE_ZONE_SIZE / 2,
  };
}

export function generateTerrain(seed: number, width: number, height: number): Tile[] {
  let rngState = seed >>> 0 || 1;
  const rand = (min: number, max: number): number => {
    const r = nextInt(rngState, min, max);
    rngState = r.rngState;
    return r.value;
  };

  const terrain: TerrainType[] = new Array<TerrainType>(width * height).fill('grass');
  const safe = safeZoneOrigin(width, height);
  // запас в 1 тайл вокруг зоны, чтобы рельеф не прилипал к границе
  const inSafe = (x: number, y: number): boolean =>
    x >= safe.x - 1 &&
    x < safe.x + SAFE_ZONE_SIZE + 1 &&
    y >= safe.y - 1 &&
    y < safe.y + SAFE_ZONE_SIZE + 1;
  const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
  const set = (x: number, y: number, type: TerrainType): void => {
    if (inBounds(x, y) && !inSafe(x, y) && terrain[y * width + x] === 'grass') {
      terrain[y * width + x] = type;
    }
  };

  // Река: вертикальная с меандром, слева или справа от стартовой зоны
  const leftMax = safe.x - 4;
  const rightMin = safe.x + SAFE_ZONE_SIZE + 3;
  const side = rand(0, 1);
  const lo = side === 0 ? 2 : Math.min(rightMin, width - 4);
  const hi = side === 0 ? Math.max(lo, leftMax) : width - 4;
  let col = rand(lo, Math.max(lo, hi));
  for (let y = 0; y < height; y++) {
    set(col, y, 'water');
    set(col + 1, y, 'water');
    col = Math.min(hi, Math.max(lo, col + rand(0, 2) - 1));
  }

  // Кляксы рельефа случайным блужданием
  const blob = (type: TerrainType, steps: number): void => {
    let x = rand(0, width - 1);
    let y = rand(0, height - 1);
    for (let i = 0; i < steps; i++) {
      set(x, y, type);
      const dir = rand(0, 3);
      x = Math.min(width - 1, Math.max(0, x + (dir === 0 ? 1 : dir === 1 ? -1 : 0)));
      y = Math.min(height - 1, Math.max(0, y + (dir === 2 ? 1 : dir === 3 ? -1 : 0)));
    }
  };

  const area = width * height;
  const mountainBlobs = Math.max(2, Math.round(area / 256));
  const forestBlobs = Math.max(3, Math.round(area / 170));
  const fertileBlobs = Math.max(2, Math.round(area / 256));
  for (let i = 0; i < mountainBlobs; i++) blob('mountain', rand(6, 12));
  for (let i = 0; i < forestBlobs; i++) blob('forest', rand(8, 16));
  for (let i = 0; i < fertileBlobs; i++) blob('fertile', rand(6, 12));

  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        x,
        y,
        terrain: terrain[y * width + x] ?? 'grass',
        buildingId: null,
        road: false,
      });
    }
  }
  return tiles;
}

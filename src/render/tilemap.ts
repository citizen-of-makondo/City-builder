import { Container, Graphics } from 'pixi.js';
import type { GameState, TerrainType, Tile } from '../sim/state';
import { tileAt } from '../sim/state';
import { gridToScreen, TILE_HEIGHT, TILE_WIDTH } from './iso';

/**
 * Рендер земли чанками с автотайлингом краёв рельефа.
 * Рельеф в фазе 1 статичен — строится один раз.
 * Тип рельефа кодируется цветом И символом (доступность).
 */

const CHUNK = 16;

const TERRAIN_FILL: Record<TerrainType, number> = {
  grass: 0x4a7c3f,
  water: 0x3a6ea5,
  mountain: 0x8a8a82,
  forest: 0x39632f,
  fertile: 0x83a83f,
};

const EDGE_COLOR = 0x10180f;

export function buildTilemap(layer: Container, state: GameState): void {
  layer.removeChildren();
  const { width, height } = state.mapSize;
  for (let cy = 0; cy < height; cy += CHUNK) {
    for (let cx = 0; cx < width; cx += CHUNK) {
      const g = new Graphics();
      for (let y = cy; y < Math.min(cy + CHUNK, height); y++) {
        for (let x = cx; x < Math.min(cx + CHUNK, width); x++) {
          const tile = tileAt(state, x, y);
          if (tile) {
            drawTile(g, state, tile);
          }
        }
      }
      layer.addChild(g);
    }
  }
}

function drawTile(g: Graphics, state: GameState, tile: Tile): void {
  const c = gridToScreen(tile.x, tile.y);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const top = { x: c.x, y: c.y - hh };
  const right = { x: c.x + hw, y: c.y };
  const bottom = { x: c.x, y: c.y + hh };
  const left = { x: c.x - hw, y: c.y };

  g.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]).fill(
    TERRAIN_FILL[tile.terrain],
  );

  // Автотайлинг краёв: тёмная грань на границе разных типов рельефа.
  const edges: Array<[number, number, { x: number; y: number }, { x: number; y: number }]> = [
    [1, 0, right, bottom],
    [0, 1, bottom, left],
    [-1, 0, left, top],
    [0, -1, top, right],
  ];
  for (const [dx, dy, a, b] of edges) {
    const neighbor = tileAt(state, tile.x + dx, tile.y + dy);
    if (neighbor && neighbor.terrain !== tile.terrain) {
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: EDGE_COLOR, alpha: 0.35 });
    }
  }

  drawDecoration(g, tile, c);
}

/** Символ-маркер рельефа в дополнение к цвету. Детерминирован координатами. */
function drawDecoration(g: Graphics, tile: Tile, c: { x: number; y: number }): void {
  const hash = (tile.x * 31 + tile.y * 17) % 7;
  switch (tile.terrain) {
    case 'forest': {
      const ox = hash - 3;
      g.poly([c.x + ox, c.y - 9, c.x + ox - 5, c.y + 2, c.x + ox + 5, c.y + 2]).fill(0x1d3a20);
      g.rect(c.x + ox - 1, c.y + 2, 2, 3).fill(0x4a3623);
      g.poly([c.x + ox + 9, c.y - 4, c.x + ox + 5, c.y + 5, c.x + ox + 13, c.y + 5]).fill(0x254727);
      break;
    }
    case 'mountain':
      g.poly([c.x, c.y - 11, c.x - 11, c.y + 6, c.x + 11, c.y + 6]).fill(0x6f6f68);
      g.poly([c.x, c.y - 11, c.x - 4, c.y - 5, c.x + 4, c.y - 5]).fill({
        color: 0xffffff,
        alpha: 0.7,
      });
      break;
    case 'water':
      g.moveTo(c.x - 12, c.y - 3)
        .lineTo(c.x - 2, c.y - 3)
        .moveTo(c.x + 2, c.y + 4)
        .lineTo(c.x + 12, c.y + 4)
        .stroke({ width: 1.5, color: 0x7db4e0, alpha: 0.8 });
      break;
    case 'fertile':
      g.circle(c.x - 7, c.y, 1.6).fill(0x55702c);
      g.circle(c.x + 2, c.y - 4, 1.6).fill(0x55702c);
      g.circle(c.x + 7, c.y + 4, 1.6).fill(0x55702c);
      break;
    case 'grass':
      if (hash === 0) {
        g.circle(c.x + (tile.y % 5) * 3 - 6, c.y + (tile.x % 3) * 2 - 2, 1.2).fill({
          color: 0x6f9c5a,
          alpha: 0.8,
        });
      }
      break;
  }
}

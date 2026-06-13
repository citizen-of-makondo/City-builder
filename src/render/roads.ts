import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { GameState } from '../sim/state';
import { getRoadMask } from '../sim/systems/roads';
import { gridToScreen, TILE_HEIGHT, TILE_WIDTH } from './iso';

/**
 * Рендер дорожного слоя: 16 текстур по 4-битной маске соседей (N/E/S/W).
 * Текстуры генерируются процедурно один раз; rebuild только при изменении дорог.
 */

const ROAD_BASE = 0x7a6b5c;
const ROAD_PATH = 0xa89a8a;
const ROAD_EDGE = 0x4a3d30;
const PATH_HW = 5; // полуширина полосы в px

// Середины граней изометрического ромба в локальных координатах тайла.
// N-грань: между top(0,-hh) и right(hw,0), E-грань: между right и bottom,
// S-грань: между bottom и left, W-грань: между left и top.
const EDGE_MID = [
  { bit: 1, mx: TILE_WIDTH / 4, my: -TILE_HEIGHT / 4 }, // N
  { bit: 2, mx: TILE_WIDTH / 4, my: TILE_HEIGHT / 4 }, // E
  { bit: 4, mx: -TILE_WIDTH / 4, my: TILE_HEIGHT / 4 }, // S
  { bit: 8, mx: -TILE_WIDTH / 4, my: -TILE_HEIGHT / 4 }, // W
] as const;

function buildRoadGraphics(mask: number): Graphics {
  const g = new Graphics();
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  // Базовый ромб дороги
  g.poly([0, -hh, hw, 0, 0, hh, -hw, 0]).fill(ROAD_BASE).stroke({ width: 1, color: ROAD_EDGE });

  const connected = EDGE_MID.filter((e) => mask & e.bit);

  if (connected.length === 0) {
    // Изолированная дорога — точка в центре
    g.circle(0, 0, PATH_HW + 1).fill(ROAD_PATH);
    return g;
  }

  // Полоса от центра к середине каждой подключённой грани
  for (const { mx, my } of connected) {
    const len = Math.sqrt(mx * mx + my * my);
    const ux = mx / len;
    const uy = my / len;
    // перпендикуляр для ширины полосы
    const px = -uy * PATH_HW;
    const py = ux * PATH_HW;
    g.poly([px, py, -px, -py, mx - px, my - py, mx + px, my + py]).fill(ROAD_PATH);
  }

  // Центральная точка поверх полос
  g.circle(0, 0, PATH_HW + 1).fill(ROAD_PATH);

  return g;
}

interface TileTexture {
  tex: Texture;
  ox: number;
  oy: number;
}

export class RoadRenderer {
  private readonly tileTextures: TileTexture[] = [];
  private readonly sprites = new Map<string, Sprite>();
  private prevRoadHash = '';

  constructor(
    renderer: Renderer,
    private readonly layer: Container,
  ) {
    for (let mask = 0; mask < 16; mask++) {
      const g = buildRoadGraphics(mask);
      const b = g.getLocalBounds();
      const pad = 2;
      const tex = renderer.generateTexture({
        target: g,
        frame: new Rectangle(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2),
        resolution: 2,
      });
      g.destroy();
      this.tileTextures.push({ tex, ox: b.x - pad, oy: b.y - pad });
    }
  }

  sync(state: GameState): void {
    // Хэш дорог: строка из всех дорожных тайлов с их масками.
    // При изменении хоть одной дороги — перестроить слой.
    let hash = '';
    for (const tile of state.tiles) {
      if (tile.road) hash += `${tile.x},${tile.y},${getRoadMask(state, tile.x, tile.y)};`;
    }
    if (hash === this.prevRoadHash) return;
    this.prevRoadHash = hash;

    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    this.layer.removeChildren();

    for (const tile of state.tiles) {
      if (!tile.road) continue;
      const mask = getRoadMask(state, tile.x, tile.y);
      const { tex, ox, oy } = this.tileTextures[mask]!;
      const sprite = new Sprite(tex);
      const p = gridToScreen(tile.x, tile.y);
      sprite.position.set(p.x + ox, p.y + oy);
      this.layer.addChild(sprite);
      this.sprites.set(`${tile.x},${tile.y}`, sprite);
    }
  }

  destroy(): void {
    for (const { tex } of this.tileTextures) tex.destroy(true);
    this.tileTextures.length = 0;
  }
}

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type {
  BuildingCategory,
  BuildingDef,
  BuildingDefId,
  BuildingId,
  GameState,
} from '../sim/state';
import { getBuildingDef } from '../sim/content/buildings';
import { buildingZIndex, footprintCorners, gridToScreen } from './iso';

/**
 * Временные процедурные спрайты-боксы (фаза 1).
 * Текстура генерируется по defId один раз — в фазе 7 тут будет атлас
 * с тем же контрактом «текстура по building.defId».
 */

const CATEGORY_COLORS: Record<BuildingCategory, number> = {
  residential: 0xb5854f,
  production: 0x9c6b46,
  civic: 0xb04f4f,
  decoration: 0x5e9e64,
  road: 0x777777,
  wonder: 0x8d62b8,
};

function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

/** Изометрический бокс w×h с крышей, относительно центра опорного тайла. */
export function drawBuildingBox(g: Graphics, def: BuildingDef): void {
  const { w, h } = def.size;
  const { top, right, bottom, left } = footprintCorners(w, h);
  const z = 14 + Math.min(w, h) * 10;
  const base = CATEGORY_COLORS[def.category];

  // левая стена
  g.poly([left.x, left.y, bottom.x, bottom.y, bottom.x, bottom.y - z, left.x, left.y - z]).fill(
    shade(base, 0.72),
  );
  // правая стена
  g.poly([bottom.x, bottom.y, right.x, right.y, right.x, right.y - z, bottom.x, bottom.y - z]).fill(
    shade(base, 0.55),
  );
  // крыша
  g.poly([top.x, top.y - z, right.x, right.y - z, bottom.x, bottom.y - z, left.x, left.y - z])
    .fill(shade(base, 1.12))
    .stroke({ width: 1.5, color: shade(base, 0.45) });
  // контур основания
  g.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]).stroke({
    width: 1,
    color: shade(base, 0.4),
    alpha: 0.6,
  });
}

/** Призрак-площадка для размещения/перемещения: зелёный — можно, красный — нельзя. */
export function drawFootprint(g: Graphics, w: number, h: number, valid: boolean): void {
  const { top, right, bottom, left } = footprintCorners(w, h);
  const color = valid ? 0x47d764 : 0xe0473f;
  g.clear();
  g.poly([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y])
    .fill({ color, alpha: 0.3 })
    .stroke({ width: 2, color, alpha: 0.9 });
}

interface DefTexture {
  texture: Texture;
  ox: number;
  oy: number;
}

export class BuildingRenderer {
  private readonly sprites = new Map<BuildingId, Sprite>();
  private readonly textures = new Map<BuildingDefId, DefTexture>();

  constructor(
    private readonly renderer: Renderer,
    private readonly layer: Container,
  ) {
    layer.sortableChildren = true;
  }

  destroy(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    for (const { texture } of this.textures.values()) {
      texture.destroy(true);
    }
    this.textures.clear();
  }

  private getTexture(def: BuildingDef): DefTexture {
    const cached = this.textures.get(def.id);
    if (cached) {
      return cached;
    }
    const g = new Graphics();
    drawBuildingBox(g, def);
    const b = g.getLocalBounds();
    const pad = 2;
    const texture = this.renderer.generateTexture({
      target: g,
      frame: new Rectangle(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2),
      resolution: 2,
    });
    g.destroy();
    const entry: DefTexture = { texture, ox: b.x - pad, oy: b.y - pad };
    this.textures.set(def.id, entry);
    return entry;
  }

  /** Синхронизация спрайтов со снапшотом состояния: добавить/убрать/подвинуть. */
  sync(state: GameState): void {
    for (const [id, sprite] of this.sprites) {
      if (!state.buildings[id]) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
    for (const building of Object.values(state.buildings)) {
      const def = getBuildingDef(building.defId);
      if (!def) {
        continue;
      }
      let sprite = this.sprites.get(building.id);
      if (!sprite) {
        sprite = new Sprite(this.getTexture(def).texture);
        this.layer.addChild(sprite);
        this.sprites.set(building.id, sprite);
      }
      const origin = gridToScreen(building.x, building.y);
      const { ox, oy } = this.getTexture(def);
      sprite.position.set(origin.x + ox, origin.y + oy);
      sprite.zIndex = buildingZIndex(building.x, building.y, def.size.w, def.size.h);
    }
  }
}

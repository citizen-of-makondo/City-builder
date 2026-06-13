import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { BuildingId, GameState } from '../sim/state';
import { getBuildingDef } from '../sim/content/buildings';
import { gridToScreen, TILE_HEIGHT } from './iso';

/**
 * Оверлей: иконки разрыва связности над несоединёнными зданиями.
 * Информация не кодируется только цветом: иконка = форма + цвет.
 */

function buildDisconnectedTexture(renderer: Renderer): Texture {
  const g = new Graphics();
  // Красный шестиугольный значок
  g.circle(0, 0, 8).fill(0xd64040).stroke({ width: 1.5, color: 0x9a1010 });
  // Символ «разрыв цепи» — две засечки
  g.rect(-3, -4, 2, 5).fill(0xfff8e8);
  g.rect(1, -1, 2, 5).fill(0xfff8e8);
  // Нижняя точка («!»)
  g.circle(0, 4.5, 1.5).fill(0xfff8e8);
  const tex = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return tex;
}

export class OverlayRenderer {
  private readonly disconnectedTex: Texture;
  private readonly sprites = new Map<BuildingId, Sprite>();

  constructor(
    renderer: Renderer,
    private readonly layer: Container,
  ) {
    this.disconnectedTex = buildDisconnectedTexture(renderer);
  }

  sync(state: GameState): void {
    // Удалить иконки для зданий, ставших связными или удалённых
    for (const [id, sprite] of this.sprites) {
      const b = state.buildings[id];
      if (!b || b.connected) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    // Добавить/обновить иконки для несвязных зданий
    for (const b of Object.values(state.buildings)) {
      if (b.connected || b.defId === 'town_hall') continue;
      const def = getBuildingDef(b.defId);
      if (!def) continue;

      let sprite = this.sprites.get(b.id);
      if (!sprite) {
        sprite = new Sprite(this.disconnectedTex);
        sprite.anchor.set(0.5, 1);
        this.layer.addChild(sprite);
        this.sprites.set(b.id, sprite);
      }

      // Позиция: над центром кровли здания
      const centerCol = b.x + (def.size.w - 1) / 2;
      const p = gridToScreen(centerCol, b.y);
      const buildingVisualHeight = 14 + Math.min(def.size.w, def.size.h) * 10;
      sprite.position.set(p.x, p.y - buildingVisualHeight - TILE_HEIGHT / 4);
    }
  }

  destroy(): void {
    this.disconnectedTex.destroy(true);
    this.sprites.clear();
  }
}

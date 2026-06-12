import { Application, Container, Graphics } from 'pixi.js';

export interface SceneLayers {
  /** земля и рельеф */
  ground: Container;
  /** дороги */
  roads: Container;
  /** здания (z-сортировка по тайлам) */
  buildings: Container;
  /** эффекты, подсветка размещения */
  overlay: Container;
}

export interface Scene {
  app: Application;
  layers: SceneLayers;
  destroy(): void;
}

/** Инициализация Pixi-сцены на весь контейнер, со слоями по PLAN.md 3. */
export async function createScene(host: HTMLElement): Promise<Scene> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0x1b2d20,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  host.appendChild(app.canvas);

  const layers: SceneLayers = {
    ground: new Container(),
    roads: new Container(),
    buildings: new Container(),
    overlay: new Container(),
  };
  app.stage.addChild(layers.ground, layers.roads, layers.buildings, layers.overlay);

  // Маркер-заглушка в центре, чтобы было видно, что сцена живая (уберётся в фазе 1).
  const marker = new Graphics().rect(-32, -16, 64, 32).fill(0x3f6e4a);
  marker.position.set(app.screen.width / 2, app.screen.height / 2);
  layers.ground.addChild(marker);

  return {
    app,
    layers,
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}

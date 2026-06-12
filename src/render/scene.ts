import { Application, Container } from 'pixi.js';

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
  /** мировой контейнер: его двигает/масштабирует камера */
  world: Container;
  layers: SceneLayers;
  destroy(): void;
}

/** Инициализация Pixi-сцены на весь контейнер, со слоями по PLAN.md 3. */
export async function createScene(host: HTMLElement): Promise<Scene> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0x10180f,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  host.appendChild(app.canvas);

  const world = new Container();
  const layers: SceneLayers = {
    ground: new Container(),
    roads: new Container(),
    buildings: new Container(),
    overlay: new Container(),
  };
  world.addChild(layers.ground, layers.roads, layers.buildings, layers.overlay);
  app.stage.addChild(world);

  return {
    app,
    world,
    layers,
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
